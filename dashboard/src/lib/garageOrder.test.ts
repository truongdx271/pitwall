import { describe, expect, it } from "vitest";

import { garageOrder } from "./garageOrder";

describe("garageOrder", () => {
	it("orders cars by last season's constructors' standings, teammates by number", () => {
		expect(
			garageOrder([
				{ RacingNumber: "11", TeamName: "Cadillac" },
				{ RacingNumber: "81", TeamName: "McLaren" },
				{ RacingNumber: "16", TeamName: "Ferrari" },
				{ RacingNumber: "1", TeamName: "McLaren" },
				{ RacingNumber: "44", TeamName: "Ferrari" },
			]),
		).toEqual(["1", "81", "16", "44", "11"]);
	});

	it("puts teams it does not know after everyone else", () => {
		expect(
			garageOrder([
				{ RacingNumber: "99", TeamName: "New Team" },
				{ RacingNumber: "10", TeamName: "Alpine" },
			]),
		).toEqual(["10", "99"]);
	});
});
