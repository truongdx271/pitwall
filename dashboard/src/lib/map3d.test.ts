import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTrack, pitSlots, pointAt } from "./trackProgress";
import { defaultExaggeration, fetchMap3d, sectorStarts, stackLabels } from "./map3d";

afterEach(() => vi.unstubAllGlobals());

const respond = (body: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));

describe("fetchMap3d", () => {
	it("accepts heights that match the outline", async () => {
		respond({ points: 3, z: [1, 2, 3], pit: [[0, 0, 1]] });
		expect(await fetchMap3d(14, 3)).toEqual({ points: 3, z: [1, 2, 3], pit: [[0, 0, 1]] });
	});
	it("rejects heights baked against a different outline", async () => {
		respond({ points: 3, z: [1, 2, 3], pit: null });
		expect(await fetchMap3d(14, 4)).toBeNull();
	});
	it("keeps the heights when the pit lane is malformed", async () => {
		respond({ points: 2, z: [1, 2], pit: [[0, 0]] });
		expect((await fetchMap3d(14, 2))?.pit).toBeNull();
	});
	it("returns null when the circuit has no file", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
		expect(await fetchMap3d(14, 2)).toBeNull();
	});
});

describe("defaultExaggeration", () => {
	it("raises flat tracks and leaves hilly ones near true scale", () => {
		expect(defaultExaggeration(12.4, 1257)).toBe(6); // Monza
		expect(defaultExaggeration(102.4, 1265)).toBe(1); // Spa
		expect(defaultExaggeration(42.8, 1100)).toBe(2.5); // Interlagos
	});
	it("stays at true scale without height data", () => {
		expect(defaultExaggeration(0, 1000)).toBe(1);
	});
});

describe("sectorStarts", () => {
	const square = { x: [0, 10, 10, 0], y: [0, 0, 10, 10] };
	const at = (x: number, y: number) => ({ angle: 0, length: 0, number: 0, trackPosition: { x, y } });
	it("gives each marshal sector's lap fraction", () => {
		expect(sectorStarts({ ...square, marshalSectors: [at(0, 0), at(10, 10)] })).toEqual([0, 0.5]);
	});
	it("treats an outline without sectors as one", () => {
		expect(sectorStarts({ ...square, marshalSectors: [] })).toEqual([0]);
	});
});

describe("stackLabels", () => {
	it("leaves separate chips alone", () => {
		const anchors = [
			{ x: 0, y: 100 },
			{ x: 200, y: 100 },
		];
		expect(stackLabels(anchors)).toEqual(anchors);
	});
	it("lifts a chip clear of an earlier one", () => {
		const boxes = stackLabels([
			{ x: 0, y: 100 },
			{ x: 10, y: 100 },
			{ x: 5, y: 100 },
		]);
		expect(boxes.map((b) => b.y)).toEqual([100, 83, 66]);
	});
});

describe("track height", () => {
	const track = buildTrack([
		{ x: 0, y: 0, z: 10 },
		{ x: 100, y: 0, z: 20 },
		{ x: 100, y: 100, z: 20 },
		{ x: 0, y: 100, z: 10 },
	]);
	it("interpolates along the lap", () => {
		expect(pointAt(track, 0.125).z).toBeCloseTo(15);
	});
	it("gives pit slots the height of the track beside them", () => {
		const [slot] = pitSlots(track, 1, 10, 5, "left");
		expect(slot.z).toBeCloseTo(10);
	});
	it("stays flat for a 2D track", () => {
		expect(
			pointAt(
				buildTrack([
					{ x: 0, y: 0 },
					{ x: 1, y: 0 },
				]),
				0.25,
			).z,
		).toBeUndefined();
	});
});
