import { describe, expect, it } from "vitest";

import { CADILLAC_YELLOW, isLight, teamColours, textOn } from "@/lib/color";

describe("isLight", () => {
	it("treats bright team colours as light", () => {
		expect(isLight("FFFFFF")).toBe(true);
		expect(isLight("FF8000")).toBe(true); // McLaren papaya
		expect(isLight("27F4D2")).toBe(true); // Mercedes teal
	});

	it("treats dark team colours as dark", () => {
		expect(isLight("000000")).toBe(false);
		expect(isLight("3671C6")).toBe(false); // Red Bull blue
		expect(isLight("E8002D")).toBe(false); // Ferrari red
	});

	it("is dark for missing or malformed colours", () => {
		expect(isLight("")).toBe(false);
		expect(isLight("FFF")).toBe(false);
	});
});

describe("textOn", () => {
	it("picks black on light and white on dark backgrounds", () => {
		expect(textOn("FF8000")).toBe("#000");
		expect(textOn("3671C6")).toBe("#fff");
		expect(textOn(undefined)).toBe("#fff");
	});
});

describe("teamColours", () => {
	const haas = { TeamName: "Haas F1 Team", TeamColour: "9C9FA2" };
	it("paints Cadillac yellow so it stands apart from Haas grey", () => {
		const list = { "11": { TeamName: "Cadillac", TeamColour: "909090" }, "31": haas };
		expect(teamColours(list)).toEqual({ "11": { TeamName: "Cadillac", TeamColour: CADILLAC_YELLOW }, "31": haas });
	});
	it("returns the same object when nothing changes", () => {
		const list = { "31": haas };
		expect(teamColours(list)).toBe(list);
	});
	it("keeps white text on the Cadillac yellow", () => {
		expect(textOn(CADILLAC_YELLOW)).toBe("#fff");
	});
});
