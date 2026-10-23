import { describe, expect, it } from "vitest";
import { parseTab, tabHref } from "./tabs";

describe("parseTab", () => {
	it("accepts the six tab ids", () => {
		for (const id of ["live", "map", "messages", "strategy", "weather", "standings"]) {
			expect(parseTab(id)).toBe(id);
		}
	});

	it("falls back to live for missing or old tab ids", () => {
		expect(parseTab(null)).toBe("live");
		expect(parseTab("timing")).toBe("live");
		expect(parseTab("racecontrol")).toBe("live");
	});
});

describe("tabHref", () => {
	it("keeps the live tab on the bare dashboard URL", () => {
		expect(tabHref("live")).toBe("/dashboard");
		expect(tabHref("map")).toBe("/dashboard?tab=map");
	});
});
