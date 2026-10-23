import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { utcMs } from "./utcMs";

// The bug only shows away from UTC: run in Vietnam time (UTC+7).
const originalTz = process.env.TZ;
beforeAll(() => {
	process.env.TZ = "Asia/Ho_Chi_Minh";
});
afterAll(() => {
	process.env.TZ = originalTz;
});

describe("utcMs", () => {
	it("reads a zoneless race control timestamp as UTC", () => {
		expect(new Date(utcMs("2026-10-23T17:38:34")).toISOString()).toBe("2026-10-23T17:38:34.000Z");
	});

	it("keeps timestamps that carry a zone", () => {
		expect(new Date(utcMs("2026-10-23T17:38:17.001Z")).toISOString()).toBe("2026-10-23T17:38:17.001Z");
		expect(new Date(utcMs("2026-10-23T19:38:17+02:00")).toISOString()).toBe("2026-10-23T17:38:17.000Z");
	});

	it("sorts race control after an earlier radio clip", () => {
		const rc = utcMs("2026-10-23T17:38:34");
		const radio = utcMs("2026-10-23T17:38:17.001Z");
		expect(rc).toBeGreaterThan(radio);
		// Date.parse alone gets this wrong in UTC+7.
		expect(Date.parse("2026-10-23T17:38:34")).toBeLessThan(radio);
	});
});
