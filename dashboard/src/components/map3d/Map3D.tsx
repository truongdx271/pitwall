"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import type { Map as CircuitMap } from "@/types/map.type";
import type { TimingStats } from "@/types/state.type";

import { fetchMap } from "@/lib/fetchMap";
import { garageOrder } from "@/lib/garageOrder";
import { getTrackStatusMessage } from "@/lib/getTrackStatusMessage";
import { CAR_RADIUS, findYellowSectors, PIT_SCALE } from "@/lib/map";
import { defaultExaggeration, fetchMap3d, MAX_EXAGGERATION, sectorStarts, type Map3dData } from "@/lib/map3d";
import { buildTrack, parseLapTime, pointAt, type Point } from "@/lib/trackProgress";

import { useCarAnimation, type CarSink } from "@/hooks/useTrackAnimation";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

import ElevationStrip, { type StripCar } from "./ElevationStrip";
import { TrackScene, type View } from "./TrackScene";

const ROTATION_FIX = 90;
const VIEWS: { id: View; label: string }[] = [
	{ id: "overview", label: "Overview" },
	{ id: "low", label: "Low" },
	{ id: "top", label: "Top" },
];
const FLAG_COLOURS: Record<string, string> = {
	"stroke-amber-400": "#ffd60a",
	"stroke-red-500": "#ff3b3b",
};

type Loaded = { map: CircuitMap; data: Map3dData | null; points: Point[] };

export default function Map3D() {
	const session = useDataStore((state) => state.state?.SessionInfo);
	const circuitKey = session?.Meeting.Circuit.Key;
	const year = session?.StartDate ? new Date(session.StartDate).getFullYear() : new Date().getFullYear();
	const [loaded, setLoaded] = useState<{ id: string; value: Loaded | null } | null>(null);
	const id = `${circuitKey}-${year}`;

	useEffect(() => {
		if (!circuitKey) return;
		let cancelled = false;
		(async () => {
			const map = await fetchMap(circuitKey, year);
			const data = map ? await fetchMap3d(circuitKey, map.x.length) : null;
			if (cancelled) return;
			const value = map && {
				map,
				data,
				points: map.x.map((x, i) => ({ x, y: map.y[i], z: data?.z[i] ?? 0 })),
			};
			setLoaded({ id, value });
		})();
		return () => {
			cancelled = true;
		};
	}, [circuitKey, year, id]);

	if (!circuitKey || !loaded || loaded.id !== id) {
		return <div role="status" className="h-full min-h-40 w-full animate-pulse rounded-lg bg-surface-2" />;
	}
	if (!loaded.value) {
		return <Unavailable text="Track map unavailable for this session." />;
	}
	return <Scene key={id} loaded={loaded.value} storageKey={`segmentShares:${circuitKey}:${year}`} />;
}

function Unavailable({ text }: { text: string }) {
	const setMap3d = useSettingsStore((state) => state.setMap3d);
	return (
		<div
			role="status"
			className="flex h-full min-h-40 flex-col items-center justify-center gap-3 p-4 text-sm text-fg-2"
		>
			<p>{text}</p>
			<button
				type="button"
				onClick={() => setMap3d(false)}
				className="h-[30px] rounded-md border border-border-subtle px-2.5 text-xs text-fg-2 hover:text-fg-1"
			>
				Use the 2D map
			</button>
		</div>
	);
}

