import { describe, expect, it } from "vitest";
import type { TimingStats } from "@/types/state.type";
import { bestsBeforeLap, formatDelta, previousBestSectors, pushLapDeltas } from "./pushLap";

const s = (Value: string, OverallFastest = false) => ({ Value, OverallFastest });

describe("pushLapDeltas", () => {
	const own = ["23.000", "25.000", "24.500"];
	const ref = ["23.100", "24.900", "24.400"];

	it("sums completed sectors only", () => {
		const d = pushLapDeltas([s("22.897"), s(""), s("")], own, ref);
		expect(d.completed).toBe(1);
		expect(d.ownMs).toBeCloseTo(-103);
		expect(d.refMs).toBeCloseTo(-203);
	});

	it("adds up two sectors", () => {
		const d = pushLapDeltas([s("22.950"), s("25.100"), s("")], own, ref);
		expect(d.completed).toBe(2);
		expect(d.ownMs).toBeCloseTo(50);
		expect(d.refMs).toBeCloseTo(50);
	});

	it("flags a session-best sector", () => {
		expect(pushLapDeltas([s("22.800", true), s(""), s("")], own, ref).sessionBest).toBe(true);
	});

	it("has no delta when a completed sector has no best to compare", () => {
		const d = pushLapDeltas([s("22.800"), s(""), s("")], [undefined, undefined, undefined], ref);
		expect(d.ownMs).toBeNull();
		expect(d.refMs).toBeCloseTo(-300);

		// S2 has no own best: summing S1 alone would compare a different set of sectors.
		const gap = pushLapDeltas([s("22.950"), s("25.100"), s("")], ["23.000", undefined, undefined], ref);
		expect(gap.ownMs).toBeNull();
		expect(gap.refMs).toBeCloseTo(50);
		expect(pushLapDeltas([s(""), s(""), s("")], own, ref)).toEqual({
			completed: 0,
			ownMs: null,
			refMs: null,
			sessionBest: false,
		});
	});
});

describe("formatDelta", () => {
	it("signs the delta in seconds", () => {
		expect(formatDelta(-103)).toBe("−0.103");
		expect(formatDelta(52)).toBe("+0.052");
		expect(formatDelta(0)).toBe("+0.000");
	});
});

describe("previousBestSectors / bestsBeforeLap", () => {
	const stats = (s1: string, s2: string) =>
		({ Lines: { "16": { BestSectors: [{ Value: s1 }, { Value: s2 }, { Value: "" }] } } }) as unknown as TimingStats;

	it("remembers the best a sector had before it improved", () => {
		const prev = previousBestSectors(stats("21.138", "23.734"), stats("21.107", "23.734"), {});
		expect(prev["16"]).toEqual(["21.138"]);
		// An unchanged update keeps the same object.
		expect(previousBestSectors(stats("21.107", "23.734"), stats("21.107", "23.734"), prev)).toBe(prev);
		expect(previousBestSectors(undefined, stats("21.107", "23.734"), prev)).toBe(prev);
	});

	it("measures the sector that set the new best against the old one", () => {
		// LEC, Canada Q1: S1 21.107 beat 21.138; S2 23.672 beat 23.734.
		const sectors = [{ Value: "21.107" }, { Value: "23.672" }, { Value: "" }];
		const best = ["21.107", "23.672", "29.695"];
		const own = bestsBeforeLap(sectors, best, ["21.138", "23.734"]);
		expect(own).toEqual(["21.138", "23.734", "29.695"]);
		expect(pushLapDeltas(sectors, own, best).ownMs).toBe(-31 - 62);
	});

	it("falls back to the current best when the old one isn't known", () => {
		expect(bestsBeforeLap([{ Value: "21.107" }], ["21.107"], undefined)).toEqual(["21.107", undefined, undefined]);
		expect(bestsBeforeLap([{ Value: "21.300" }], ["21.107"], ["21.138"])).toEqual(["21.107", undefined, undefined]);
	});
});
