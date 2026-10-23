import { describe, expect, it } from "vitest";

import type { Stint } from "@/types/state.type";
import { displaySpeed, pitStops, stintSegments, strategyAxis, topSpeeds } from "./strategy";

const stint = (Compound: string, TotalLaps: number, StartLaps = 0) => ({ Compound, TotalLaps, StartLaps }) as Stint;

describe("stintSegments", () => {
	it("lays stints end to end on the lap axis", () => {
		expect(stintSegments([stint("INTERMEDIATE", 12), stint("MEDIUM", 18)])).toEqual([
			{ compound: "INTERMEDIATE", startLap: 0, endLap: 12 },
			{ compound: "MEDIUM", startLap: 12, endLap: 30 },
		]);
	});

	it("counts only laps run on this set (used tyres start with laps on them)", () => {
		expect(stintSegments([stint("SOFT", 8, 3)])).toEqual([{ compound: "SOFT", startLap: 0, endLap: 5 }]);
	});

	it("skips stints that haven't started", () => {
		expect(stintSegments([stint("MEDIUM", 20), stint("HARD", 0)])).toHaveLength(1);
	});
});

describe("pitStops", () => {
	it("is one fewer than the stints", () => {
		expect(pitStops([])).toBe(0);
		expect(pitStops([stint("SOFT", 2)])).toBe(0);
		expect(pitStops([stint("INTERMEDIATE", 12), stint("MEDIUM", 2)])).toBe(1);
	});
});

describe("strategyAxis", () => {
	const runs = [[stint("SOFT", 3)], [stint("INTERMEDIATE", 2), stint("MEDIUM", 1)]];

	it("ends at the furthest lap so far", () => {
		expect(strategyAxis("so-far", 68, runs)).toBe(3);
	});

	it("ends at the race distance in full mode, or so far without one", () => {
		expect(strategyAxis("full", 68, runs)).toBe(68);
		expect(strategyAxis("full", 0, runs)).toBe(3);
	});
});

describe("topSpeeds", () => {
	it("keeps the five fastest readings, fastest first", () => {
		const readings = ["150", "182", "", "177", "181", "149", "178"].map((value, i) => ({ nr: String(i), value }));
		expect(topSpeeds(readings).map((r) => r.kmh)).toEqual([182, 181, 178, 177, 150]);
	});

	it("is empty without readings", () => {
		expect(topSpeeds([{ nr: "1", value: undefined }])).toEqual([]);
	});
});

describe("displaySpeed", () => {
	it("converts to mph when asked", () => {
		expect(displaySpeed(322, "metric")).toBe(322);
		expect(displaySpeed(322, "imperial")).toBe(200);
	});
});
