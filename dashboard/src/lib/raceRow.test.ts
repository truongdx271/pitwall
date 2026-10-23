import { describe, expect, it } from "vitest";
import { positionDelta, proximityBars, segmentColor } from "./raceRow";

describe("positionDelta", () => {
	it("counts places gained and lost since the grid", () => {
		expect(positionDelta(5, 2, false)).toEqual({ kind: "gain", places: 3 });
		expect(positionDelta(1, 4, false)).toEqual({ kind: "loss", places: 3 });
		expect(positionDelta(3, 3, false)).toEqual({ kind: "none" });
	});

	it("shows FL instead when the driver holds the fastest lap", () => {
		expect(positionDelta(5, 2, true)).toEqual({ kind: "fl" });
	});

	it("has nothing to show without a grid position", () => {
		expect(positionDelta(undefined, 2, false)).toEqual({ kind: "none" });
		expect(positionDelta(0, 2, false)).toEqual({ kind: "none" });
	});
});

describe("proximityBars", () => {
	it("fills a bar per quarter second under one second", () => {
		expect(proximityBars("0.900")).toBe(1);
		expect(proximityBars("0.700")).toBe(2);
		expect(proximityBars("0.400")).toBe(3);
		expect(proximityBars("0.100")).toBe(4);
	});

	it("is empty at a second or more, or without a number", () => {
		expect(proximityBars("1.000")).toBe(0);
		expect(proximityBars("+1 LAP")).toBe(0);
		expect(proximityBars(undefined)).toBe(0);
	});
});

describe("segmentColor", () => {
	it("maps the mini-sector statuses", () => {
		expect(segmentColor(2048)).toBe("bg-slower");
		expect(segmentColor(2052)).toBe("bg-slower");
		expect(segmentColor(2049)).toBe("bg-personal-best");
		expect(segmentColor(2051)).toBe("bg-session-best");
		expect(segmentColor(2064)).toBe("bg-pit");
		expect(segmentColor(0)).toBe("bg-surface-3");
	});
});
