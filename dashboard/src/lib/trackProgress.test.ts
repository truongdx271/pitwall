import { describe, expect, it } from "vitest";

import {
	buildTrack,
	lapSeconds,
	parseLapTime,
	pitSlots,
	pointAt,
	SegmentShares,
	sectorBoundaries,
	segmentProgress,
	segmentState,
	step,
	wrapDelta,
} from "./trackProgress";

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

	it("slows down to the pace measured between segments on a slow out-lap", () => {
		// Lap time says 100 s, but the car takes 10 s per 0.05 segment (a 200 s lap).
		let p = step(undefined, 0.1, 0.05, 100, 0, 0, true);
		p = step(p, 0.15, 0.05, 100, 10_000, 0.1, true); // first crossing: start timing
		p = step(p, 0.2, 0.05, 100, 20_000, 0.1, true); // second crossing: 0.05 in 10 s
		expect(p.pace).toBeCloseTo(0.005);

		// Halfway through the next segment the dot is near the middle, not parked at its end.
		for (let t = 20_100; t <= 25_000; t += 100) p = step(p, 0.2, 0.05, 100, t, 0.1, true);
		expect(p.shown).toBeGreaterThan(0.215);
		expect(p.shown).toBeLessThan(0.235);
	});

	it("does not time a segment from when the car was first seen", () => {
		let p = step(undefined, 0.1, 0.05, 100, 0, 0, true);
		p = step(p, 0.15, 0.05, 100, 60_000, 0.1, true);
		expect(p.pace).toBeUndefined();
	});

	it("ignores implausible segment timings", () => {
		let p = step(undefined, 0.1, 0.05, 100, 0, 0, true);
		p = step(p, 0.15, 0.05, 100, 1_000, 0.1, true);
		p = step(p, 0.2, 0.05, 100, 1_050, 0.1, true); // 0.05 lap in 50 ms: batched update
		expect(p.pace).toBeUndefined();
	});
});

describe("wrapDelta", () => {
	it("returns the shortest signed distance around the lap", () => {
		expect(wrapDelta(0.02 - 0.98)).toBeCloseTo(0.04);
		expect(wrapDelta(0.4)).toBeCloseTo(0.4);
		expect(wrapDelta(-0.1)).toBeCloseTo(-0.1);
	});
});

describe("pitSlots", () => {
	// Finish line at (0,0) on a 1000-long straight heading +x; the lap returns along y = 3000.
	const loop = buildTrack([
		{ x: 0, y: 0 },
		{ x: 1000, y: 0 },
		{ x: 1000, y: 3000 },
		{ x: -1000, y: 3000 },
		{ x: -1000, y: 0 },
	]);

	it("returns nothing when no car is in the pit", () => {
		expect(pitSlots(loop, 0, 100, 50)).toEqual([]);
	});

	it("lines cars up beside the finish line instead of stacking them", () => {
		const slots = pitSlots(loop, 3, 100, 50);
		expect(slots.map((p) => Math.round(p.x))).toEqual([-100, 0, 100]);
		expect(new Set(slots.map((p) => Math.round(Math.abs(p.y)))).size).toBe(1);
		expect(Math.abs(slots[0].y)).toBeCloseTo(50);
	});

	it("puts the row on the side with more room", () => {
		// The other side of the straight is open; the return straight sits at y = 3000.
		expect(pitSlots(loop, 1, 100, 1600)[0].y).toBeCloseTo(-1600);

		const tight = buildTrack([
			{ x: 0, y: 0 },
			{ x: 1000, y: 0 },
			{ x: 1000, y: -500 },
			{ x: -1000, y: -500 },
			{ x: -1000, y: 0 },
		]);
		expect(pitSlots(tight, 1, 100, 400)[0].y).toBeCloseTo(400);
	});

	it("keeps every car in one row, entry side first", () => {
		const slots = pitSlots(loop, 10, 100, 1600);
		expect(slots.every((p) => Math.abs(p.y + 1600) < 1e-6)).toBe(true);
		expect(slots[0].x).toBeCloseTo(-450);
		expect(slots[9].x).toBeCloseTo(450);
	});
});

describe("segment boundaries", () => {
	it("splits the lap by best sector times, evenly within each sector", () => {
		const b = sectorBoundaries([2, 2], [30, 10]);
		expect(b.map((v) => +v.toFixed(3))).toEqual([0, 0.375, 0.75, 0.875, 1]);
	});

	it("falls back to even segments when sector times are missing", () => {
		expect(sectorBoundaries([1, 3], [25, null])).toEqual([0, 0.25, 0.5, 0.75, 1]);
	});

	it("places the car using the given boundaries", () => {
		const timing = segs([
			[2049, 2049],
			[2048, 0],
		]);
		expect(segmentProgress(timing as never, [0, 0.1, 0.2, 0.6, 1])).toEqual({ fraction: 0.6, segmentSize: 0.4 });
		expect(segmentState(timing as never)).toEqual({ completed: 3, count: 4, sectorCounts: [2, 2] });
	});

	it("wraps the next segment size at the finish line", () => {
		const done = segs([
			[2049, 2049],
			[2049, 2049],
		]);
		expect(segmentProgress(done as never, [0, 0.1, 0.2, 0.6, 1])).toEqual({ fraction: 1, segmentSize: 0.1 });
	});
});

describe("SegmentShares", () => {
	// Drive one car through `laps` laps of segments lasting `durations` seconds each.
	const drive = (shares: SegmentShares, nr: string, durations: number[], laps: number, best: number, t0 = 0) => {
		let t = t0;
		shares.observe(nr, durations.length, durations.length, t, best); // sitting on the finish line
		for (let lap = 0; lap < laps; lap++) {
			shares.observe(nr, 0, durations.length, t, best); // segments reset for the new lap
			durations.forEach((d, i) => {
				t += d * 1000;
				shares.observe(nr, i + 1, durations.length, t, best);
			});
		}
		return t;
	};

	it("knows nothing before a full timed lap", () => {
		const shares = new SegmentShares();
		shares.observe("1", 2, 4, 0, 100);
		shares.observe("1", 3, 4, 5_000, 100);
		expect(shares.boundaries(4)).toBeNull();
	});

	it("learns segment boundaries from the time each segment takes on a push lap", () => {
		const shares = new SegmentShares();
		drive(shares, "1", [10, 30, 40, 20], 2, 100);
		expect(shares.boundaries(4)?.map((v) => +v.toFixed(3))).toEqual([0, 0.1, 0.4, 0.8, 1]);
	});

	it("ignores slow laps and laps with skipped segments", () => {
		const shares = new SegmentShares();
		drive(shares, "1", [40, 40, 40, 40], 2, 100); // 160 s lap vs 100 s best: out-lap
		expect(shares.boundaries(4)).toBeNull();

		shares.observe("2", 4, 4, 0, 100);
		shares.observe("2", 0, 4, 0, 100);
		shares.observe("2", 2, 4, 50_000, 100); // two segments at once
		shares.observe("2", 3, 4, 75_000, 100);
		shares.observe("2", 4, 4, 100_000, 100);
		expect(shares.boundaries(4)).toBeNull();
	});

	it("forgets a car's lap in progress when it is reset", () => {
		const shares = new SegmentShares();
		shares.observe("1", 4, 4, 0, 100);
		shares.observe("1", 1, 4, 25_000, 100);
		shares.reset("1");
		shares.observe("1", 2, 4, 50_000, 100);
		shares.observe("1", 3, 4, 75_000, 100);
		shares.observe("1", 4, 4, 100_000, 100);
		expect(shares.boundaries(4)).toBeNull();
	});
});
