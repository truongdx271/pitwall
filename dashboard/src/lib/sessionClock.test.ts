import { describe, expect, it } from "vitest";
import { circuitLocalTime, sessionRemaining } from "./sessionClock";

const at = (iso: string) => Date.parse(iso);

describe("sessionRemaining", () => {
	it("shows mm:ss under an hour and h:mm:ss above", () => {
		const now = at("2026-06-13T20:00:00Z");
		expect(sessionRemaining({ Utc: "2026-06-13T20:00:00Z", Remaining: "00:08:42", Extrapolating: false }, now, 0)).toBe(
			"08:42",
		);
		expect(sessionRemaining({ Utc: "2026-06-13T20:00:00Z", Remaining: "01:02:03", Extrapolating: false }, now, 0)).toBe(
			"1:02:03",
		);
	});

	it("counts down while extrapolating, shifted back by the delay", () => {
		const clock = { Utc: "2026-06-13T20:00:00Z", Remaining: "00:10:00", Extrapolating: true };
		expect(sessionRemaining(clock, at("2026-06-13T20:01:00Z"), 0)).toBe("09:00");
		expect(sessionRemaining(clock, at("2026-06-13T20:01:00Z"), 30)).toBe("09:30");
	});

	it("never goes below zero", () => {
		const clock = { Utc: "2026-06-13T20:00:00Z", Remaining: "00:00:05", Extrapolating: true };
		expect(sessionRemaining(clock, at("2026-06-13T20:01:00Z"), 0)).toBe("00:00");
	});

	it("is null without a clock", () => {
		expect(sessionRemaining(undefined, 0, 0)).toBeNull();
	});
});

describe("circuitLocalTime", () => {
	it("applies the GMT offset and the delay", () => {
		const now = at("2026-06-13T17:46:28Z");
		expect(circuitLocalTime(now, "-04:00:00", 0)).toBe("13:46:28");
		expect(circuitLocalTime(now, "-04:00:00", 30)).toBe("13:45:58");
		expect(circuitLocalTime(now, "02:00:00", 0)).toBe("19:46:28");
	});

	it("is null without an offset", () => {
		expect(circuitLocalTime(0, undefined, 0)).toBeNull();
	});
});
