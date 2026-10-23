import type { Stint } from "@/types/state.type";
import { stintLaps } from "@/lib/tyreStrategy";

export type StintSegment = { compound: string; startLap: number; endLap: number };

/** Each stint as a lap range, oldest first: laps 1–12, 13–30, … */
export const stintSegments = (stints: Stint[]): StintSegment[] => {
	const out: StintSegment[] = [];
	let lap = 0;
	for (const stint of stints) {
		const laps = stintLaps(stint);
		if (laps <= 0) continue;
		out.push({ compound: (stint.Compound ?? "UNKNOWN").toUpperCase(), startLap: lap, endLap: lap + laps });
		lap += laps;
	}
	return out;
};

/** Pit stops so far: every stint after the first one that has started. */
export const pitStops = (stints: Stint[]): number => Math.max(0, stints.length - 1);

/**
 * Lap axis of the strategy chart. "so-far" ends at the furthest lap anyone has done (at least
 * one); "full" ends at the scheduled race distance when the feed has one.
 */
export const strategyAxis = (mode: "so-far" | "full", scheduledLaps: number, runs: Stint[][]): number => {
	const done = Math.max(1, ...runs.map((stints) => stints.reduce((laps, s) => laps + stintLaps(s), 0)));
	return mode === "full" && scheduledLaps > 0 ? Math.max(scheduledLaps, done) : done;
};

export type TrapReading = { nr: string; kmh: number };

/** The fastest `count` readings of one speed trap, fastest first. */
export const topSpeeds = (readings: { nr: string; value: string | undefined }[], count = 5): TrapReading[] =>
	readings
		.map((r) => ({ nr: r.nr, kmh: parseInt(r.value ?? "") }))
		.filter((r) => Number.isFinite(r.kmh) && r.kmh > 0)
		.sort((a, b) => b.kmh - a.kmh)
		.slice(0, count);

/** km/h to the viewer's unit, rounded down like the old speed trap page. */
export const displaySpeed = (kmh: number, unit: "metric" | "imperial") =>
	unit === "metric" ? kmh : Math.floor(kmh / 1.609344);
