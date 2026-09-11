import type { Stint } from "@/types/state.type";

// TotalLaps is tyre age, including laps completed before this run.
export function stintLaps(stint: Stint): number {
	return Math.max(0, (stint.TotalLaps ?? 0) - (stint.StartLaps ?? 0));
}

export function tyreLapScale(scheduledLaps: number, runs: Stint[][]): number {
	if (scheduledLaps > 0) return scheduledLaps;
	return Math.max(1, ...runs.map((stints) => stints.reduce((laps, stint) => laps + stintLaps(stint), 0)));
}
