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
	type PitSide,
	type Point,
} from "@/lib/trackProgress";

type Shared = {
	enabled: boolean;
	trackPoints: Point[] | null;
	timingLines: Record<string, TimingDataDriver> | undefined;
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
	// Lap fraction where the feed reports cars leaving the pits; 0 (the line) if unknown.
	pitExit: number;
	pitSide: PitSide | undefined;
};

// Where a car goes this frame, in feed coordinates. `fraction` is its lap position, null in its pit slot.
export type CarPlacement = { point: Point; fraction: number | null };

// What the animation draws on: the 2D map's SVG or the 3D scene.
export type CarSink = {
	cars: () => string[];
	place: (racingNumber: string, placement: CarPlacement | null) => void;
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

// Moves estimated cars along the track outline with requestAnimationFrame and hands each
// frame's positions to `sink`, so React doesn't re-render every frame.
export function useCarAnimation(
	{
		enabled,
		trackPoints,
		timingLines,
		carRadius,
		pitScale,
		garages,
		sectorSeconds,
		storageKey,
		pitExit,
		pitSide,
	}: Shared,
	sink: CarSink,
) {
	const track = useMemo(() => (trackPoints && trackPoints.length > 1 ? buildTrack(trackPoints) : null), [trackPoints]);

	const sinkRef = useRef(sink);
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
		sinkRef.current = sink;
	}, [sink]);

	useEffect(() => {
		progress.current.clear();
		pitStale.current.clear();
		shares.current = loadShares(storageKey);
		lapBoundaries.current.clear();
	}, [track, storageKey]);

	useEffect(() => {
		if (!enabled || !track) return;

		let frame = 0;
		let last = performance.now();
		// Captured so cleanup saves the instance this run learned into.
		const learning = shares.current;
		let savedVersion = learning.version;
		let savedAt = 0;

		// Tucked against the track edge; running cars on the straight may draw over them.
		// Neighbours overlap by ~40% so the row stays near the pit straight instead of spilling past it.
		const slots = pitSlots(track, garages.length, carRadius * pitScale * 1.2, carRadius, pitSide);

		const tick = (t: number) => {
			const dt = Math.min((t - last) / 1000, 0.25); // background tabs return huge gaps
			last = t;
			const now = Date.now();
			const lines = timingRef.current;

			for (const nr of sinkRef.current.cars()) {
				const place = (placement: CarPlacement | null) => sinkRef.current.place(nr, placement);
				const timing = lines?.[nr];

				const slot = garages.indexOf(nr);
				if (timing?.InPit && !timing.Stopped && !timing.Retired && !timing.KnockedOut && slot !== -1) {
					// Forget track progress; on pit exit the car starts from the line (see pitExitHold).
					progress.current.delete(nr);
					shares.current.reset(nr);
					lapBoundaries.current.delete(nr);
					pitStale.current.set(nr, PIT);
					place({ point: slots[slot], fraction: null });
					continue;
				}

				const state = timing ? segmentState(timing) : null;
				if (!timing || !state) {
					place(null);
					continue;
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

				// Held at a known pit exit the car waits there (it's merging); at the line it may creep.
				const seg = pit.hold
					? { fraction: pitExit, segmentSize: pitExit > 0 ? 0 : boundaries[1] - boundaries[0] }
					: segmentProgress(timing, boundaries);
				if (!seg) {
					place(null);
					continue;
				}

				const moving = !timing.InPit && !timing.Stopped && !timing.Retired;
				const next = step(progress.current.get(nr), seg.fraction, seg.segmentSize, lapSeconds(timing), now, dt, moving);
				progress.current.set(nr, next);

				place({ point: pointAt(track, next.shown), fraction: next.shown % 1 });
			}

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
	}, [enabled, track, carRadius, pitScale, garages, storageKey, pitExit, pitSide]);
}

type Options = Shared & {
	rotation: number;
	centerX: number | null;
	centerY: number | null;
};

// The 2D map: writes each car's transform straight to its SVG group.
export function useTrackAnimation({ rotation, centerX, centerY, ...shared }: Options) {
	const nodes = useRef(new Map<string, SVGGElement>());

	const sink = useMemo<CarSink>(
		() => ({
			cars: () => Array.from(nodes.current.keys()),
			place: (nr, placement) => {
				const node = nodes.current.get(nr);
				if (!node || centerX === null || centerY === null) return;
				if (!placement) {
					node.style.visibility = "hidden";
					return;
				}
				const r = rotate(placement.point.x, placement.point.y, rotation, centerX, centerY);
				const scale = placement.fraction === null ? ` scale(${shared.pitScale})` : "";
				node.style.transform = `translateX(${r.x}px) translateY(${r.y}px)${scale}`;
				node.style.visibility = "visible";
			},
		}),
		[rotation, centerX, centerY, shared.pitScale],
	);

	useCarAnimation(shared, sink);

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
