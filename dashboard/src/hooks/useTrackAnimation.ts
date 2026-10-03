"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import type { TimingDataDriver } from "@/types/state.type";

import { rotate } from "@/lib/map";
import {
	buildTrack,
	lapSeconds,
	parseLapTime,
	PIT,
	pitExitHold,
	pitSlots,
	pointAt,
	SegmentShares,
	segmentProgress,
	segmentState,
	step,
	type CarProgress,
	type Point,
} from "@/lib/trackProgress";

type Options = {
	enabled: boolean;
	trackPoints: Point[] | null;
	timingLines: Record<string, TimingDataDriver> | undefined;
	rotation: number;
	centerX: number | null;
	centerY: number | null;
	carRadius: number;
	// Pit cars are drawn at this fraction of a running car's size.
	pitScale: number;
	// Racing numbers in garage order; each car parks in its own fixed pit slot.
	garages: string[];
	// Session-best time per sector, used to size segments until whole laps have been timed.
	sectorSeconds: (number | null)[];
	// localStorage key for learned segment shares, so they carry across reloads and
	// sessions of the weekend (learned in practice, used in qualifying and the race).
	storageKey: string | null;
};

const SAVE_INTERVAL_MS = 5_000;

function loadShares(key: string | null): SegmentShares {
	if (!key) return new SegmentShares();
	try {
		return SegmentShares.restore(JSON.parse(localStorage.getItem(key) ?? "null"));
	} catch {
		return new SegmentShares();
	}
}

function saveShares(key: string | null, shares: SegmentShares) {
	if (!key) return;
	try {
		localStorage.setItem(key, JSON.stringify(shares.snapshot()));
	} catch {
		// Storage full or blocked: learning still works for this page.
	}
}

// Drives estimated car dots along the track outline with requestAnimationFrame,
// writing transforms straight to the DOM so React doesn't re-render every frame.
export function useTrackAnimation({
	enabled,
	trackPoints,
	timingLines,
	rotation,
	centerX,
	centerY,
	carRadius,
	pitScale,
	garages,
	sectorSeconds,
	storageKey,
}: Options) {
	const track = useMemo(() => (trackPoints && trackPoints.length > 1 ? buildTrack(trackPoints) : null), [trackPoints]);

	const nodes = useRef(new Map<string, SVGGElement>());
	const progress = useRef(new Map<string, CarProgress>());
	const shares = useRef(new SegmentShares());
	// Each car keeps one set of segment boundaries per lap so learning never shifts it mid-lap.
	const lapBoundaries = useRef(new Map<string, number[]>());
	// Cars in or just out of the pits, until the feed stops showing their in-lap segments.
	const pitStale = useRef(new Map<string, number>());
	const timingRef = useRef(timingLines);
	const sectorRef = useRef(sectorSeconds);

	useEffect(() => {
		timingRef.current = timingLines;
	}, [timingLines]);

	useEffect(() => {
		sectorRef.current = sectorSeconds;
	}, [sectorSeconds]);

	useEffect(() => {
		progress.current.clear();
		pitStale.current.clear();
		shares.current = loadShares(storageKey);
		lapBoundaries.current.clear();
	}, [track, storageKey]);

	useEffect(() => {
		if (!enabled || !track || centerX === null || centerY === null) return;

		let frame = 0;
		let last = performance.now();
		// Captured so cleanup saves the instance this run learned into.
		const learning = shares.current;
		let savedVersion = learning.version;
		let savedAt = 0;

		// Tucked against the track edge; running cars on the straight may draw over them.
		const slots = pitSlots(track, garages.length, carRadius * pitScale * 2.3, carRadius);

		const tick = (t: number) => {
			const dt = Math.min((t - last) / 1000, 0.25); // background tabs return huge gaps
			last = t;
			const now = Date.now();
			const lines = timingRef.current;

			nodes.current.forEach((node, nr) => {
				const timing = lines?.[nr];

				const slot = garages.indexOf(nr);
				if (timing?.InPit && !timing.Stopped && !timing.Retired && !timing.KnockedOut && slot !== -1) {
					// Forget track progress; on pit exit the car starts from the line (see pitExitHold).
					progress.current.delete(nr);
					shares.current.reset(nr);
					lapBoundaries.current.delete(nr);
					pitStale.current.set(nr, PIT);
					const r = rotate(slots[slot].x, slots[slot].y, rotation, centerX, centerY);
					node.style.transform = `translateX(${r.x}px) translateY(${r.y}px) scale(${pitScale})`;
					node.style.visibility = "visible";
					return;
				}

				const state = timing ? segmentState(timing) : null;
				if (!timing || !state) {
					node.style.visibility = "hidden";
					return;
				}

				shares.current.observe(nr, state.completed, state.count, now, parseLapTime(timing.BestLapTime?.Value), {
					counts: state.sectorCounts,
					seconds: sectorRef.current,
				});

				let boundaries = lapBoundaries.current.get(nr);
				const atFinish = state.completed === 0 || state.completed === state.count;
				if (!boundaries || boundaries.length !== state.count + 1 || atFinish) {
					boundaries =
						shares.current.boundaries(state.count) ??
						shares.current.sectorBoundaries(state.sectorCounts, sectorRef.current);
					lapBoundaries.current.set(nr, boundaries);
				}

				const pit = pitExitHold(pitStale.current.get(nr), state.completed);
				if (pit.stale === undefined) pitStale.current.delete(nr);
				else pitStale.current.set(nr, pit.stale);

				const seg = pit.hold
					? { fraction: 0, segmentSize: boundaries[1] - boundaries[0] }
					: segmentProgress(timing, boundaries);
				if (!seg) {
					node.style.visibility = "hidden";
					return;
				}

				const moving = !timing.InPit && !timing.Stopped && !timing.Retired;
				const next = step(progress.current.get(nr), seg.fraction, seg.segmentSize, lapSeconds(timing), now, dt, moving);
				progress.current.set(nr, next);

				const p = pointAt(track, next.shown);
				const r = rotate(p.x, p.y, rotation, centerX, centerY);
				node.style.transform = `translateX(${r.x}px) translateY(${r.y}px)`;
				node.style.visibility = "visible";
			});

			if (learning.version !== savedVersion && now - savedAt > SAVE_INTERVAL_MS) {
				saveShares(storageKey, learning);
				savedVersion = learning.version;
				savedAt = now;
			}

			frame = requestAnimationFrame(tick);
		};

		frame = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(frame);
			if (learning.version !== savedVersion) saveShares(storageKey, learning);
		};
	}, [enabled, track, rotation, centerX, centerY, carRadius, pitScale, garages, storageKey]);

	// Stable per-driver ref callbacks.
	const refs = useRef(new Map<string, (node: SVGGElement | null) => void>());
	return useCallback((nr: string) => {
		let cb = refs.current.get(nr);
		if (!cb) {
			cb = (node) => {
				if (node) {
					// Hidden until the first frame places it, otherwise it flashes at the origin.
					node.style.visibility = "hidden";
					nodes.current.set(nr, node);
				} else nodes.current.delete(nr);
			};
			refs.current.set(nr, cb);
		}
		return cb;
	}, []);
}
