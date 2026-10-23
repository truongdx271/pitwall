// Derived values for one row of the race classification (SPEC §3.1).

export type PositionDelta = { kind: "fl" } | { kind: "gain" | "loss"; places: number } | { kind: "none" };

/** Places gained since the grid, or FL when the driver holds the fastest lap. */
export const positionDelta = (
	gridPos: number | undefined,
	position: number | undefined,
	hasFastest: boolean,
): PositionDelta => {
	if (hasFastest) return { kind: "fl" };
	if (!gridPos || !position) return { kind: "none" };
	const change = gridPos - position;
	if (change > 0) return { kind: "gain", places: change };
	if (change < 0) return { kind: "loss", places: -change };
	return { kind: "none" };
};

/** Filled bars (0–4) of the <1S meter: one more for every quarter second under one second. */
export const proximityBars = (interval: string | undefined): number => {
	const gap = parseFloat(interval ?? "");
	if (Number.isNaN(gap) || gap >= 1 || gap < 0) return 0;
	return Math.min(4, Math.max(1, Math.ceil((1 - gap) * 4)));
};

/** Background class for one mini-sector segment status. */
export const segmentColor = (status: number): string => {
	switch (status) {
		case 2048:
		case 2052:
			return "bg-slower";
		case 2049:
			return "bg-personal-best";
		case 2051:
			return "bg-session-best";
		case 2064:
			return "bg-pit";
		default:
			return "bg-surface-3";
	}
};
