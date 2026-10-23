"use client";

import clsx from "clsx";

import { useDevMode } from "@/hooks/useDevMode";
import { REPLAY_SPEEDS, useReplayStore, type ReplaySpeed } from "@/stores/useReplayStore";

// Keep in sync with dashboard/dev-sessions/manifest.json.
// `available: false` = shown but disabled (no recording yet).
const SESSIONS: { id: string; label: string; available: boolean }[] = [
	{ id: "practice", label: "Practice", available: true },
	{ id: "qualifying", label: "Qualifying", available: true },
	{ id: "race", label: "Race", available: true },
];

const fmtClock = (ms: number) => {
	if (!Number.isFinite(ms) || ms < 0) return "--:--";
	const total = Math.floor(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const mm = String(m).padStart(2, "0");
	const ss = String(s).padStart(2, "0");
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const speedLabel = (s: ReplaySpeed) => (s === "max" ? "max" : `${s}×`);

export default function ReplayOverlay() {
	const { active, disable } = useDevMode();

	const mode = useReplayStore((s) => s.mode);
	const sessionId = useReplayStore((s) => s.sessionId);
	const speed = useReplayStore((s) => s.speed);
	const playing = useReplayStore((s) => s.playing);
	const elapsedMs = useReplayStore((s) => s.elapsedMs);
	const durationMs = useReplayStore((s) => s.durationMs);
	const connected = useReplayStore((s) => s.connected);

	const setMode = useReplayStore((s) => s.setMode);
	const setSession = useReplayStore((s) => s.setSession);
	const setSpeed = useReplayStore((s) => s.setSpeed);
	const play = useReplayStore((s) => s.play);
	const pause = useReplayStore((s) => s.pause);
	const restart = useReplayStore((s) => s.restart);

	// on by default in dev builds; `disable()` / ?dev=0 hides it, ?dev=1 shows it
	if (!active) return null;

	const isReplay = mode === "replay";
	const canControl = isReplay && !!sessionId;

	return (
		<div className="fixed right-3 bottom-3 z-50 w-64 border border-zinc-700 bg-black/95 font-mono text-[11px] text-zinc-300 shadow-lg backdrop-blur">
			<div className="flex items-center justify-between border-b border-zinc-800 px-2 py-1">
				<span className="font-bold tracking-widest text-amber-400 uppercase">Dev Replay</span>
				<button
					onClick={disable}
					className="tracking-widest text-zinc-600 uppercase transition-colors hover:text-zinc-300"
				>
					hide
				</button>
			</div>

			<div className="flex flex-col gap-2 p-2">
				<button
					onClick={() => setMode(isReplay ? "live" : "replay")}
					className="flex items-center justify-between border border-zinc-700 px-2 py-1 tracking-widest uppercase transition-colors hover:border-zinc-500"
				>
					<span className={isReplay ? "text-amber-400" : "text-emerald-500"}>{isReplay ? "replay" : "live"}</span>
					<span className="text-zinc-600">{isReplay ? "[ ● ]" : "[ ○ ]"}</span>
				</button>

				<div className={clsx("grid grid-cols-3 gap-1", !isReplay && "opacity-50")}>
					{SESSIONS.map((s) => (
						<button
							key={s.id}
							disabled={!s.available}
							title={s.available ? undefined : "no recording yet"}
							onClick={() => {
								if (mode !== "replay") setMode("replay");
								setSession(s.id);
							}}
							className={clsx(
								"border px-1 py-1 text-[10px] tracking-wider uppercase transition-colors",
								!s.available && "cursor-not-allowed border-zinc-800 text-zinc-700",
								s.available && sessionId === s.id && "border-zinc-300 bg-zinc-200 text-black",
								s.available &&
									sessionId !== s.id &&
									"border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300",
							)}
						>
							{s.label}
						</button>
					))}
				</div>

				<div className={clsx("flex items-center gap-2", !isReplay && "opacity-40")}>
					<button
						onClick={() => (playing ? pause() : play())}
						disabled={!canControl}
						className="flex h-7 w-7 items-center justify-center border border-zinc-700 text-zinc-200 transition-colors hover:border-zinc-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-700"
						aria-label={playing ? "pause" : "play"}
					>
						{playing ? "❚❚" : "▶"}
					</button>
					<button
						onClick={restart}
						disabled={!canControl}
						className="flex h-7 w-7 items-center justify-center border border-zinc-700 text-zinc-200 transition-colors hover:border-zinc-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-700"
						aria-label="restart"
					>
						⟲
					</button>
					<span className="ml-auto text-zinc-400 tabular-nums">
						{fmtClock(elapsedMs)}
						<span className="text-zinc-700"> / </span>
						{durationMs != null ? fmtClock(durationMs) : "--:--"}
					</span>
				</div>

				<div className={clsx("flex border border-zinc-700", !isReplay && "opacity-40")}>
					{REPLAY_SPEEDS.map((s) => (
						<button
							key={String(s)}
							onClick={() => setSpeed(s)}
							className={clsx(
								"flex-1 px-1 py-1 tabular-nums transition-colors",
								speed === s ? "bg-zinc-200 text-black" : "text-zinc-500 hover:text-zinc-300",
							)}
						>
							{speedLabel(s)}
						</button>
					))}
				</div>

				<div className="flex items-center justify-between text-[10px] tracking-wider text-zinc-600 uppercase">
					<span className="truncate">
						{isReplay ? (sessionId ? `session: ${sessionId}` : "pick a session") : "using live backend"}
					</span>
					{isReplay && (
						<span className={clsx("shrink-0 pl-2", connected ? "text-emerald-500" : "text-red-500")}>
							{connected ? "● live" : "○ idle"}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
