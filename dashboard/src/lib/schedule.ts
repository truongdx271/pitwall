// Client-side schedule loading for the static Cloudflare build, where no server renders /schedule.
import type { Round } from "@/types/schedule.type";

type Fetcher = (url: string) => Promise<Response>;

export async function loadSchedule(apiBase: string, fetcher: Fetcher = fetch): Promise<Round[] | null> {
	try {
		const res = await fetcher(`${apiBase}/api/schedule`);
		if (!res.ok) return null;
		return (await res.json()) as Round[];
	} catch (e) {
		console.error("error fetching schedule", e);
		return null;
	}
}

// Same rule as the API's /api/schedule/next.
export const firstUpcoming = (rounds: Round[]): Round | null => rounds.find((round) => !round.over) ?? null;

// Countries with more than one round get the city instead (Austin stays "United States").
const CITIES: [keyword: string, city: string][] = [
	["LAS VEGAS", "Las Vegas"],
	["MIAMI", "Miami"],
	["BARCELONA", "Barcelona"],
	["SPANISH", "Madrid"],
	["ESPAÑA", "Madrid"],
];

/** What a round is called on screen: its country, or its city where the country has two. */
export const roundTitle = (round: Pick<Round, "name" | "countryName">): string =>
	CITIES.find(([keyword]) => round.name.toUpperCase().includes(keyword))?.[1] ?? round.countryName;

export type NextSession = { round: string; country: string; kind: string; start: string };

/** The earliest session across the schedule that hasn't started yet. */
export const nextSession = (rounds: Round[], nowMs: number): NextSession | null => {
	let best: NextSession | null = null;
	for (const round of rounds) {
		for (const session of round.sessions) {
			const start = Date.parse(session.start);
			if (start > nowMs && (!best || start < Date.parse(best.start))) {
				best = { round: round.name, country: roundTitle(round), kind: session.kind, start: session.start };
			}
		}
	}
	return best;
};
