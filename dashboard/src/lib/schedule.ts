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
