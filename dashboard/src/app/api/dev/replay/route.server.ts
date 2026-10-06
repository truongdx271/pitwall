import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

import { merge } from "@/lib/merge";
import { STATE_TOPICS, parseSignalrLine, projectMessage } from "@/lib/replayParse";

// Dev-only endpoint: streams a recorded F1 session over SSE in the exact shape
// `useSocket` / `useDataEngine` expect (`initial` + `update` events). 404s in a
// production build unless DEV_REPLAY=1 (set on staging, never on prod).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_GAP_MS = 5_000;

type SessionFormat = "signalr-raw" | "sse";

type SessionEntry = {
	id: string;
	label: string;
	file: string;
	format?: SessionFormat;
	skipMs?: number;
	patch?: Record<string, unknown>;
};

type Manifest = { sessions: SessionEntry[] };

// Not cached: this route only runs in dev and the file is tiny, so edits to
// manifest.json take effect on the next request without a restart.
async function loadManifest(): Promise<Manifest> {
	const file = path.join(process.cwd(), "dev-sessions", "manifest.json");
	return JSON.parse(await readFile(file, "utf8")) as Manifest;
}

function replayDir(): string {
	return process.env.DEV_REPLAY_DIR ?? path.resolve(process.cwd(), "..");
}

function resolveFile(entry: SessionEntry): string {
	return path.isAbsolute(entry.file) ? entry.file : path.join(replayDir(), entry.file);
}

async function lineReader(file: string) {
	return readline.createInterface({ input: createReadStream(file), crlfDelay: Infinity });
}

// Cache first/last timestamp per file so the overlay can show total duration.
const durationCache = new Map<string, { firstTs: number; lastTs: number }>();

async function getSessionMeta(file: string, format: SessionFormat): Promise<{ firstTs: number; lastTs: number }> {
	const cached = durationCache.get(file);
	if (cached) return cached;

	let firstTs = NaN;
	let lastTs = NaN;

	const rl = await lineReader(file);
	for await (const line of rl) {
		if (format === "sse") {
			try {
				const { t } = JSON.parse(line) as { t?: number };
				if (typeof t === "number") {
					if (Number.isNaN(firstTs)) firstTs = 0;
					lastTs = t;
				}
			} catch {
				/* ignore */
			}
			continue;
		}
		const parsed = parseSignalrLine(line);
		if (!parsed) continue;
		for (const msg of parsed.messages) {
			if (Number.isNaN(msg.ts)) continue;
			if (Number.isNaN(firstTs)) firstTs = msg.ts;
			lastTs = msg.ts;
		}
	}
	rl.close();

	const meta = { firstTs, lastTs };
	durationCache.set(file, meta);
	return meta;
}

function sseEvent(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: Request): Promise<Response> {
	// Prod-locked, but a trusted non-prod deploy (staging) can opt in with DEV_REPLAY=1.
	if (process.env.NODE_ENV === "production" && process.env.DEV_REPLAY !== "1") {
		return new Response("Not found", { status: 404 });
	}

	const url = new URL(request.url);
	const sessionId = url.searchParams.get("session");
	const speedParam = url.searchParams.get("speed") ?? "5";
	const tParam = url.searchParams.get("t");

	const speed = speedParam === "max" ? Infinity : Math.min(50, Math.max(0.1, Number(speedParam) || 5));

	const manifest = await loadManifest();
	const entry = manifest.sessions.find((s) => s.id === sessionId);
	if (!entry) {
		return new Response(`Unknown session '${sessionId}'`, { status: 404 });
	}

	const file = resolveFile(entry);
	const format: SessionFormat = entry.format ?? "signalr-raw";

	try {
		await stat(file);
	} catch {
		return new Response(`Recording not found: ${file}`, { status: 404 });
	}

	const patch = entry.patch ?? null;

	const encoder = new TextEncoder();
	let cancelled = false;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				if (cancelled) return;
				controller.enqueue(encoder.encode(sseEvent(event, data)));
			};

			try {
				const meta = await getSessionMeta(file, format);
				const durationMs =
					!Number.isNaN(meta.firstTs) && !Number.isNaN(meta.lastTs) ? Math.max(0, meta.lastTs - meta.firstTs) : null;
				send("meta", { sessionId: entry.id, label: entry.label, durationMs });

				// No explicit ?t= -> jump past the dead lead-in (skipMs). Explicit ?t= wins.
				const startMs =
					tParam !== null && tParam !== "" ? Math.max(0, (Number(tParam) || 0) * 1000) : (entry.skipMs ?? 0);

				if (format === "sse") {
					await streamSse(file, {
						startMs,
						speed,
						send,
						patch,
						isCancelled: () => cancelled || request.signal.aborted,
					});
				} else {
					await streamSignalr(file, {
						startMs,
						speed,
						firstTs: meta.firstTs,
						send,
						patch,
						isCancelled: () => cancelled || request.signal.aborted,
					});
				}
			} catch (err) {
				if (!cancelled) {
					console.error("[dev/replay] stream error", err);
				}
			} finally {
				if (!cancelled) {
					try {
						controller.close();
					} catch {
						/* already closed */
					}
				}
			}
		},
		cancel() {
			cancelled = true;
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		},
	});
}

type StreamCtx = {
	startMs: number;
	speed: number;
	send: (event: string, data: unknown) => void;
	isCancelled: () => boolean;
};

