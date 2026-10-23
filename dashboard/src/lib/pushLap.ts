import { parseTimeMs } from "@/lib/timeUtils";

type SectorLike = { Value?: string; OverallFastest?: boolean };

export type PushLapDeltas = {
	/** Sectors completed on the current lap (0–3). */
	completed: number;
	/** Σ (sector − the driver's own best sector), ms; null with nothing to compare. */
	ownMs: number | null;
	/** Σ (sector − the reference driver's best sector), ms; null with nothing to compare. */
	refMs: number | null;
	/** A completed sector this lap is the session best. */
	sessionBest: boolean;
};

const ms = (value: string | undefined) => {
	const t = parseTimeMs(value ?? "");
	return Number.isFinite(t) ? t : null;
};

/**
 * Push-lap deltas (SPEC §6.3): sums over the completed sectors of the current lap only, so
 * this is a running comparison, never a lap prediction.
 */
export const pushLapDeltas = (
	sectors: SectorLike[],
	ownBest: (string | undefined)[],
	refBest: (string | undefined)[],
): PushLapDeltas => {
	let completed = 0;
	let own: number | null = null;
	let ref: number | null = null;
	let sessionBest = false;

	for (let i = 0; i < 3; i++) {
		const t = ms(sectors[i]?.Value);
		if (t == null) continue;
		completed++;
		if (sectors[i]?.OverallFastest) sessionBest = true;

		const o = ms(ownBest[i]);
		if (o != null) own = (own ?? 0) + (t - o);
		const r = ms(refBest[i]);
		if (r != null) ref = (ref ?? 0) + (t - r);
	}

	return { completed, ownMs: own, refMs: ref, sessionBest };
};

/** "−0.103" / "+0.052" in seconds. */
export const formatDelta = (deltaMs: number) => `${deltaMs < 0 ? "−" : "+"}${(Math.abs(deltaMs) / 1000).toFixed(3)}`;