function Scene({ loaded, storageKey }: { loaded: Loaded; storageKey: string }) {
	const { map, data, points } = loaded;
	const showCornerNumbers = useSettingsStore((state) => state.showCornerNumbers);
	const favoriteDrivers = useSettingsStore((state) => state.favoriteDrivers);
	const positions = useDataStore((state) => state.positions);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const trackStatus = useDataStore((state) => state.state?.TrackStatus);
	const timingDrivers = useDataStore((state) => state.state?.TimingData);
	const timingStats = useDataStore((state) => state.state?.TimingStats);
	const messages = useDataStore((state) => state.state?.RaceControlMessages?.Messages ?? undefined);

	const stage = useRef<HTMLDivElement>(null);
	const scene = useRef<TrackScene | null>(null);
	const fractions = useRef(new Map<string, number>());
	const [failed, setFailed] = useState(false);
	const [view, setView] = useState<View | null>("overview");
	const [ready, setReady] = useState(false);

	const relief = useMemo(() => {
		const heights = points.map((p) => p.z ?? 0);
		const span = Math.max(Math.max(...map.x) - Math.min(...map.x), Math.max(...map.y) - Math.min(...map.y)) / 10;
		return { range: Math.max(...heights) - Math.min(...heights), span };
	}, [points, map]);
	const [exaggeration, setExaggeration] = useState(() => defaultExaggeration(relief.range, relief.span));

	const starts = useMemo(() => sectorStarts(map), [map]);
	const track = useMemo(() => buildTrack(points), [points]);
	const corners = useMemo(
		() =>
			map.corners.map((corner) => {
				const { x, y } = corner.trackPosition;
				let nearest = 0;
				let best = Infinity;
				map.x.forEach((px, i) => {
					const d = Math.hypot(px - x, map.y[i] - y);
					if (d < best) {
						best = d;
						nearest = i;
					}
				});
				return {
					number: corner.number,
					x,
					y,
					angle: corner.angle,
					z: points[nearest].z ?? 0,
					fraction: track.cumulative[nearest] / track.length,
				};
			}),
		[map, points, track],
	);

	useEffect(() => {
		if (!stage.current) return;
		let instance: TrackScene;
		try {
			instance = new TrackScene(
				stage.current,
				{
					x: map.x,
					y: map.y,
					z: points.map((p) => p.z ?? 0),
					rotation: map.rotation + ROTATION_FIX,
					pit: data?.pit ?? null,
					sectorStarts: starts,
					corners,
				},
				setView,
			);
		} catch {
			// The effect only runs once per mount; WebGL's absence is known only here.
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setFailed(true);
			return;
		}
		scene.current = instance;
		setReady(true);
		return () => {
			scene.current = null;
			setReady(false);
			instance.dispose();
		};
	}, [map, data, points, starts, corners]);

	useEffect(() => {
		scene.current?.setExaggeration(exaggeration);
	}, [exaggeration, ready]);

	useEffect(() => {
		scene.current?.setCornersVisible(showCornerNumbers);
	}, [showCornerNumbers, ready]);

	// Marshal sector flags, same rules as the 2D map.
	const yellowSectors = useMemo(() => findYellowSectors(messages), [messages]);
	useEffect(() => {
		const status = getTrackStatusMessage(trackStatus?.Status ? parseInt(trackStatus.Status) : undefined);
		const colour = status ? (FLAG_COLOURS[status.trackColor] ?? null) : null;
		scene.current?.setSectorColours((index) => {
			if (!colour) return null;
			if (!status?.bySector) return colour;
			return yellowSectors.has(index + 1) ? colour : null;
		});
	}, [trackStatus, yellowSectors, ready]);

	// Car identity and label order.
	useEffect(() => {
		if (!ready || !scene.current || !drivers) return;
		for (const driver of Object.values(drivers)) {
			scene.current.setCar(driver.RacingNumber, {
				tla: driver.Tla,
				colour: driver.TeamColour,
				followed: favoriteDrivers.includes(driver.RacingNumber),
			});
		}
		const lines = timingDrivers?.Lines;
		scene.current.setOrder(
			Object.keys(drivers).sort((a, b) => position(lines?.[a]?.Position) - position(lines?.[b]?.Position)),
		);
	}, [drivers, favoriteDrivers, timingDrivers, ready]);

	const estimated = !positions;
	const sectorSeconds = useMemo(() => sessionBestSectors(timingStats), [timingStats]);
	const garages = useMemo(() => garageOrder(drivers ? Object.values(drivers) : []), [drivers]);
	const driverNumbers = useMemo(() => (drivers ? Object.keys(drivers) : []), [drivers]);
	const lines = timingDrivers?.Lines;
	const linesRef = useRef(lines);
	useEffect(() => {
		linesRef.current = lines;
	}, [lines]);

	const sink = useMemo<CarSink>(
		() => ({
			cars: () => driverNumbers,
			place: (nr, placement) => {
				const line = linesRef.current?.[nr];
				const gone = line && (line.KnockedOut || line.Stopped || line.Retired);
				if (!placement || gone) {
					scene.current?.hideCar(nr);
					fractions.current.delete(nr);
					return;
				}
				const { point, fraction } = placement;
				scene.current?.placeCar(nr, point.x, point.y, point.z ?? 0, fraction === null);
				if (fraction === null) fractions.current.delete(nr);
				else fractions.current.set(nr, fraction);
			},
		}),
		[driverNumbers],
	);

	useCarAnimation(
		{
			enabled: estimated && ready,
			trackPoints: points,
			timingLines: timingDrivers?.Lines,
			carRadius: CAR_RADIUS,
			pitScale: PIT_SCALE,
			garages,
			sectorSeconds,
			storageKey,
			pitExit: map.pitExit ?? 0,
			pitSide: map.pitSide,
		},
		sink,
	);

	// Real positions, when the feed has them (recordings, or an F1TV token one day).
	useEffect(() => {
		if (!positions || !ready || !scene.current) return;
		for (const [nr, car] of Object.entries(positions)) {
			const line = lines?.[nr];
			if (line?.KnockedOut || line?.Stopped || line?.Retired) {
				scene.current.hideCar(nr);
				fractions.current.delete(nr);
				continue;
			}
			const fraction = nearestFraction(points, track, car.X, car.Y);
			const z = pointAt(track, fraction).z ?? 0;
			scene.current.placeCar(nr, car.X, car.Y, z, !!line?.InPit, true);
			if (line?.InPit) fractions.current.delete(nr);
			else fractions.current.set(nr, fraction);
		}
	}, [positions, lines, ready, points, track]);

	const profile = useMemo<[number, number][]>(
		() => points.map((p, i) => [track.cumulative[i] / track.length, p.z ?? 0]),
		[points, track],
	);
	const getCars = useCallback((): StripCar[] => {
		const out: StripCar[] = [];
		fractions.current.forEach((fraction, nr) => out.push({ fraction, colour: drivers?.[nr]?.TeamColour }));
		return out;
	}, [drivers]);

	if (failed) return <Unavailable text="This browser could not start WebGL, so the 3D map cannot be drawn." />;

	return (
		<div className="flex h-full min-h-[420px] w-full flex-col">
			<div
				ref={stage}
				className="relative min-h-0 flex-1 overflow-hidden rounded-lg"
				aria-label="3D circuit map. Drag to rotate, scroll to zoom."
				role="img"
			/>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border py-2 text-xs text-fg-2">
				<div role="group" aria-label="Camera view" className="flex gap-0.5 rounded-control bg-bg p-0.5">
					{VIEWS.map(({ id, label }) => (
						<button
							key={id}
							type="button"
							aria-pressed={view === id}
							onClick={() => {
								setView(id);
								scene.current?.setView(id);
							}}
							className={clsx(
								"h-[26px] cursor-pointer rounded-md px-2.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fg-1",
								view === id ? "bg-surface-3 text-fg-1" : "text-fg-2 hover:text-fg-1",
							)}
						>
							{label}
						</button>
					))}
				</div>
				{data && relief.range > 0 ? (
					<label className="flex items-center gap-2">
						Height
						<input
							type="range"
							min={1}
							max={MAX_EXAGGERATION}
							step={0.5}
							value={exaggeration}
							onChange={(e) => setExaggeration(Number(e.target.value))}
							className="w-24 accent-fg-2"
						/>
						<output className="font-mono text-fg-1">{exaggeration}×</output>
					</label>
				) : (
					<span className="text-fg-3">No height data for this circuit yet</span>
				)}
				{data?.pit && (
					<span className="flex items-center gap-1.5 text-fg-3">
						<i aria-hidden="true" className="h-0.5 w-4 rounded-full bg-pit" />
						Pit lane
					</span>
				)}
			</div>
			{data && relief.range > 0 && <ElevationStrip profile={profile} corners={corners} getCars={getCars} />}
		</div>
	);
}

// Unknown positions sort last.
const position = (value: string | undefined) => {
	const n = parseInt(value ?? "");
	return Number.isFinite(n) ? n : 99;
};

function nearestFraction(points: Point[], track: ReturnType<typeof buildTrack>, x: number, y: number) {
	let nearest = 0;
	let best = Infinity;
	points.forEach((p, i) => {
		const d = (p.x - x) ** 2 + (p.y - y) ** 2;
		if (d < best) {
			best = d;
			nearest = i;
		}
	});
	return track.cumulative[nearest] / track.length;
}

function sessionBestSectors(stats: TimingStats | undefined): (number | null)[] {
	const best: (number | null)[] = [];
	for (const line of Object.values(stats?.Lines ?? {})) {
		Object.values(line.BestSectors ?? {}).forEach((sector, k) => {
			const t = parseLapTime(sector?.Value);
			if (t !== null && (best[k] == null || t < (best[k] as number))) best[k] = t;
		});
	}
	return best;
}
