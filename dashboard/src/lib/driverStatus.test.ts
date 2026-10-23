import { describe, expect, it } from "vitest";
import { driverStatus } from "./driverStatus";

const sector = (value: string, personalFastest = false, segments: number[] = []) => ({
	Stopped: false,
	Value: value,
	Status: 0,
	OverallFastest: false,
	PersonalFastest: personalFastest,
	Segments: segments.map((Status) => ({ Status })),
});

const driver = (overrides: Partial<Parameters<typeof driverStatus>[0]> = {}) => ({
	InPit: false,
	PitOut: false,
	KnockedOut: false,
	Stopped: false,
	Sectors: [sector(""), sector(""), sector("")],
	...overrides,
});

describe("driverStatus", () => {
	it("is in pit when the feed says so, before anything else", () => {
		expect(driverStatus(driver({ InPit: true, PitOut: true }))).toBe("pit");
	});

	it("is on an out lap after leaving the pits or with a pit-lane segment", () => {
		expect(driverStatus(driver({ PitOut: true }))).toBe("outlap");
		expect(driverStatus(driver({ Sectors: [sector("", false, [2064, 2048]), sector(""), sector("")] }))).toBe("outlap");
	});

	it("is pushing when a completed sector this lap is a personal best", () => {
		expect(driverStatus(driver({ Sectors: [sector("23.049", true), sector(""), sector("")] }))).toBe("push");
	});

	it("is on track otherwise", () => {
		expect(driverStatus(driver())).toBe("track");
		expect(driverStatus(driver({ Sectors: [sector("23.500", false), sector(""), sector("")] }))).toBe("track");
	});

	it("never pushes once knocked out or stopped", () => {
		const pb = [sector("23.049", true), sector(""), sector("")];
		expect(driverStatus(driver({ KnockedOut: true, Sectors: pb }))).toBe("track");
		expect(driverStatus(driver({ Stopped: true, Sectors: pb }))).toBe("track");
	});

	it("lets a long run win over a push lap", () => {
		const pb = [sector("23.049", true), sector(""), sector("")];
		expect(driverStatus(driver({ Sectors: pb }), { longRun: true })).toBe("longrun");
		expect(driverStatus(driver({ InPit: true }), { longRun: true })).toBe("pit");
	});
});
