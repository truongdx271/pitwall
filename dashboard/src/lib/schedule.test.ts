import { describe, expect, it, vi } from "vitest";

import { firstUpcoming, loadSchedule } from "@/lib/schedule";
import type { Round } from "@/types/schedule.type";

const round = (name: string, over: boolean): Round =>
	({ name, countryName: name, countryKey: null, start: "2026-10-04T07:00:00Z", end: "2026-10-04T15:00:00Z", sessions: [], over }) as Round;

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
