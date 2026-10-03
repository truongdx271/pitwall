import type { ChampionshipDriver, ChampionshipPrediction, Driver, TimingDataDriver } from "@/types/state.type";

// The feed's ChampionshipPrediction topic isn't delivered to unauthenticated
// clients, so we rebuild it: standings before this event (jolpica) + points
// for the current running order.

const JOLPICA = "https://api.jolpi.ca/ergast/f1";

export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

export type BaseDriver = {
	number: string;
	code: string;
	familyName?: string;
	points: number;
	position: number;
	constructorId?: string;
};

// Drivers with points who aren't in this session's DriverList carry their own label.
export type PredictedDriver = ChampionshipDriver & { Tla?: string; FamilyName?: string };
export type BaseTeam = { constructorId: string; name: string; points: number; position: number };
// `after` names the round these standings were published after.
export type BaseStandings = {
	drivers: BaseDriver[];
	teams: BaseTeam[];
	after?: { round: number; raceName: string };
};

type TimingLine = Pick<TimingDataDriver, "RacingNumber" | "Position" | "Retired" | "Stopped">;

export function predictStandings(
	base: BaseStandings,
	lines: Record<string, TimingLine>,
	rawDriverList: Record<string, Pick<Driver, "Tla" | "TeamName">>,
	pointsTable: number[],
): ChampionshipPrediction & { Drivers: Record<string, PredictedDriver> } {
	// The feed mixes flags like `_kf: true` into DriverList.
	const driverList = Object.fromEntries(
		Object.entries(rawDriverList).filter(([, info]) => typeof info === "object" && info !== null && "Tla" in info),
	);

	const earned = (nr: string): number => {
		const line = lines[nr];
		if (!line || line.Retired || line.Stopped) return 0;
		const pos = parseInt(line.Position);
		return Number.isFinite(pos) ? (pointsTable[pos - 1] ?? 0) : 0;
	};

	const byNumber = new Map(base.drivers.map((d) => [d.number, d]));
	const byCode = new Map(base.drivers.map((d) => [d.code, d]));

	// Live team name -> constructorId, learned from drivers we can match.
	const teamIdByName = new Map<string, string>();
	const baseFor = (nr: string) => byNumber.get(nr) ?? byCode.get(driverList[nr]?.Tla ?? "");
	for (const [nr, info] of Object.entries(driverList)) {
		const id = baseFor(nr)?.constructorId;
		if (id && info.TeamName && !teamIdByName.has(info.TeamName)) teamIdByName.set(info.TeamName, id);
	}

	const lastDriverPos = base.drivers.reduce((max, d) => Math.max(max, d.position), 0);
	const matched = new Set<BaseDriver>();
	const drivers: PredictedDriver[] = Object.keys(driverList).map((nr) => {
		const b = baseFor(nr);
		if (b) matched.add(b);
		const current = b?.points ?? 0;
		return {
			RacingNumber: nr,
			CurrentPosition: b?.position ?? lastDriverPos + 1,
			CurrentPoints: current,
			PredictedPoints: current + earned(nr),
			PredictedPosition: 0,
		};
	});

	// Keep drivers who scored earlier but aren't racing today, so everyone else's
	// championship position stays correct.
	for (const b of base.drivers) {
		if (matched.has(b)) continue;
		drivers.push({
			RacingNumber: b.number || b.code,
			Tla: b.code,
			FamilyName: b.familyName,
			CurrentPosition: b.position,
			CurrentPoints: b.points,
			PredictedPoints: b.points,
			PredictedPosition: 0,
		});
	}

	const teamEarned = new Map<string, number>();
	const teamDisplay = new Map<string, string>();
	for (const [nr, info] of Object.entries(driverList)) {
		const id = baseFor(nr)?.constructorId ?? teamIdByName.get(info.TeamName);
		if (!id) continue;
		teamEarned.set(id, (teamEarned.get(id) ?? 0) + earned(nr));
		if (info.TeamName && !teamDisplay.has(id)) teamDisplay.set(id, info.TeamName);
	}

	const teams = base.teams.map((t) => ({
		TeamName: teamDisplay.get(t.constructorId) ?? t.name,
		CurrentPosition: t.position,
		CurrentPoints: t.points,
		PredictedPoints: t.points + (teamEarned.get(t.constructorId) ?? 0),
		PredictedPosition: 0,
	}));

	rank(drivers);
	rank(teams);

	return {
		Drivers: Object.fromEntries(drivers.map((d) => [d.RacingNumber, d])),
		Teams: Object.fromEntries(teams.map((t) => [t.TeamName, t])),
	};
}

// Ties keep the pre-race order (we don't have countback data).
function rank<T extends { PredictedPoints: number; CurrentPosition: number; PredictedPosition: number }>(rows: T[]) {
	rows
		.slice()
		.sort((a, b) => b.PredictedPoints - a.PredictedPoints || a.CurrentPosition - b.CurrentPosition)
		.forEach((row, i) => (row.PredictedPosition = i + 1));
}

type JolpicaRace = { round: string; raceName?: string; date: string; Sprint?: unknown };

async function get<T>(path: string): Promise<T | null> {
	try {
		const response = await fetch(`${JOLPICA}/${path}`, { signal: AbortSignal.timeout(10_000) });
		if (!response.ok) return null;
		return (await response.json()).MRData as T;
	} catch {
		return null;
	}
}

