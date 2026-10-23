import { describe, expect, it } from "vitest";
import { formatDelta, pushLapDeltas } from "./pushLap";

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

	it("has no delta without a best to compare", () => {
		const d = pushLapDeltas([s("22.800"), s(""), s("")], [undefined, undefined, undefined], ref);
		expect(d.ownMs).toBeNull();
		expect(d.refMs).toBeCloseTo(-300);
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
