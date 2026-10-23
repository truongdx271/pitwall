import type { StatusSeries } from "@/types/state.type";

export type TrackStatusKind = "clear" | "yellow" | "sc" | "vsc" | "red" | "chequered";

export type TrackStatusView = {
	kind: TrackStatusKind;
	label: string;
	/** Text for the full-width banner; null when the status shows no banner. */
	banner: string | null;
};

// TrackStatus.Status codes. The feed carries no sector for yellows (only race control
// messages do), so the label stays generic.
const BY_CODE: Record<number, TrackStatusView> = {
	1: { kind: "clear", label: "Track clear", banner: null },
	2: { kind: "yellow", label: "Yellow flag", banner: "Yellow flag — hazard on track, no overtaking" },
	3: { kind: "yellow", label: "Yellow flag", banner: "Yellow flag — hazard on track, no overtaking" },
	4: {
		kind: "sc",
		label: "Safety car",
		banner: "Safety car deployed — the field is neutralised behind the safety car",
	},
	5: { kind: "red", label: "Red flag", banner: "Red flag — session suspended, cars return to the pit lane" },
	6: {
		kind: "vsc",
		label: "Virtual safety car",
		banner: "Virtual safety car deployed — drivers must stay above the minimum lap time",
	},
	7: { kind: "vsc", label: "VSC ending", banner: "Virtual safety car ending — racing resumes shortly" },
};

const CHEQUERED: TrackStatusView = { kind: "chequered", label: "Chequered flag", banner: null };

/**
 * What the session strip pill and the banner show. The feed has no chequered track
 * status, so a finished session (SessionStatus Finished / Finalised / Ends) shows it.
 */
export const trackStatusView = (
	statusCode: string | number | undefined,
	sessionStatus: string | undefined,
): TrackStatusView | null => {
	if (sessionStatus === "Finished" || sessionStatus === "Finalised" || sessionStatus === "Ends") return CHEQUERED;

	const code = typeof statusCode === "string" ? parseInt(statusCode) : statusCode;
	if (code == null || Number.isNaN(code)) return null;

	return BY_CODE[code] ?? null;
};

/**
 * The session's current status. The recordings keep SessionStatus.Status at "Started" and
 * report the end in SessionData.StatusSeries, so the latest series entry wins.
 */
export const latestSessionStatus = (
	statusSeries: StatusSeries[] | undefined,
	fallback: string | undefined,
): string | undefined => {
	const series = statusSeries ? Object.values(statusSeries) : [];
	for (let i = series.length - 1; i >= 0; i--) {
		if (series[i]?.SessionStatus) return series[i].SessionStatus;
	}
	return fallback;
};
