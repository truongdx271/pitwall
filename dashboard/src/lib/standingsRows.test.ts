import { describe, expect, it } from "vitest";
import { fillBackground, standingsRows } from "./standingsRows";

const e = (CurrentPosition: number, PredictedPosition: number, CurrentPoints: number, PredictedPoints: number) => ({
	CurrentPosition,
	PredictedPosition,
	CurrentPoints,
	PredictedPoints,
});

// Before the race: A 106, B 100. Projected: B wins (+25 → 125), A gets 18 → 124.
const entries = [e(1, 2, 106, 124), e(2, 1, 100, 125)];

describe("standingsRows", () => {
	it("orders by projected position with gap, race points and movement", () => {
		const [first, second] = standingsRows(entries, "live");
		expect(first).toMatchObject({ position: 1, points: 125, gap: 0, race: 25, moved: 1 });
		expect(second).toMatchObject({ position: 2, points: 124, gap: 1, race: 18, moved: -1 });
	});

	it("fills to the points before the race, then to the projected total", () => {
		const [first] = standingsRows(entries, "live");
		expect(first.basePct).toBeCloseTo(80);
		expect(first.totalPct).toBeCloseTo(100);
	});

	it("shows the standings before the race without a race segment", () => {
		const [first, second] = standingsRows(entries, "before");
		expect(first).toMatchObject({ position: 1, points: 106, race: 0, moved: 0, gap: 0 });
		expect(second).toMatchObject({ points: 100, gap: 6 });
		expect(first.basePct).toBeCloseTo(first.totalPct);
	});
});

describe("fillBackground", () => {
	it("builds the two-tone gradient over the row colour", () => {
		expect(fillBackground("27F4D2", 80, 100, "var(--color-surface-1)")).toBe(
			"linear-gradient(90deg, rgb(39 244 210 / 0.16) 0 80.00%, rgb(39 244 210 / 0.38) 80.00% 100.00%, transparent 100.00% 100%), var(--color-surface-1)",
		);
	});
});
