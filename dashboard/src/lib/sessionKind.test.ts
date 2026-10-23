import { describe, expect, it } from "vitest";
import { sessionKind } from "./sessionKind";

describe("sessionKind", () => {
	it("routes by SessionInfo.Type", () => {
		expect(sessionKind({ Type: "Practice", Name: "Practice 1" })).toBe("practice");
		expect(sessionKind({ Type: "Qualifying", Name: "Qualifying" })).toBe("qualifying");
		expect(sessionKind({ Type: "Race", Name: "Race" })).toBe("race");
	});

	it("treats Sprint Qualifying as qualifying and the Sprint as a race", () => {
		expect(sessionKind({ Type: "Qualifying", Name: "Sprint Qualifying" })).toBe("qualifying");
		expect(sessionKind({ Type: "Race", Name: "Sprint Qualifying" })).toBe("qualifying");
		expect(sessionKind({ Type: "Race", Name: "Sprint" })).toBe("race");
	});

	it("falls back to the name when Type is missing", () => {
		expect(sessionKind({ Name: "Practice 2" })).toBe("practice");
		expect(sessionKind({ Name: "Qualifying" })).toBe("qualifying");
		expect(sessionKind(undefined)).toBe("race");
	});
});
