import { describe, expect, it } from "vitest";

import { MAX_ATTEMPTS, retryDelayMs, transcriptUrl } from "@/lib/radioTranscript";

describe("transcriptUrl", () => {
	it("joins session and clip path and encodes it", () => {
		expect(
			transcriptUrl("2026/2026-05-24_Canadian_Grand_Prix/2026-05-24_Race/", "TeamRadio/LEC_16_20260524_130022.mp3"),
		).toBe(
			"/api/radio/transcript?path=2026%2F2026-05-24_Canadian_Grand_Prix%2F2026-05-24_Race%2FTeamRadio%2FLEC_16_20260524_130022.mp3",
		);
	});

	it("calls the API directly when given its base URL (static Cloudflare build)", () => {
		expect(transcriptUrl("2026/x/y/", "TeamRadio/LEC_16_20260524_130022.mp3", "https://pitwall-api.example.dev")).toBe(
			"https://pitwall-api.example.dev/api/radio/transcript?path=2026%2Fx%2Fy%2FTeamRadio%2FLEC_16_20260524_130022.mp3",
		);
	});
});

describe("retryDelayMs", () => {
	it("retries 503 using Retry-After seconds", () => {
		expect(retryDelayMs(503, "7", 1)).toBe(7000);
	});

	it("falls back to 10s when Retry-After is missing or junk", () => {
		expect(retryDelayMs(503, null, 1)).toBe(10_000);
		expect(retryDelayMs(503, "soon", 2)).toBe(10_000);
	});

	it("gives up after MAX_ATTEMPTS", () => {
		expect(retryDelayMs(503, "7", MAX_ATTEMPTS)).toBeNull();
	});

	it("never retries other statuses", () => {
		for (const status of [400, 404, 501, 502]) expect(retryDelayMs(status, "7", 1)).toBeNull();
	});
});
