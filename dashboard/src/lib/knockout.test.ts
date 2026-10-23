import { describe, expect, it } from "vitest";
import { inKnockoutZone, knockoutCutoff } from "./knockout";

describe("knockoutCutoff", () => {
	const noEntries = [22, 16, 10];

	it("takes the cut-off from NoEntries for the current part", () => {
		expect(knockoutCutoff(noEntries, 1)).toBe(16);
		expect(knockoutCutoff(noEntries, 2)).toBe(10);
	});

	it("has no cut-off in Q3", () => {
		expect(knockoutCutoff(noEntries, 3)).toBeNull();
	});

	it("has no cut-off outside a session part", () => {
		expect(knockoutCutoff(noEntries, 0)).toBeNull();
		expect(knockoutCutoff(noEntries, undefined)).toBeNull();
	});

	it("falls back to 15 / 10 when NoEntries is missing", () => {
		expect(knockoutCutoff(undefined, 1)).toBe(15);
		expect(knockoutCutoff(undefined, 2)).toBe(10);
		expect(knockoutCutoff(undefined, 3)).toBeNull();
	});

	it("falls back when NoEntries is still the zeroed placeholder", () => {
		// Australia 2026 sends [0, 0, 0] before the real counts arrive.
		expect(knockoutCutoff([0, 0, 0], 1)).toBe(15);
		expect(knockoutCutoff([22, 0, 0], 2)).toBe(10);
	});
});

describe("inKnockoutZone", () => {
	const noEntries = [22, 16, 10];
	const zone = (part: number) =>
		Array.from({ length: 22 }, (_, i) => i + 1).filter((pos) => inKnockoutZone(pos, noEntries, part));

	it("puts P17+ in the zone in Q1", () => {
		expect(zone(1)).toEqual([17, 18, 19, 20, 21, 22]);
	});

	it("puts P11+ in the zone in Q2", () => {
		expect(zone(2)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
	});

	it("puts nobody in the zone in Q3", () => {
		expect(zone(3)).toEqual([]);
	});

	it("uses the fallback cut-off when NoEntries is missing", () => {
		expect(inKnockoutZone(16, undefined, 1)).toBe(true);
		expect(inKnockoutZone(15, undefined, 1)).toBe(false);
	});
});
