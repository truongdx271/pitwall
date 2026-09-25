"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import type { TimingDataDriver } from "@/types/state.type";

import { rotate } from "@/lib/map";
import {
	buildTrack,
	lapSeconds,
	pointAt,
	segmentProgress,
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
};

// Drives estimated car dots along the track outline with requestAnimationFrame,
// writing transforms straight to the DOM so React doesn't re-render every frame.
export function useTrackAnimation({ enabled, trackPoints, timingLines, rotation, centerX, centerY }: Options) {
	const track = useMemo(() => (trackPoints && trackPoints.length > 1 ? buildTrack(trackPoints) : null), [trackPoints]);

	const nodes = useRef(new Map<string, SVGGElement>());
	const progress = useRef(new Map<string, CarProgress>());
	const timingRef = useRef(timingLines);

	useEffect(() => {
		timingRef.current = timingLines;
	}, [timingLines]);

	useEffect(() => {
		progress.current.clear();
	}, [track]);

	useEffect(() => {
		if (!enabled || !track || centerX === null || centerY === null) return;

		let frame = 0;
		let last = performance.now();

		const tick = (t: number) => {
			const dt = Math.min((t - last) / 1000, 0.25); // background tabs return huge gaps
			last = t;
			const now = Date.now();
			const lines = timingRef.current;

			nodes.current.forEach((node, nr) => {
				const timing = lines?.[nr];
				const seg = timing ? segmentProgress(timing) : null;
				if (!timing || !seg) {
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
	}, [enabled, track, rotation, centerX, centerY]);

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
