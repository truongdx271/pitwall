import { describe, expect, it } from "vitest";

import type { LapTimeEntry } from "@/stores/useHistoryStore";
import type { StintBoundary } from "@/lib/stints";
import { longRun, slopeMsPerLap, validStintLaps } from "./longRun";

const lap = (n: number, ms: number): LapTimeEntry => ({
	lap: n,
	ms,
	time: "",
	overallFastest: false,
	personalFastest: false,
});

// Stint on laps 1–10, still running.
const stint: StintBoundary = { startLap: 1, endLap: 10, compound: "MEDIUM", isActive: true };
const best = 90_000;

describe("validStintLaps", () => {
	it("drops the out lap and laps slower than 107% of the best", () => {
		const entries = [lap(1, 120_000), lap(2, 91_000), lap(3, 100_000), lap(4, 91_200)];
		expect(validStintLaps(entries, stint, [stint], best).map((l) => l.lap)).toEqual([2, 4]);
	});

	it("drops the in lap of a finished stint", () => {
		const done = { ...stint, endLap: 5, isActive: false };
		const entries = [2, 3, 4, 5].map((n) => lap(n, 91_000));
		expect(validStintLaps(entries, done, [done], best).map((l) => l.lap)).toEqual([2, 3, 4]);
	});
});

describe("longRun", () => {
	it("needs at least 5 consecutive valid laps", () => {
		const four = [2, 3, 4, 5].map((n) => lap(n, 91_000));
		expect(longRun(four, stint, [stint], best)).toBeNull();

		// A cool-down lap breaks the run: 2–4, then 6–9.
		const broken = [
			lap(2, 91_000),
			lap(3, 91_000),
			lap(4, 91_000),
			lap(5, 99_000),
			...[6, 7, 8, 9].map((n) => lap(n, 91_000)),
		];
		expect(longRun(broken, stint, [stint], best)).toBeNull();
	});

	it("averages the valid laps and fits the degradation", () => {
		const entries = [lap(1, 125_000), ...[2, 3, 4, 5, 6, 7].map((n) => lap(n, 91_000 + (n - 2) * 100))];
		const run = longRun(entries, stint, [stint], best);
		expect(run?.laps).toBe(6);
		expect(run?.avgMs).toBeCloseTo(91_250);
		expect(run?.degMsPerLap).toBeCloseTo(100);
	});

	it("is null without a stint or a best lap", () => {
		expect(longRun([], undefined, [], best)).toBeNull();
		expect(longRun([lap(2, 91_000)], stint, [stint], Infinity)).toBeNull();
	});
});

describe("slopeMsPerLap", () => {
	it("is a least-squares fit, not last minus first", () => {
		// The last lap is a one-off slow lap; least squares weighs it against the trend.
		const laps = [lap(1, 90_000), lap(2, 90_100), lap(3, 90_200), lap(4, 90_300), lap(5, 91_000)];
		expect(slopeMsPerLap(laps)).toBeCloseTo(220);
		expect(slopeMsPerLap([lap(1, 90_000)])).toBeNull();
	});
});
