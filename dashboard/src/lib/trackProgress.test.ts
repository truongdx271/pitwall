import { describe, expect, it } from "vitest";

import { buildTrack, lapSeconds, parseLapTime, pointAt, segmentProgress, step, wrapDelta } from "./trackProgress";

// 100 x 100 square, perimeter 400
const square = buildTrack([
	{ x: 0, y: 0 },
	{ x: 100, y: 0 },
	{ x: 100, y: 100 },
	{ x: 0, y: 100 },
]);

const segs = (statuses: number[][]) => ({
	Sectors: statuses.map((s) => ({ Segments: s.map((Status) => ({ Status })) })),
});

describe("pointAt", () => {
	it("walks along the outline by distance, including the closing edge", () => {
		expect(square.length).toBe(400);
		expect(pointAt(square, 0)).toEqual({ x: 0, y: 0 });
		expect(pointAt(square, 0.125)).toEqual({ x: 50, y: 0 });
		expect(pointAt(square, 0.5)).toEqual({ x: 100, y: 100 });
		expect(pointAt(square, 0.875)).toEqual({ x: 0, y: 50 });
	});

	it("wraps fractions beyond one lap", () => {
		expect(pointAt(square, 1.125)).toEqual(pointAt(square, 0.125));
	});
});

describe("segmentProgress", () => {
	it("is the end of the furthest completed segment", () => {
		expect(
			segmentProgress(
				segs([
					[2049, 2049],
					[2048, 0],
				]) as never,
			),
		).toEqual({ fraction: 0.75, segmentSize: 0.25 });
	});

	it("is zero at the start of a lap", () => {
		expect(
			segmentProgress(
				segs([
					[0, 0],
					[0, 0],
				]) as never,
			)?.fraction,
		).toBe(0);
	});

	it("accepts object-shaped arrays from the live feed", () => {
		const timing = { Sectors: { "0": { Segments: { "0": { Status: 2049 }, "1": { Status: 0 } } } } };
		expect(segmentProgress(timing as never)?.fraction).toBe(0.5);
	});
});

describe("lap time", () => {
	it("parses m:ss.sss", () => {
		expect(parseLapTime("1:44.162")).toBeCloseTo(104.162);
		expect(parseLapTime("")).toBeNull();
	});

	it("caps slow laps relative to the best", () => {
		const t = lapSeconds({ LastLapTime: { Value: "2:30.000" }, BestLapTime: { Value: "1:40.000" } } as never);
		expect(t).toBeCloseTo(130);
	});
});

describe("step", () => {
	it("keeps moving between segment updates instead of jumping", () => {
		let p = step(undefined, 0.5, 0.05, 100, 0, 0, true);
		for (let i = 1; i <= 10; i++) p = step(p, 0.5, 0.05, 100, i * 100, 0.1, true);
		// 1s at 1/100 lap per second, target unchanged
		expect(p.shown).toBeGreaterThan(0.5);
		expect(p.shown).toBeLessThanOrEqual(0.55);
	});

	it("never passes the end of the current segment", () => {
		let p = step(undefined, 0.5, 0.05, 10, 0, 0, true);
		for (let i = 1; i <= 100; i++) p = step(p, 0.5, 0.05, 10, i * 100, 0.1, true);
		expect(p.shown).toBeCloseTo(0.55);
	});

	it("never moves backwards", () => {
		let p = step(undefined, 0.5, 0.05, 100, 0, 0, true);
		p = step(p, 0.48, 0.05, 100, 100, 0.1, true);
		expect(p.shown).toBeGreaterThanOrEqual(0.5);
	});

	it("crosses the finish line without unwinding a lap", () => {
		let p = step(undefined, 0.98, 0.02, 100, 0, 0, true);
		p = step(p, 0, 0.02, 100, 100, 0.1, true);
		for (let i = 2; i < 40; i++) p = step(p, 0.02, 0.02, 100, i * 100, 0.1, true);
		expect(p.shown).toBeGreaterThan(1);
		expect(p.shown).toBeLessThanOrEqual(1.04);
	});

	it("snaps on large gaps and holds still in the pit", () => {
		let p = step(undefined, 0.1, 0.05, 100, 0, 0, true);
		p = step(p, 0.6, 0.05, 100, 100, 0.1, true);
		expect(p.shown).toBeCloseTo(0.6);
		const held = step(p, 0.6, 0.05, 100, 5000, 0.1, false);
		expect(held.shown).toBeCloseTo(0.6);
	});
});

describe("wrapDelta", () => {
	it("returns the shortest signed distance around the lap", () => {
		expect(wrapDelta(0.02 - 0.98)).toBeCloseTo(0.04);
		expect(wrapDelta(0.4)).toBeCloseTo(0.4);
		expect(wrapDelta(-0.1)).toBeCloseTo(-0.1);
	});
});