// Round whose race weekend contains `sessionStart` (race date is the last day).
export function findRound(races: JolpicaRace[], sessionStart: string): JolpicaRace | null {
	const day = Date.parse(sessionStart.slice(0, 10));
	if (Number.isNaN(day)) return null;
	const DAY = 86_400_000;
	return (
		races.find((r) => {
			const raceDay = Date.parse(r.date);
			return day <= raceDay && day >= raceDay - 3 * DAY;
		}) ?? null
	);
}

/**
 * Standings going into this session: after the previous round, plus this
 * weekend's sprint when the session is the main race.
 */
export async function fetchBaseStandings(
	year: number,
	sessionStart: string,
	isMainRace: boolean,
): Promise<BaseStandings | null> {
	const schedule = await get<{ RaceTable: { Races: JolpicaRace[] } }>(`${year}.json?limit=100`);
	const race = schedule && findRound(schedule.RaceTable.Races, sessionStart);
	if (!race) return null;

	const round = parseInt(race.round);
	const base: BaseStandings = { drivers: [], teams: [] };

	if (round > 1) {
		const standings = await fetchStandings(`${year}/${round - 1}`);
		if (!standings) return null;
		base.drivers = standings.drivers;
		base.teams = standings.teams;
		base.after = afterRound(schedule.RaceTable.Races, round - 1);
	}

	if (isMainRace && race.Sprint) {
		const sprint = await get<SprintResponse>(`${year}/${round}/sprint.json?limit=100`);
		applySprint(base, sprint?.RaceTable.Races[0]?.SprintResults ?? []);
	}

	return base;
}

/** Latest published standings for the season (used outside a race weekend). */
export async function fetchLatestStandings(year: number): Promise<BaseStandings | null> {
	const [standings, schedule] = await Promise.all([
		fetchStandings(`${year}`),
		get<{ RaceTable: { Races: JolpicaRace[] } }>(`${year}.json?limit=100`),
	]);
	if (!standings) return null;
	if (standings.round && schedule) standings.after = afterRound(schedule.RaceTable.Races, standings.round);
	return standings;
}

function afterRound(races: JolpicaRace[], round: number): BaseStandings["after"] {
	const race = races.find((r) => parseInt(r.round) === round);
	return race?.raceName ? { round, raceName: race.raceName } : undefined;
}

async function fetchStandings(scope: string): Promise<(BaseStandings & { round?: number }) | null> {
	const [ds, cs] = await Promise.all([
		get<DriverStandingsResponse>(`${scope}/driverstandings.json?limit=100`),
		get<ConstructorStandingsResponse>(`${scope}/constructorstandings.json?limit=100`),
	]);
	if (!ds || !cs) return null;

	const round = parseInt(ds.StandingsTable.StandingsLists[0]?.round ?? "");
	return {
		round: Number.isFinite(round) ? round : undefined,
		drivers: (ds.StandingsTable.StandingsLists[0]?.DriverStandings ?? []).map((d) => ({
			number: d.Driver.permanentNumber ?? "",
			code: d.Driver.code ?? "",
			familyName: d.Driver.familyName,
			points: parseFloat(d.points),
			position: parseInt(d.position),
			constructorId: d.Constructors.at(-1)?.constructorId,
		})),
		teams: (cs.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []).map((c) => ({
			constructorId: c.Constructor.constructorId,
			name: c.Constructor.name,
			points: parseFloat(c.points),
			position: parseInt(c.position),
		})),
	};
}

export function applySprint(base: BaseStandings, results: SprintResult[]) {
	for (const r of results) {
		const pts = parseFloat(r.points);
		if (!pts) continue;
		const number = r.Driver.permanentNumber ?? r.number;
		let driver = base.drivers.find((d) => d.number === number || d.code === r.Driver.code);
		if (!driver) {
			driver = { number, code: r.Driver.code ?? "", points: 0, position: base.drivers.length + 1 };
			base.drivers.push(driver);
		}
		driver.points += pts;
		driver.constructorId ??= r.Constructor.constructorId;

		let team = base.teams.find((t) => t.constructorId === r.Constructor.constructorId);
		if (!team) {
			team = {
				constructorId: r.Constructor.constructorId,
				name: r.Constructor.name,
				points: 0,
				position: base.teams.length + 1,
			};
			base.teams.push(team);
		}
		team.points += pts;
	}
	// Positions going into the race include the sprint.
	reorder(base.drivers);
	reorder(base.teams);
}

function reorder(rows: { points: number; position: number }[]) {
	rows
		.slice()
		.sort((a, b) => b.points - a.points || a.position - b.position)
		.forEach((row, i) => (row.position = i + 1));
}

type DriverStandingsResponse = {
	StandingsTable: {
		StandingsLists: {
			round?: string;
			DriverStandings: {
				position: string;
				points: string;
				Driver: { permanentNumber?: string; code?: string; familyName?: string };
				Constructors: { constructorId: string }[];
			}[];
		}[];
	};
};

type ConstructorStandingsResponse = {
	StandingsTable: {
		StandingsLists: {
			ConstructorStandings: {
				position: string;
				points: string;
				Constructor: { constructorId: string; name: string };
			}[];
		}[];
	};
};

type SprintResult = {
	number: string;
	points: string;
	Driver: { permanentNumber?: string; code?: string };
	Constructor: { constructorId: string; name: string };
};

type SprintResponse = { RaceTable: { Races: { SprintResults?: SprintResult[] }[] } };
