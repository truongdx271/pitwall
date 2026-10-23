import { describe, expect, it } from "vitest";
import { waveformBars } from "./waveform";

describe("waveformBars", () => {
	const path = "TeamRadio/OSCPIA01_81_20260524_200848.mp3";

	it("is stable for the same clip", () => {
		expect(waveformBars(path)).toEqual(waveformBars(path));
	});

	it("differs between clips", () => {
		expect(waveformBars(path)).not.toEqual(waveformBars("TeamRadio/LANNOR01_4_20260524_201454.mp3"));
	});

	it("returns the requested number of bars between 0.2 and 1", () => {
		const bars = waveformBars(path, 48);
		expect(bars).toHaveLength(48);
		for (const h of bars) {
			expect(h).toBeGreaterThanOrEqual(0.2);
			expect(h).toBeLessThanOrEqual(1);
		}
	});
});
