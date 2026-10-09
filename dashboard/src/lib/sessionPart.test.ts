import { describe, expect, it } from "vitest";
import { sessionPartPrefix } from "./sessionPart";

describe("sessionPartPrefix", () => {
	it("prefixes sprint qualifying parts with SQ", () => {
		expect(sessionPartPrefix("Sprint Qualifying")).toBe("SQ");
	});
	it("prefixes qualifying parts with Q", () => {
		expect(sessionPartPrefix("Qualifying")).toBe("Q");
	});
	it("has no prefix for other sessions", () => {
		expect(sessionPartPrefix("Race")).toBe("");
	});
});
