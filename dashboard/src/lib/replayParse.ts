// Pure parsing helpers for the dev replay route (src/app/api/dev/replay/route.server.ts).
// Kept here so they can be unit-tested without the Node file-streaming machinery.

// Topics the dashboard folds into `state` (see useDataEngine.ts). Everything else in
// the raw F1 feed is dropped to keep the stream small.
export const STATE_TOPICS = new Set([
	"Heartbeat",
	"ExtrapolatedClock",
	"TopThree",
	"TimingStats",
	"TimingAppData",
	"WeatherData",
	"TrackStatus",
	"SessionStatus",
	"DriverList",
	"RaceControlMessages",
	"SessionInfo",
	"SessionData",
	"LapCount",
	"TimingData",
	"TeamRadio",
	"ChampionshipPrediction",
]);

// Compressed telemetry — forwarded as-is (not folded into state). The client's
// parseMessage() normalises `CarData.z` -> `CarDataZ` / `Position.z` -> `PositionZ`.
export const PASSTHROUGH_TOPICS = new Set(["CarData.z", "Position.z"]);

export type ParsedMessage = { topic: string; data: unknown; ts: number };

/** One decoded raw-SignalR line: `{I,R}` (initial dump) or `{M:[{A:[topic,data,utc]}]}`. */
export function parseSignalrLine(line: string): { initial?: unknown; messages: ParsedMessage[] } | null {
	const trimmed = line.trim();
	if (!trimmed) return null;

	let json: unknown;
	try {
		json = JSON.parse(trimmed);
	} catch {
		return null;
	}
	if (typeof json !== "object" || json === null) return null;

	const obj = json as Record<string, unknown>;

	if ("R" in obj && typeof obj.R === "object" && obj.R !== null) {
		return { initial: obj.R, messages: [] };
	}

	const m = obj.M;
	if (!Array.isArray(m)) return { messages: [] };

	const messages: ParsedMessage[] = [];
	for (const item of m) {
		if (typeof item !== "object" || item === null) continue;
		const a = (item as Record<string, unknown>).A;
		if (!Array.isArray(a) || a.length < 2) continue;
		const [topic, data, utc] = a as [string, unknown, string | undefined];
		messages.push({ topic, data, ts: utc ? Date.parse(utc) : NaN });
	}
	return { messages };
}

/** Keep only the topics the dashboard renders. */
export function projectMessage(topic: string, data: unknown): { key: string; data: unknown } | null {
	if (STATE_TOPICS.has(topic) || PASSTHROUGH_TOPICS.has(topic)) return { key: topic, data };
	return null;
}
