import { parseTimeMs } from "@/lib/timeUtils";
import type { TimingStats } from "@/types/state.type";

type SectorLike = { Value?: string; OverallFastest?: boolean };

export type PushLapDeltas = {
	/** Sectors completed on the current lap (0–3). */
	completed: number;
	/** Σ (sector − the driver's own best sector), ms; null with nothing to compare. */
	ownMs: number | null;
	/** Σ (sector − the reference driver's best sector), ms; null with nothing to compare. */
	refMs: number | null;
	/** A completed sector this lap is the session best. */
	sessionBest: boolean;
};

const ms = (value: string | undefined) => {
	const t = parseTimeMs(value ?? "");
	return Number.isFinite(t) ? t : null;
};

/**
 * Push-lap deltas (SPEC §6.3): sums over the completed sectors of the current lap only, so
 * this is a running comparison, never a lap prediction.
 */
export const pushLapDeltas = (
	sectors: SectorLike[],
	ownBest: (string | undefined)[],
	refBest: (string | undefined)[],
): PushLapDeltas => {
	let completed = 0;
	// null: nothing compared yet; undefined: a completed sector had no best to compare.
	let own: number | null | undefined = null;
	let ref: number | null | undefined = null;
	let sessionBest = false;

	for (let i = 0; i < 3; i++) {
		const t = ms(sectors[i]?.Value);
		if (t == null) continue;
		completed++;
		if (sectors[i]?.OverallFastest) sessionBest = true;

		// A sum only means something when every completed sector has its comparison.
		const o = ms(ownBest[i]);
		own = o == null || own === undefined ? undefined : (own ?? 0) + (t - o);
		const r = ms(refBest[i]);
		ref = r == null || ref === undefined ? undefined : (ref ?? 0) + (t - r);
	}

	return { completed, ownMs: own ?? null, refMs: ref ?? null, sessionBest };
};

export type BestSectors = Record<string, (string | undefined)[]>;

/**
 * Each driver's best sectors as they were before the latest improvement, from one
 * TimingStats to the next. F1 puts a new personal-best sector into BestSectors at once,
 * so the lap that set it would otherwise be compared with itself and read +0.000.
 */
export const previousBestSectors = (
	before: TimingStats | undefined,
	after: TimingStats | undefined,
	previous: BestSectors,
): BestSectors => {
	if (!before || !after) return previous;
	let next = previous;
	for (const [nr, line] of Object.entries(after.Lines ?? {})) {
		const old = before.Lines?.[nr]?.BestSectors;
		const now = line?.BestSectors;
		if (!old || !now) continue;
		for (let i = 0; i < 3; i++) {
			const was = old[i]?.Value;
			if (!was || was === now[i]?.Value) continue;
			if (next === previous) next = { ...previous };
			const row = [...(next[nr] ?? [])];
			row[i] = was;
			next[nr] = row;
		}
	}
	return next;
};

/** The best each current sector is measured against: the one before it, when it is the new best. */
export const bestsBeforeLap = (
	sectors: SectorLike[],
	best: (string | undefined)[],
	previous: (string | undefined)[] | undefined,
): (string | undefined)[] =>
	[0, 1, 2].map((i) => (sectors[i]?.Value && sectors[i]?.Value === best[i] && previous?.[i]) || best[i]);

/** "−0.103" / "+0.052" in seconds. */
export const formatDelta = (deltaMs: number) => `${deltaMs < 0 ? "−" : "+"}${(Math.abs(deltaMs) / 1000).toFixed(3)}`;
