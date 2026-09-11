import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMap } from "./fetchMap";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("fetchMap", () => {
	it("returns unavailable when neither provider nor fallback has a layout", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const fetch = vi.fn().mockResolvedValue(new Response("Circuit not found", { status: 404 }));
		vi.stubGlobal("fetch", fetch);
		expect(await fetchMap(153, 2026)).toBeNull();
		expect(fetch).toHaveBeenCalledWith(
			"https://api.multiviewer.app/api/v1/circuits/153/2026",
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});
	it("rejects incomplete geometry instead of crashing the renderer", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ x: [], y: [] })));
		expect(await fetchMap(153, 2026)).toBeNull();
	});
	it("uses the session year and accepts a usable layout", async () => {
		const map = { x: [0, 1, 2, 0], y: [0, 1, 0, 0], rotation: 0, corners: [], marshalSectors: [] };
		const fetch = vi.fn().mockResolvedValue(Response.json(map));
		vi.stubGlobal("fetch", fetch);
		expect(await fetchMap(7, 2025)).toEqual(map);
		expect(fetch.mock.calls[0][0]).toContain("/7/2025");
	});
	it("loads the bundled FP1 outline when Madring is missing upstream", async () => {
		const map = { x: [0, 1, 2, 0], y: [0, 1, 0, 0], rotation: 0, corners: [], marshalSectors: [], outlineOnly: true };
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(new Response("Circuit not found", { status: 404 }))
			.mockResolvedValueOnce(Response.json(map));
		vi.stubGlobal("fetch", fetch);
		expect(await fetchMap(153, 2026)).toEqual(map);
		expect(fetch.mock.calls[1][0]).toBe("/maps/153-2026.json");
	});
	it("handles a timeout or network error", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
		expect(await fetchMap(153, 2026)).toBeNull();
	});
});
