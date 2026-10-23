type Entry = { CurrentPosition: number; PredictedPosition: number; CurrentPoints: number; PredictedPoints: number };

export type StandingsMode = "live" | "before";

export type StandingsRow<T> = {
	entry: T;
	position: number;
	points: number;
	/** Places moved since before the race (positive = up); 0 before the race. */
	moved: number;
	/** Points behind the leader (0 for the leader). */
	gap: number;
	/** Points scored in this session; 0 before the race. */
	race: number;
	/** Row fill (SPEC §10): points before the race and in total, as % of the leader's points. */
	basePct: number;
	totalPct: number;
};

/**
 * Rows of a standings table, sorted, with the "fill" bar shares. Live projection uses the
 * predicted points (the darker segment is what this race adds); Before this race uses the
 * points before it, with no race segment.
 */
export const standingsRows = <T extends Entry>(entries: T[], mode: StandingsMode): StandingsRow<T>[] => {
	const live = mode === "live";
	const rows = entries
		.map((entry) => ({
			entry,
			position: live ? entry.PredictedPosition : entry.CurrentPosition,
			points: live ? entry.PredictedPoints : entry.CurrentPoints,
		}))
		.sort((a, b) => a.position - b.position);

	const leader = Math.max(1, rows[0]?.points ?? 1);

	return rows.map(({ entry, position, points }) => {
		const race = live ? Math.max(0, entry.PredictedPoints - entry.CurrentPoints) : 0;
		return {
			entry,
			position,
			points,
			moved: live ? entry.CurrentPosition - entry.PredictedPosition : 0,
			gap: (rows[0]?.points ?? 0) - points,
			race,
			basePct: (Math.min(points, entry.CurrentPoints) / leader) * 100,
			totalPct: (points / leader) * 100,
		};
	});
};

/** The row background: team colour at 16% up to base, 38% up to total, then the row colour. */
export const fillBackground = (hex: string | undefined, basePct: number, totalPct: number, rowBg: string) => {
	const rgb =
		hex && /^[0-9a-f]{6}$/i.test(hex)
			? hex
					.match(/../g)!
					.map((h) => parseInt(h, 16))
					.join(" ")
			: "127 127 127";
	const b = basePct.toFixed(2);
	const t = totalPct.toFixed(2);
	return `linear-gradient(90deg, rgb(${rgb} / 0.16) 0 ${b}%, rgb(${rgb} / 0.38) ${b}% ${t}%, transparent ${t}% 100%), ${rowBg}`;
};
