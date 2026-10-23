import type { LapTimeEntry } from "@/stores/useHistoryStore";
import { classifyLap, type StintBoundary } from "@/lib/stints";

export type LongRun = {
	/** Valid laps in the stint. */
	laps: number;
	/** Average of the valid laps, ms. */
	avgMs: number;
	/** Least-squares slope over the valid laps, ms per lap (positive = slowing down). */
	degMsPerLap: number | null;
};

const MIN_CONSECUTIVE = 5;
const CUTOFF = 1.07;

/**
 * Valid laps of a stint (SPEC §13.2): not the out lap, not an in lap, and within 107% of the
 * driver's best lap this session. classifyLap alone counts cool-down laps as push laps,
 * which is what the 107% filter is for.
 */
export const validStintLaps = (
	entries: LapTimeEntry[],
	stint: StintBoundary,
	boundaries: StintBoundary[],
	bestMs: number,
): LapTimeEntry[] =>
	entries
		.filter(
			(e) =>
				e.lap >= stint.startLap &&
				e.lap <= stint.endLap &&
				classifyLap(e.lap, boundaries) === "push" &&
				Number.isFinite(e.ms) &&
				e.ms <= bestMs * CUTOFF,
		)
		.sort((a, b) => a.lap - b.lap);

const longestConsecutive = (laps: LapTimeEntry[]): number => {
	let best = 0;
	let run = 0;
	for (let i = 0; i < laps.length; i++) {
		run = i > 0 && laps[i].lap === laps[i - 1].lap + 1 ? run + 1 : 1;
		best = Math.max(best, run);
	}
	return best;
};

/** Least-squares slope of lap time against lap number, ms per lap. */
export const slopeMsPerLap = (laps: LapTimeEntry[]): number | null => {
	if (laps.length < 2) return null;
	const n = laps.length;
	const mx = laps.reduce((s, l) => s + l.lap, 0) / n;
	const my = laps.reduce((s, l) => s + l.ms, 0) / n;
	let num = 0;
	let den = 0;
	for (const l of laps) {
		num += (l.lap - mx) * (l.ms - my);
		den += (l.lap - mx) ** 2;
	}
	return den === 0 ? null : num / den;
};

/** The stint's long run, or null when it has fewer than 5 consecutive valid laps. */
export const longRun = (
	entries: LapTimeEntry[],
	stint: StintBoundary | undefined,
	boundaries: StintBoundary[],
	bestMs: number,
): LongRun | null => {
	if (!stint || !Number.isFinite(bestMs)) return null;
	const laps = validStintLaps(entries, stint, boundaries, bestMs);
	if (longestConsecutive(laps) < MIN_CONSECUTIVE) return null;

	return {
		laps: laps.length,
		avgMs: laps.reduce((s, l) => s + l.ms, 0) / laps.length,
		degMsPerLap: slopeMsPerLap(laps),
	};
};
