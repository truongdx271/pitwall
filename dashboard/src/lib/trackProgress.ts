import type { TimingDataDriver } from "@/types/state.type";

// Without Position.z we only know which mini-segment a car last completed.
// These helpers turn that into a fraction of the lap and move a displayed
// fraction smoothly along the track outline between segment updates.

export type Point = { x: number; y: number };

export type Track = {
	points: Point[];
	cumulative: number[]; // distance from points[0] to points[i]
	length: number; // closed loop, includes the last -> first edge
};

export type CarProgress = {
	shown: number; // unwrapped: laps + fraction, only ever increases
	target: number; // fraction of the lap at the last confirmed segment
	targetAt: number; // ms timestamp when `target` last changed
};

const DEFAULT_LAP_SECONDS = 100;
// How fast the shown position closes the gap to the confirmed one (1/s).
const CATCH_UP_GAIN = 0.8;
// Beyond this gap we snap instead of animating (first frame, pit exit, glitches).
const SNAP_GAP = 0.25;

export function buildTrack(points: Point[]): Track {
	const cumulative = [0];
	for (let i = 1; i < points.length; i++) {
		cumulative.push(cumulative[i - 1] + dist(points[i - 1], points[i]));
	}
	const closing = points.length > 1 ? dist(points[points.length - 1], points[0]) : 0;
	return { points, cumulative, length: cumulative[cumulative.length - 1] + closing };
}

export function pointAt(track: Track, fraction: number): Point {
	const { points, cumulative, length } = track;
	if (points.length === 0) return { x: 0, y: 0 };
	if (points.length === 1 || length === 0) return points[0];

	const d = frac(fraction) * length;

	// Last edge closes the loop back to points[0].
	const last = points.length - 1;
	if (d >= cumulative[last]) {
		return lerp(points[last], points[0], (d - cumulative[last]) / (length - cumulative[last] || 1));
	}

	let lo = 0;
	let hi = last;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if (cumulative[mid] <= d) lo = mid;
		else hi = mid;
	}
	const edge = cumulative[hi] - cumulative[lo];
	return lerp(points[lo], points[hi], edge === 0 ? 0 : (d - cumulative[lo]) / edge);
}

// Fraction of the lap at the end of the furthest completed mini-segment.
export function segmentProgress(
	timingDriver: Pick<TimingDataDriver, "Sectors">,
): { fraction: number; segmentSize: number } | null {
	const segments = toArray(timingDriver.Sectors).flatMap((sector) => toArray(sector?.Segments));
	if (segments.length === 0) return null;

	let furthest = -1;
	for (let i = segments.length - 1; i >= 0; i--) {
		if ((segments[i]?.Status ?? 0) > 0) {
			furthest = i;
			break;
		}
	}

	return { fraction: (furthest + 1) / segments.length, segmentSize: 1 / segments.length };
}

export function parseLapTime(value: string | undefined): number | null {
	if (!value) return null;
	const parts = value.split(":").map(Number);
	if (parts.some((p) => Number.isNaN(p))) return null;
	const seconds = parts.reduce((acc, p) => acc * 60 + p, 0);
	return seconds > 0 ? seconds : null;
}

// Pick a plausible lap time for extrapolating between segment updates.
export function lapSeconds(timingDriver: Pick<TimingDataDriver, "LastLapTime" | "BestLapTime">): number {
	const best = parseLapTime(timingDriver.BestLapTime?.Value);
	const last = parseLapTime(timingDriver.LastLapTime?.Value);
	// Slow laps (cool-down, out-laps) make the dot crawl; clamp to a sane range around the best.
	const candidate = last && best ? Math.min(last, best * 1.3) : (last ?? best);
	return candidate ?? DEFAULT_LAP_SECONDS;
}

/**
 * Advance the shown position to time `now` (ms), `dt` seconds after the previous frame.
 * The car is expected at `target + elapsed * pace`, capped at the end of the
 * segment it is in; the shown position chases that at race pace plus a
 * proportional catch-up. It never goes backwards and never passes the
 * end of the current segment.
 */
export function step(
	prev: CarProgress | undefined,
	target: number,
	segmentSize: number,
	lapSecs: number,
	now: number,
	dt: number,
	moving: boolean,
): CarProgress {
	if (!prev) return { shown: target, target, targetAt: now };

	const targetAt = target === prev.target ? prev.targetAt : now;
	const gapToTarget = wrapDelta(target - frac(prev.shown));

	if (Math.abs(gapToTarget) > SNAP_GAP) {
		// Re-anchor on the same lap count so `shown` stays monotonic.
		const base = Math.floor(prev.shown);
		const shown = base + target < prev.shown ? base + 1 + target : base + target;
		return { shown, target, targetAt };
	}

	const confirmed = prev.shown + gapToTarget;

	if (!moving) {
		return { shown: Math.max(prev.shown, confirmed), target, targetAt };
	}

	const pace = 1 / lapSecs;
	const elapsed = (now - targetAt) / 1000;
	const expected = confirmed + Math.min(elapsed * pace, segmentSize);

	const velocity = Math.max(0, pace + (expected - prev.shown) * CATCH_UP_GAIN);
	const next = Math.min(prev.shown + velocity * dt, confirmed + segmentSize);

	return { shown: Math.max(prev.shown, next), target, targetAt };
}

// Signed shortest distance on a unit circle, in (-0.5, 0.5].
export function wrapDelta(d: number): number {
	const w = frac(d + 0.5) - 0.5;
	return w === -0.5 ? 0.5 : w;
}

function frac(v: number): number {
	return v - Math.floor(v);
}

function dist(a: Point, b: Point): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

function lerp(a: Point, b: Point, t: number): Point {
	return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// The live feed sometimes delivers arrays as {"0": …, "1": …} objects.
function toArray<T>(v: T[] | Record<string, T> | undefined): T[] {
	if (!v) return [];
	if (Array.isArray(v)) return v;
	return Object.keys(v)
		.sort((a, b) => Number(a) - Number(b))
		.map((k) => v[k]);
}
