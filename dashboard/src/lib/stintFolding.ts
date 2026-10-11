import type { Stint, TimingAppData } from "@/types/state.type";

// F1 opens a new stint with TyresNotChanged "1" when the car keeps its tyres, e.g. a
// pit lane start leaving the pits, or a stop for a penalty only. Fold it into the
// stint before so it doesn't read as a tyre change. Returns the same array if unchanged.
export function mergeUnchangedStints(stints: Stint[]): Stint[] {
	if (!stints.some((s, i) => i > 0 && s.TyresNotChanged === "1")) return stints;

	const out: Stint[] = [];
	for (const stint of stints) {
		const prev = out[out.length - 1];
		if (prev && stint.TyresNotChanged === "1") {
			out[out.length - 1] = { ...prev, TotalLaps: Math.max(prev.TotalLaps ?? 0, stint.TotalLaps ?? 0) };
		} else {
			out.push(stint);
		}
	}
	return out;
}

// Applies mergeUnchangedStints to every driver; returns the same object when nothing changes.
export function timingAppStints(data: TimingAppData): TimingAppData {
	let lines: TimingAppData["Lines"] | null = null;
	for (const [nr, line] of Object.entries(data.Lines ?? {})) {
		if (!Array.isArray(line?.Stints)) continue;
		const stints = mergeUnchangedStints(line.Stints);
		if (stints !== line.Stints) {
			lines ??= { ...data.Lines };
			lines[nr] = { ...line, Stints: stints };
		}
	}
	return lines ? { ...data, Lines: lines } : data;
}
