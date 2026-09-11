import { describe, expect, it } from "vitest";
import { stintLaps, tyreLapScale } from "./tyreStrategy";

describe("practice tyre data", () => {
	it("shows FP2 runs without a race LapCount, excluding prior tyre age", () => {
		const runs = [
			[
				{ TotalLaps: 4, StartLaps: 0 },
				{ TotalLaps: 6, StartLaps: 4 },
				{ TotalLaps: 9, StartLaps: 6 },
				{ TotalLaps: 3, StartLaps: 0 },
				{ TotalLaps: 4, StartLaps: 3 },
			],
		];
		expect(tyreLapScale(0, runs)).toBe(13);
	});
	it("keeps the scheduled race scale", () => {
		expect(tyreLapScale(58, [[{ TotalLaps: 12 }]])).toBe(58);
	});
	it("handles no completed laps and partial stint updates", () => {
		expect(tyreLapScale(0, [[]])).toBe(1);
		expect(stintLaps({ StartLaps: 3 })).toBe(0);
		expect(stintLaps({ TotalLaps: 1, Compound: "WET" })).toBe(1);
	});
});
