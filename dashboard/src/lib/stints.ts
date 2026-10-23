import type { Stint } from "@/types/state.type";
import type { LapTimeEntry } from "@/stores/useHistoryStore";

export type StintBoundary = {
	startLap: number;
	endLap: number;
	compound: string;
	isActive: boolean;
};

export type LapType = "out" | "in" | "push";

export function getStintBoundaries(stints: Stint[]): StintBoundary[] {
	let lap = 0;
	const valid = stints.filter((s) => s.TotalLaps != null && s.TotalLaps > 0);
	return valid.map((s, i) => {
		const startLap = lap + 1;
		const endLap = lap + s.TotalLaps!;
		lap = endLap;
		return { startLap, endLap, compound: s.Compound ?? "UNKNOWN", isActive: i === valid.length - 1 };
	});
}

export function classifyLap(lapNr: number, boundaries: StintBoundary[]): LapType {
	for (const b of boundaries) {
		if (lapNr >= b.startLap && lapNr <= b.endLap) {
			if (lapNr === b.startLap) return "out";
			if (lapNr === b.endLap && !b.isActive) return "in";
			return "push";
		}
	}
	return "push";
}

export function stintPushLaps(
	entries: LapTimeEntry[],
	b: StintBoundary,
	allBoundaries: StintBoundary[],
): LapTimeEntry[] {
	return entries.filter((e) => {
		if (e.lap < b.startLap || e.lap > b.endLap) return false;
		return classifyLap(e.lap, allBoundaries) === "push";
	});
}

export function stintAvgMs(entries: LapTimeEntry[], b: StintBoundary, allBoundaries: StintBoundary[]): number | null {
	const push = stintPushLaps(entries, b, allBoundaries);
	if (push.length < 2) return null;
	return push.reduce((sum, e) => sum + e.ms, 0) / push.length;
}

export function formatMs(ms: number): string {
	const totalSec = ms / 1000;
	const min = Math.floor(totalSec / 60);
	const sec = (totalSec % 60).toFixed(3).padStart(6, "0");
	return min > 0 ? `${min}:${sec}` : sec;
}
