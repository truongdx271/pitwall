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
	timed?: boolean; // `targetAt` is a real segment crossing, not first sight or a snap
	pace?: number; // laps per second measured from recent segment crossings
};

const DEFAULT_LAP_SECONDS = 100;
// How fast the shown position closes the gap to the confirmed one (1/s).
const CATCH_UP_GAIN = 0.8;
// Beyond this gap we snap instead of animating (first frame, pit exit, glitches).
const SNAP_GAP = 0.25;
// Weight of the newest segment timing in the running pace estimate.
const PACE_SMOOTHING = 0.5;
// Segment timings implying laps outside this range are batching or glitches, not driving.
const FASTEST_LAP_SECONDS = 50;
const SLOWEST_LAP_SECONDS = 600;
// Laps within this factor of the car's best count as push laps for learning segment lengths.
const PUSH_LAP_MARGIN = 1.07;
// Segment shares average over this many laps, then keep adapting.
const LEARNED_LAPS = 20;

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

// How many mini-segments the car has completed this lap, out of how many.
export function segmentState(
	timingDriver: Pick<TimingDataDriver, "Sectors">,
): { completed: number; count: number; sectorCounts: number[] } | null {
	const sectors = toArray(timingDriver.Sectors).map((sector) => toArray(sector?.Segments));
	const segments = sectors.flat();
	if (segments.length === 0) return null;

	let furthest = -1;
	for (let i = segments.length - 1; i >= 0; i--) {
		if ((segments[i]?.Status ?? 0) > 0) {
			furthest = i;
			break;
		}
	}

	return { completed: furthest + 1, count: segments.length, sectorCounts: sectors.map((s) => s.length) };
}

// Fraction of the lap at the end of the furthest completed mini-segment, and the
// size of the segment the car is in now. Segments are equal unless `boundaries`
// (count + 1 lap fractions from 0 to 1) says where each one ends.
export function segmentProgress(
	timingDriver: Pick<TimingDataDriver, "Sectors">,
	boundaries?: number[] | null,
): { fraction: number; segmentSize: number } | null {
	const state = segmentState(timingDriver);
	if (!state) return null;
	const { completed, count } = state;

	if (boundaries?.length !== count + 1) return { fraction: completed / count, segmentSize: 1 / count };

	// After the last segment the car is on the next lap's first one.
	const next = completed === count ? boundaries[1] - boundaries[0] : boundaries[completed + 1] - boundaries[completed];
	return { fraction: boundaries[completed], segmentSize: next };
}

// Before any lap has been timed: split the lap by best sector times, and within
// each sector by `within` (that sector's segment shares, summing to 1) or evenly.
// Without usable sector times every segment is equal.
export function sectorBoundaries(
	sectorCounts: number[],
	sectorSeconds: (number | null)[],
	within: (number[] | undefined)[] = [],
): number[] {
	const count = sectorCounts.reduce((a, b) => a + b, 0);
	const usable =
		sectorSeconds.length === sectorCounts.length &&
		sectorSeconds.every((t): t is number => t !== null && Number.isFinite(t) && t > 0);
	const total = usable ? sectorSeconds.reduce<number>((a, t) => a + (t ?? 0), 0) : 0;

	const boundaries = [0];
	sectorCounts.forEach((n, k) => {
		const sector = usable ? (sectorSeconds[k] as number) / total : n / count;
		const split = within[k]?.length === n ? within[k] : undefined;
		for (let i = 0; i < n; i++)
			boundaries.push(boundaries[boundaries.length - 1] + sector * (split ? split[i] : 1 / n));
	});
	boundaries[boundaries.length - 1] = 1;
	return boundaries;
}

// Mini-segments are not equally long: one through a hairpin can take three times
// one on a straight. Learn each segment's share of a lap from push laps, where
// every segment crossing was seen one at a time.
export type SegmentSharesSnapshot = {
	mean: number[];
	laps: number;
	within: { counts: number[]; mean: (number[] | undefined)[]; runs: number[] };
};

export class SegmentShares {
	private cars = new Map<string, { completed: number; at: number | null; durations: number[] }>();
	private mean: number[] = [];
	private laps = 0;
	// Full push laps are rare early in a session (qualifying!), so also learn each
	// sector's internal split from single clean push runs through it.
	private within: { counts: number[]; mean: (number[] | undefined)[]; runs: number[] } = {
		counts: [],
		mean: [],
		runs: [],
	};
	// Bumped on every lesson, so callers know when a snapshot is worth saving.
	version = 0;

	// What has been learned, as plain JSON (no per-car state).
	snapshot(): SegmentSharesSnapshot {
		return { mean: this.mean, laps: this.laps, within: this.within };
	}

