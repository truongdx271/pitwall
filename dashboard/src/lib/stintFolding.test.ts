import { describe, expect, it } from "vitest";

import { mergeUnchangedStints, timingAppStints } from "@/lib/stintFolding";

const soft = { Compound: "SOFT" as const, New: "true", TyresNotChanged: "0", StartLaps: 0, TotalLaps: 1 };

describe("mergeUnchangedStints", () => {
	it("folds a stint F1 marks as tyres-not-changed into the one before (pit lane start)", () => {
		const out = mergeUnchangedStints([soft, { ...soft, TyresNotChanged: "1", TotalLaps: 3 }]);
		expect(out).toEqual([{ ...soft, TotalLaps: 3 }]);
	});
	it("keeps real tyre changes", () => {
		const stints = [soft, { ...soft, Compound: "HARD" as const, TotalLaps: 0 }];
		expect(mergeUnchangedStints(stints)).toBe(stints);
	});
	it("keeps a leading unchanged stint, having nothing to fold into", () => {
		const stints = [{ ...soft, TyresNotChanged: "1" }];
		expect(mergeUnchangedStints(stints)).toBe(stints);
	});
});

describe("timingAppStints", () => {
	it("returns the same object when no driver needs folding", () => {
		const data = { Lines: { "1": { Stints: [soft] } } };
		expect(timingAppStints(data as never)).toBe(data);
	});
	it("folds only the drivers that need it", () => {
		const data = { Lines: { "1": { Stints: [soft] }, "14": { Stints: [soft, { ...soft, TyresNotChanged: "1" }] } } };
		const out = timingAppStints(data as never);
		expect(out.Lines["1"]).toBe(data.Lines["1"]);
		expect(out.Lines["14"].Stints).toEqual([soft]);
	});
});
