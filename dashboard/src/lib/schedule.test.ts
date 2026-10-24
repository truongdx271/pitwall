import { describe, expect, it, vi } from "vitest";

import { firstUpcoming, loadSchedule, nextSession, roundTitle } from "@/lib/schedule";
import type { Round } from "@/types/schedule.type";

const round = (name: string, over: boolean): Round =>
	({
		name,
		countryName: name,
		countryKey: null,
		start: "2026-10-04T07:00:00Z",
		end: "2026-10-04T15:00:00Z",
		sessions: [],
		over,
	}) as Round;

describe("firstUpcoming", () => {
	it("returns the first round that is not over", () => {
		expect(firstUpcoming([round("A", true), round("B", false), round("C", false)])?.name).toBe("B");
	});

	it("returns null when the season is over", () => {
		expect(firstUpcoming([round("A", true)])).toBeNull();
	});
});

describe("loadSchedule", () => {
	it("fetches the schedule from the API base", async () => {
		const fetcher = vi.fn(async () => Response.json([round("A", false)]));
		const rounds = await loadSchedule("https://api.example.dev", fetcher);
		expect(fetcher).toHaveBeenCalledWith("https://api.example.dev/api/schedule");
		expect(rounds?.map((r) => r.name)).toEqual(["A"]);
	});

	it("returns null on an error status", async () => {
		expect(await loadSchedule("https://api.example.dev", async () => new Response(null, { status: 500 }))).toBeNull();
	});

	it("returns null when the network fails", async () => {
		const fetcher = async (): Promise<Response> => {
			throw new TypeError("network");
		};
		expect(await loadSchedule("https://api.example.dev", fetcher)).toBeNull();
	});
});

describe("nextSession", () => {
	const withSessions = (name: string, sessions: { kind: string; start: string }[]): Round =>
		({ ...round(name, false), sessions: sessions.map((s) => ({ ...s, end: s.start })) }) as Round;

	const rounds = [
		withSessions("Canada", [
			{ kind: "Practice 1", start: "2026-06-12T17:30:00Z" },
			{ kind: "Qualifying", start: "2026-06-13T20:00:00Z" },
			{ kind: "Race", start: "2026-06-14T18:00:00Z" },
		]),
		withSessions("Spain", [{ kind: "Practice 1", start: "2026-06-26T11:30:00Z" }]),
	];

	it("picks the earliest session that hasn't started", () => {
		expect(nextSession(rounds, Date.parse("2026-06-13T12:00:00Z"))).toEqual({
			round: "Canada",
			country: "Canada",
			kind: "Qualifying",
			start: "2026-06-13T20:00:00Z",
		});
		expect(nextSession(rounds, Date.parse("2026-06-15T00:00:00Z"))?.round).toBe("Spain");
	});

	it("returns null after the last session", () => {
		expect(nextSession(rounds, Date.parse("2026-07-01T00:00:00Z"))).toBeNull();
	});
});

describe("roundTitle", () => {
	it("names the city where a country has two rounds, the country otherwise", () => {
		const title = (name: string, countryName: string) => roundTitle({ name, countryName });
		expect(title("HEINEKEN LAS VEGAS GRAND PRIX 2026", "United States")).toBe("Las Vegas");
		expect(title("MIAMI GRAND PRIX 2026", "United States")).toBe("Miami");
		expect(title("MSC CRUISES UNITED STATES GRAND PRIX 2026", "United States")).toBe("United States");
		expect(title("BARCELONA GRAND PRIX 2026", "Spain")).toBe("Barcelona");
		expect(title("LENOVO GRAN PREMIO DE ESPAÑA  2027", "Spain")).toBe("Madrid");
		expect(title("SINGAPORE AIRLINES SINGAPORE GRAND PRIX 2026", "Singapore")).toBe("Singapore");
	});
});