async function streamSignalr(
	file: string,
	ctx: StreamCtx & { firstTs: number; patch: Record<string, unknown> | null },
): Promise<void> {
	const { startMs, speed, firstTs, send, patch, isCancelled } = ctx;

	const patchInitial = (s: Record<string, unknown>) => (patch ? (merge(s, patch) as Record<string, unknown>) : s);

	let state: Record<string, unknown> = {};
	let seeking = startMs > 0;
	let initialSent = false;
	let prevTs = NaN;
	let lastClockSec = -1;
	let counter = 0;

	const rl = await lineReader(file);

	const emitInitial = () => {
		send("initial", patchInitial(state));
		initialSent = true;
	};

	for await (const line of rl) {
		if (isCancelled()) break;

		const parsed = parseSignalrLine(line);
		if (!parsed) continue;

		if (parsed.initial !== undefined) {
			state = (parsed.initial as Record<string, unknown>) ?? {};
			if (!seeking) emitInitial();
			continue;
		}

		for (const msg of parsed.messages) {
			if (isCancelled()) break;

			const projected = projectMessage(msg.topic, msg.data);
			if (!projected) continue;

			const elapsed = Number.isNaN(msg.ts) || Number.isNaN(firstTs) ? 0 : msg.ts - firstTs;

			// Fast-forward: fold state updates into `state` until we reach the start
			// offset. Telemetry blobs aren't state — skip them while seeking.
			if (seeking) {
				if (elapsed < startMs) {
					if (STATE_TOPICS.has(projected.key)) {
						state = merge(state, { [projected.key]: projected.data }) as Record<string, unknown>;
					}
					continue;
				}
				seeking = false;
				emitInitial();
			}

			if (!initialSent) emitInitial();

			// Pace to wall clock (relative to previous message) × speed.
			if (Number.isFinite(speed) && !Number.isNaN(msg.ts) && !Number.isNaN(prevTs)) {
				const gap = Math.min(MAX_GAP_MS, Math.max(0, msg.ts - prevTs));
				if (gap > 0) await sleep(gap / speed);
			} else if (!Number.isFinite(speed) && ++counter % 500 === 0) {
				await sleep(0); // yield so cancellation is observed on max speed
			}
			if (!Number.isNaN(msg.ts)) prevTs = msg.ts;

			if (isCancelled()) break;
			const payload: Record<string, unknown> = { [projected.key]: projected.data };
			if (patch && projected.key === "SessionInfo" && patch.SessionInfo) {
				payload.SessionInfo = merge(projected.data, patch.SessionInfo);
			}
			send("update", payload);

			const elapsedSec = Math.floor(elapsed / 1000);
			if (elapsedSec > lastClockSec) {
				lastClockSec = elapsedSec;
				send("clock", { elapsedMs: elapsed });
			}
		}
	}

	rl.close();

	if (!initialSent) emitInitial();
	if (!isCancelled()) send("end", {});
}

async function streamSse(file: string, ctx: StreamCtx & { patch: Record<string, unknown> | null }): Promise<void> {
	const { startMs, speed, send, patch, isCancelled } = ctx;

	let prevT = 0;
	let lastClockSec = -1;
	let counter = 0;

	// Fast-forward for `startMs > 0`: fold pre-offset updates into the initial state
	// and emit that, instead of dropping them (which would leave gaps on resume).
	let folded: Record<string, unknown> | null = null;
	let initialEmitted = false;

	const rl = await lineReader(file);

	for await (const line of rl) {
		if (isCancelled()) break;
		const trimmed = line.trim();
		if (!trimmed) continue;

		let record: { event?: string; data?: unknown; t?: number };
		try {
			record = JSON.parse(trimmed);
		} catch {
			continue;
		}
		if (!record.event) continue;

		const t = typeof record.t === "number" ? record.t : prevT;
		let data = record.data;

		if (record.event === "initial" && patch && data && typeof data === "object") {
			data = merge(data, patch);
		}

		if (record.event === "initial") {
			folded = (data as Record<string, unknown>) ?? {};
			if (startMs <= 0) {
				send("initial", folded);
				initialEmitted = true;
			}
			prevT = t;
			continue;
		}

		// still seeking: accumulate and skip
		if (!initialEmitted && t < startMs) {
			folded = merge(folded ?? {}, { [record.event]: data }) as Record<string, unknown>;
			prevT = t;
			continue;
		}
		if (!initialEmitted) {
			send("initial", folded ?? {});
			initialEmitted = true;
		}

		if (Number.isFinite(speed)) {
			const gap = Math.min(MAX_GAP_MS, Math.max(0, t - prevT));
			if (gap > 0 && record.event === "update") await sleep(gap / speed);
		} else if (!Number.isFinite(speed) && ++counter % 500 === 0) {
			await sleep(0);
		}
		prevT = t;

		if (isCancelled()) break;
		send(record.event, data);

		const elapsedSec = Math.floor(t / 1000);
		if (record.event === "update" && elapsedSec > lastClockSec) {
			lastClockSec = elapsedSec;
			send("clock", { elapsedMs: t });
		}
	}

	rl.close();
	if (!initialEmitted && !isCancelled()) send("initial", folded ?? {});
	if (!isCancelled()) send("end", {});
}