	static restore(data: unknown): SegmentShares {
		const shares = new SegmentShares();
		const d = data as Partial<SegmentSharesSnapshot> | null;
		const numbers = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === "number");
		if (!d || !numbers(d.mean) || typeof d.laps !== "number") return shares;
		shares.mean = d.mean;
		shares.laps = d.laps;
		const w = d.within;
		if (w && numbers(w.counts) && numbers(w.runs) && Array.isArray(w.mean)) {
			shares.within = { counts: w.counts, runs: w.runs, mean: w.mean.map((m) => (numbers(m) ? m : undefined)) };
		}
		return shares;
	}

	observe(
		nr: string,
		completed: number,
		count: number,
		now: number,
		bestLapSeconds: number | null,
		sectors?: { counts: number[]; seconds: (number | null)[] },
	): void {
		if (this.mean.length !== count) {
			this.mean = [];
			this.laps = 0;
		}
		if (sectors && this.within.counts.join() !== sectors.counts.join()) {
			this.within = { counts: [...sectors.counts], mean: [], runs: [] };
		}

		const car = this.cars.get(nr);
		if (!car) {
			// We don't know when the car reached this point, so nothing to time yet.
			this.cars.set(nr, { completed, at: null, durations: [] });
			return;
		}
		if (completed === car.completed) return;

		const from = car.completed === count ? 0 : car.completed;
		if (completed === 0 && car.completed === count) {
			// Segments cleared for the new lap; the finish crossing time still stands.
			car.completed = 0;
			car.durations = [];
			return;
		}

		if (completed === from + 1) {
			if (car.at !== null) car.durations[from] = (now - car.at) / 1000;
		} else if (from === 0 && completed > 1 && car.at !== null) {
			// Some circuits never report the first segment(s) after the line (Sepang skips
			// segment 0); split that gap evenly so the lap can still be learned.
			const each = (now - car.at) / 1000 / completed;
			for (let i = 0; i < completed; i++) car.durations[i] = each;
		} else {
			// Skipped or went backwards: this lap can't be timed segment by segment.
			car.durations = [];
		}
		car.at = completed > from ? now : null;
		car.completed = completed;

		if (sectors && completed > from) this.learnSector(car.durations, completed, sectors);

		if (completed === count) {
			const timed = car.durations.filter((d) => d !== undefined);
			const lap = timed.reduce((a, b) => a + b, 0);
			if (timed.length === count && bestLapSeconds && lap <= bestLapSeconds * PUSH_LAP_MARGIN)
				this.learn(car.durations, lap);
			car.durations = [];
		}
	}

	reset(nr: string): void {
		this.cars.delete(nr);
	}

	boundaries(count: number): number[] | null {
		if (this.laps === 0 || this.mean.length !== count) return null;
		const boundaries = [0];
		for (const share of this.mean) boundaries.push(boundaries[boundaries.length - 1] + share);
		boundaries[count] = 1;
		return boundaries;
	}

	// Learned splits within each sector, with the lap split by best sector times.
	sectorBoundaries(sectorCounts: number[], sectorSeconds: (number | null)[]): number[] {
		const within = this.within.counts.join() === sectorCounts.join() ? this.within.mean : [];
		return sectorBoundaries(sectorCounts, sectorSeconds, within);
	}

	// If `completed` just closed a sector whose every segment was timed at push pace, learn its split.
	private learnSector(
		durations: number[],
		completed: number,
		sectors: { counts: number[]; seconds: (number | null)[] },
	): void {
		let end = 0;
		for (let k = 0; k < sectors.counts.length; k++) {
			const start = end;
			end += sectors.counts[k];
			if (end !== completed) continue;

			// Array.from turns holes (untimed segments) into undefined so `some` sees them.
			const run = Array.from(durations.slice(start, end));
			const best = sectors.seconds[k];
			if (run.length !== sectors.counts[k] || run.some((d) => d === undefined)) return;
			const time = run.reduce((a, b) => a + b, 0);
			if (!best || time <= 0 || time > best * PUSH_LAP_MARGIN) return;

			const runs = (this.within.runs[k] ?? 0) + 1;
			this.within.runs[k] = runs;
			const weight = 1 / Math.min(runs, LEARNED_LAPS);
			const prev = this.within.mean[k];
			this.within.mean[k] = run.map((d, i) => (prev ? prev[i] + (d / time - prev[i]) * weight : d / time));
			this.version++;
			return;
		}
	}

	private learn(durations: number[], lap: number): void {
		this.laps++;
		this.version++;
		// Running mean that keeps adapting (track evolution, wind) after enough laps.
		const weight = 1 / Math.min(this.laps, LEARNED_LAPS);
		durations.forEach((d, i) => {
			const share = d / lap;
			this.mean[i] = this.mean[i] === undefined ? share : this.mean[i] + (share - this.mean[i]) * weight;
		});
	}
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
 * segment it is in; the shown position chases that at the pace measured over
 * recent segments (the lap time until one is measured) plus a proportional catch-up. It never goes backwards and never passes the
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
	if (!prev) return { shown: target, target, targetAt: now, timed: false };

	const crossed = target !== prev.target;
	const targetAt = crossed ? now : prev.targetAt;
	const gapToTarget = wrapDelta(target - frac(prev.shown));

	if (Math.abs(gapToTarget) > SNAP_GAP) {
		// Re-anchor on the same lap count so `shown` stays monotonic.
		const base = Math.floor(prev.shown);
		const shown = base + target < prev.shown ? base + 1 + target : base + target;
		return { shown, target, targetAt, timed: false, pace: prev.pace };
	}

	// Time the segment just completed, so slow out-laps and cool-down laps move at their real pace.
	let pace = prev.pace;
	if (crossed && prev.timed) {
		const measured = measuredPace(wrapDelta(target - prev.target), (now - prev.targetAt) / 1000);
		if (measured !== null) pace = pace === undefined ? measured : pace + (measured - pace) * PACE_SMOOTHING;
	}
	const timed = crossed || prev.timed;

	const confirmed = prev.shown + gapToTarget;

	if (!moving) {
		return { shown: Math.max(prev.shown, confirmed), target, targetAt, timed, pace };
	}

	const lapPace = pace ?? 1 / lapSecs;
	const elapsed = (now - targetAt) / 1000;
	const expected = confirmed + Math.min(elapsed * lapPace, segmentSize);

	const velocity = Math.max(0, lapPace + (expected - prev.shown) * CATCH_UP_GAIN);
	const next = Math.min(prev.shown + velocity * dt, confirmed + segmentSize);

	return { shown: Math.max(prev.shown, next), target, targetAt, timed, pace };
}

