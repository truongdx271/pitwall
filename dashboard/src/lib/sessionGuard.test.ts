import { describe, expect, it } from "vitest";

import { merge } from "@/lib/merge";
import { isNewSession } from "./sessionGuard";

const RACE = "2026/2026-10-11_Singapore_Grand_Prix/2026-10-11_Race/";
const FP1 = "2026/2026-10-25_United_States_Grand_Prix/2026-10-23_Practice_1/";

describe("isNewSession", () => {
	it("is a change when the session path moves", () => {
		expect(isNewSession(RACE, FP1)).toBe(true);
	});

	it("is not a change on the first session, a same-session reconnect, or a message without SessionInfo", () => {
		expect(isNewSession(null, FP1)).toBe(false);
		expect(isNewSession(FP1, FP1)).toBe(false);
		expect(isNewSession(FP1, undefined)).toBe(false);
	});
});

// Why the reset is needed: merging a new session's initial state onto the old one keeps
// whatever the new session hasn't sent yet.
describe("session change without a reset", () => {
	const race = {
		SessionInfo: { Path: RACE },
		RaceControlMessages: { Messages: [{ Utc: "2026-10-11T13:45:40", Message: "CHEQUERED FLAG" }] },
		TimingData: { Lines: { "1": { NumberOfLaps: 62, InPit: false } } },
	};
	const practice = { SessionInfo: { Path: FP1 }, TimingData: { Lines: { "1": { InPit: true } } } };

	it("keeps the race's messages and laps when merged", () => {
		const merged = merge(race, practice) as typeof race;
		expect(merged.RaceControlMessages.Messages).toHaveLength(1);
		expect(merged.TimingData.Lines["1"].NumberOfLaps).toBe(62);
	});

	it("starts clean when the new session replaces the state", () => {
		const fresh = merge({}, practice) as Record<string, unknown>;
		expect(fresh.RaceControlMessages).toBeUndefined();
		expect((fresh.TimingData as typeof race.TimingData).Lines["1"].NumberOfLaps).toBeUndefined();
	});
});
