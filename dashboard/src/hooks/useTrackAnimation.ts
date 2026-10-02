"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import type { TimingDataDriver } from "@/types/state.type";

import { rotate } from "@/lib/map";
import {
	buildTrack,
	lapSeconds,
	parseLapTime,
	pitSlots,
	pointAt,
	SegmentShares,
	sectorBoundaries,
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
};

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
}: Options) {
	const track = useMemo(() => (trackPoints && trackPoints.length > 1 ? buildTrack(trackPoints) : null), [trackPoints]);

	const nodes = useRef(new Map<string, SVGGElement>());
	const progress = useRef(new Map<string, CarProgress>());
	const shares = useRef(new SegmentShares());
	// Each car keeps one set of segment boundaries per lap so learning never shifts it mid-lap.
	const lapBoundaries = useRef(new Map<string, number[]>());
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
		shares.current = new SegmentShares();
		lapBoundaries.current.clear();
	}, [track]);

	useEffect(() => {
		if (!enabled || !track || centerX === null || centerY === null) return;

		let frame = 0;
		let last = performance.now();

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
					// Forget track progress so the car snaps to its segment on pit exit.
					progress.current.delete(nr);
					shares.current.reset(nr);
					lapBoundaries.current.delete(nr);
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

				shares.current.observe(nr, state.completed, state.count, now, parseLapTime(timing.BestLapTime?.Value));

				let boundaries = lapBoundaries.current.get(nr);
				const atFinish = state.completed === 0 || state.completed === state.count;
				if (!boundaries || boundaries.length !== state.count + 1 || atFinish) {
					boundaries =
						shares.current.boundaries(state.count) ?? sectorBoundaries(state.sectorCounts, sectorRef.current);
					lapBoundaries.current.set(nr, boundaries);
				}

				const seg = segmentProgress(timing, boundaries);
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

			frame = requestAnimationFrame(tick);
		};

		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [enabled, track, rotation, centerX, centerY, carRadius, pitScale, garages]);

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
