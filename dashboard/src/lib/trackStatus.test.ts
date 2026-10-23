import { describe, expect, it } from "vitest";
import { latestSessionStatus, trackStatusView } from "./trackStatus";

describe("trackStatusView", () => {
	it("maps the TrackStatus codes", () => {
		expect(trackStatusView("1", "Started")?.kind).toBe("clear");
		expect(trackStatusView("2", "Started")?.kind).toBe("yellow");
		expect(trackStatusView("4", "Started")?.kind).toBe("sc");
		expect(trackStatusView("5", "Started")?.kind).toBe("red");
		expect(trackStatusView("6", "Started")?.kind).toBe("vsc");
		expect(trackStatusView("7", "Started")?.kind).toBe("vsc");
	});

	it("has a banner for every status but clear", () => {
		expect(trackStatusView("1", "Started")?.banner).toBeNull();
		for (const code of ["2", "4", "5", "6", "7"]) {
			expect(trackStatusView(code, "Started")?.banner).toBeTruthy();
		}
	});

	it("shows the chequered flag once the session is over", () => {
		for (const status of ["Finished", "Finalised", "Ends"]) {
			const view = trackStatusView("1", status);
			expect(view?.kind).toBe("chequered");
			expect(view?.banner).toBeNull();
		}
	});

	it("returns null without a usable status", () => {
		expect(trackStatusView(undefined, undefined)).toBeNull();
		expect(trackStatusView("", "Started")).toBeNull();
		expect(trackStatusView("42", "Started")).toBeNull();
	});
});

describe("latestSessionStatus", () => {
	it("takes the latest series entry that carries a session status", () => {
		const series = [
			{ Utc: "2026-05-24T21:02:32Z", SessionStatus: "Started" as const },
			{ Utc: "2026-05-24T21:10:00Z", TrackStatus: "2" },
			{ Utc: "2026-05-24T22:30:48Z", SessionStatus: "Finished" as const },
			{ Utc: "2026-05-24T22:31:00Z", TrackStatus: "1" },
		];
		expect(latestSessionStatus(series, "Started")).toBe("Finished");
	});

	it("falls back to SessionStatus.Status without a series", () => {
		expect(latestSessionStatus(undefined, "Started")).toBe("Started");
		expect(latestSessionStatus([], "Ends")).toBe("Ends");
	});
});
