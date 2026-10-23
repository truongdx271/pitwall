import { describe, expect, it } from "vitest";
import { incidentCars, incidentReason, incidents, rcStatus } from "./rcStatus";

// Real strings from the Canada and Australia 2026 recordings.
const NOTED =
	"INCIDENT INVOLVING CARS 30 (LAW) AND 27 (HUL) NOTED - STARTING PROCEDURE INFRINGEMENT - OUT OF POSITION AT SAFETY CAR LINE";
const UNDER =
	"FIA STEWARDS: INCIDENT INVOLVING CARS 30 (LAW) AND 27 (HUL) UNDER INVESTIGATION - STARTING PROCEDURE INFRINGEMENT - OUT OF POSITION AT SAFETY CAR LINE";
const AFTER =
	"FIA STEWARDS: INCIDENT INVOLVING CAR 11 (PER) WILL BE INVESTIGATED AFTER THE RACE - IGNORING BLUE FLAGS (17:02:52)";
const NFA =
	"FIA STEWARDS: INCIDENT INVOLVING CARS 77 (BOT) AND 18 (STR) NO FURTHER ACTION - STARTING PROCEDURE INFRINGEMENT - OUT OF POSITION AT SAFETY CAR LINE";
const REVIEWED =
	"FIA STEWARDS: INCIDENT INVOLVING CAR 10 (GAS) REVIEWED NO FURTHER INVESTIGATION - YELLOW FLAG INFRINGEMENT (17:01:36)";
const PENALTY = "FIA STEWARDS: 5 SECOND TIME PENALTY FOR CAR 27 (HUL) - SPEEDING IN THE PIT LANE";
const SERVED = "FIA STEWARDS: PENALTY SERVED - 5 SECOND TIME PENALTY FOR CAR 77 (BOT) - SPEEDING IN THE PIT LANE";
const DELETED = "CAR 1 (NOR) TIME 1:18.118 DELETED - TRACK LIMITS AT TURN 14 LAP 18 16:34:05";

describe("rcStatus", () => {
	it("reads the steward status from the wording", () => {
		expect(rcStatus(NOTED)).toBe("noted");
		expect(rcStatus(UNDER)).toBe("investigation");
		expect(rcStatus(AFTER)).toBe("investigation");
		expect(rcStatus(NFA)).toBe("nfa");
		expect(rcStatus(REVIEWED)).toBe("nfa");
		expect(rcStatus(PENALTY)).toBe("penalty");
		expect(rcStatus(SERVED)).toBe("penalty");
	});

	it("is null for ordinary messages", () => {
		expect(rcStatus("GREEN LIGHT - PIT EXIT OPEN")).toBeNull();
		expect(rcStatus(DELETED)).toBeNull();
	});
});

describe("incident parsing", () => {
	it("finds the cars and the offence", () => {
		expect(incidentCars(NOTED)).toEqual(["30", "27"]);
		expect(incidentReason(NOTED)).toBe("STARTING PROCEDURE INFRINGEMENT - OUT OF POSITION AT SAFETY CAR LINE");
		expect(incidentReason(AFTER)).toBe("IGNORING BLUE FLAGS");
		expect(incidentReason(SERVED)).toBe("SPEEDING IN THE PIT LANE");
		expect(incidentReason(PENALTY)).toBe("SPEEDING IN THE PIT LANE");
	});

	it("collapses an incident's messages into its latest status, newest first", () => {
		const list = incidents([
			{ Message: NOTED, Utc: "2026-05-24T20:13:25Z" },
			{ Message: UNDER, Utc: "2026-05-24T20:20:00Z" },
			{ Message: NFA, Utc: "2026-05-24T20:15:00Z" },
			{ Message: DELETED, Utc: "2026-05-24T20:16:00Z" },
			{ Message: "GREEN LIGHT - PIT EXIT OPEN", Utc: "2026-05-24T20:00:00Z" },
		]);
		expect(list).toHaveLength(2);
		expect(list[0]).toMatchObject({ cars: ["30", "27"], status: "investigation" });
		expect(list[0].summary).toBe("Starting procedure infringement — out of position at safety car line");
		expect(list[1]).toMatchObject({ cars: ["77", "18"], status: "nfa" });
	});

	it("follows an incident through to its penalty", () => {
		const under = "FIA STEWARDS: INCIDENT INVOLVING CAR 27 (HUL) UNDER INVESTIGATION - SPEEDING IN THE PIT LANE";
		const list = incidents([
			{ Message: under, Utc: "2026-05-24T20:10:00Z" },
			{ Message: PENALTY, Utc: "2026-05-24T20:12:00Z" },
			{
				Message: "FIA STEWARDS: PENALTY SERVED - 5 SECOND TIME PENALTY FOR CAR 27 (HUL) - SPEEDING IN THE PIT LANE",
				Utc: "2026-05-24T20:30:00Z",
			},
		]);
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ cars: ["27"], status: "penalty", summary: "Speeding in the pit lane" });
	});

	it("merges a one-car penalty into the two-car incident it came from", () => {
		const list = incidents([
			{
				Message:
					"FIA STEWARDS: TURN 10 INCIDENT INVOLVING CARS 81 (PIA) AND 23 (ALB) UNDER INVESTIGATION - CAUSING A COLLISION (16:25:37)",
				Utc: "2026-05-24T20:10:00Z",
			},
			{
				Message: "FIA STEWARDS: 10 SECOND TIME PENALTY FOR CAR 81 (PIA) - CAUSING A COLLISION (16:25:37)",
				Utc: "2026-05-24T20:20:00Z",
			},
		]);
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ cars: ["81", "23"], status: "penalty" });
	});
});