// Marker for a car currently in the pits (see pitExitHold).
export const PIT = -1;

// The feed reports a car leaving the pits at the pit-exit line, but keeps showing
// the segments it had (the in-lap's, often stopping short of the pit entry before
// the last corner) until the car reaches a new one. Placing the car by those would
// rewind it and race it round, so hold it at the pit exit until a new segment shows.
// `stale` is PIT while in the pits, then the segment count at exit; undefined otherwise.
export function pitExitHold(
	stale: number | undefined,
	completed: number,
): { hold: boolean; stale: number | undefined } {
	if (stale === PIT) return { hold: true, stale: completed };
	if (stale !== undefined && stale === completed) return { hold: true, stale };
	return { hold: false, stale: undefined };
}

function measuredPace(distance: number, seconds: number): number | null {
	if (distance <= 0 || seconds <= 0) return null;
	const pace = distance / seconds;
	return pace >= 1 / SLOWEST_LAP_SECONDS && pace <= 1 / FASTEST_LAP_SECONDS ? pace : null;
}

// Without positions we don't know where the pit lane is, and pit cars report
// lap progress 0, so they would all stack on the finish line. Line them up in a
// row alongside the track around the finish line instead, on whichever side has
// more room there.
export function pitSlots(track: Track, count: number, spacing: number, offset: number): Point[] {
	if (count === 0 || track.length === 0) return [];

	const beside = (fraction: number, side: number, out = offset): Point => {
		const p = pointAt(track, fraction);
		const delta = spacing / 2 / track.length;
		const a = pointAt(track, fraction - delta);
		const b = pointAt(track, fraction + delta);
		const len = dist(a, b) || 1;
		// Left normal of the driving direction, scaled to `offset`.
		return { x: p.x - ((b.y - a.y) / len) * out * side, y: p.y + ((b.x - a.x) / len) * out * side };
	};

	// Judge the side a few offsets out: right beside the track both sides look equally clear.
	const probe = offset * 4;
	const side = distanceToTrack(track, beside(0, 1, probe)) >= distanceToTrack(track, beside(0, -1, probe)) ? 1 : -1;

	// Slot 0 sits furthest back (pit entry side), the last slot furthest ahead (pit exit side).
	return Array.from({ length: count }, (_, i) => beside(((i - (count - 1) / 2) * spacing) / track.length, side));
}

function distanceToTrack(track: Track, p: Point): number {
	const { points } = track;
	let min = Infinity;
	for (let i = 0; i < points.length; i++) {
		const a = points[i];
		const b = points[(i + 1) % points.length];
		const abx = b.x - a.x;
		const aby = b.y - a.y;
		const lenSq = abx * abx + aby * aby;
		const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq));
		min = Math.min(min, dist(p, { x: a.x + abx * t, y: a.y + aby * t }));
	}
	return min;
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
