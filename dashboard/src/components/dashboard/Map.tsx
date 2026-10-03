import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import type { PositionCar, TimingStats } from "@/types/state.type";
import type { TrackPosition } from "@/types/map.type";

import { fetchMap } from "@/lib/fetchMap";
import { garageOrder } from "@/lib/garageOrder";
import { parseLapTime } from "@/lib/trackProgress";
import { textOn } from "@/lib/color";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useTrackAnimation } from "@/hooks/useTrackAnimation";
import { getTrackStatusMessage } from "@/lib/getTrackStatusMessage";
import {
	createSectors,
	findYellowSectors,
	getSectorColor,
	type MapSector,
	prioritizeColoredSectors,
	rad,
	rotate,
} from "@/lib/map";

// This is basically fearlessly copied from
// https://github.com/tdjsnelling/monaco

// Padding around the track so corner badges on the outside are not clipped.
const SPACE = 800;
const ROTATION_FIX = 90;

// In map units, sized against the 300-wide track outline.
const FINISH_LINE_WIDTH = 300;
const CORNER_LABEL_OFFSET = 480;
const CORNER_RADIUS = 210;
const CAR_RADIUS = 340;
// Pit cars shrink so they can sit right beside the main straight.
const PIT_SCALE = 0.3;

type Corner = {
	number: number;
	pos: TrackPosition;
	labelPos: TrackPosition;
};

type Props = {
	filter?: string[];
};

export default function Map({ filter }: Props) {
	const session = useDataStore((state) => state.state?.SessionInfo);
	const circuitKey = session?.Meeting.Circuit.Key;
	const year = session?.StartDate ? new Date(session.StartDate).getFullYear() : new Date().getFullYear();
	return <CircuitMap key={`${circuitKey}-${year}`} filter={filter} circuitKey={circuitKey} year={year} />;
}

function CircuitMap({ filter, circuitKey, year }: Props & { circuitKey?: number; year: number }) {
	const showCornerNumbers = useSettingsStore((state) => state.showCornerNumbers);
	const favoriteDrivers = useSettingsStore((state) => state.favoriteDrivers);

	const positions = useDataStore((state) => state.positions);
	const drivers = useDataStore((state) => state?.state?.DriverList);
	const trackStatus = useDataStore((state) => state?.state?.TrackStatus);
	const timingDrivers = useDataStore((state) => state?.state?.TimingData);
	const timingStats = useDataStore((state) => state?.state?.TimingStats);
	const raceControlMessages = useDataStore((state) => state?.state?.RaceControlMessages?.Messages ?? undefined);
	const [unavailable, setUnavailable] = useState(false);
	const [attempt, setAttempt] = useState(0);

	const [[minX, minY, widthX, widthY], setBounds] = useState<(null | number)[]>([null, null, null, null]);
	const [[centerX, centerY], setCenter] = useState<(null | number)[]>([null, null]);

	const [points, setPoints] = useState<null | { x: number; y: number }[]>(null);
	const [sectors, setSectors] = useState<MapSector[]>([]);
	const [corners, setCorners] = useState<Corner[]>([]);
	const [outlineOnly, setOutlineOnly] = useState(false);
	const [rotation, setRotation] = useState<number>(0);
	const [finishLine, setFinishLine] = useState<null | { x: number; y: number; startAngle: number }>(null);
	const [pitExit, setPitExit] = useState(0);
	const [originalTrackPoints, setOriginalTrackPoints] = useState<null | { x: number; y: number }[]>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (!circuitKey) return;
			const mapJson = await fetchMap(circuitKey, year);
			if (cancelled) return;
			if (!mapJson) {
				setUnavailable(true);
				return;
			}

			const centerX = (Math.max(...mapJson.x) - Math.min(...mapJson.x)) / 2;
			const centerY = (Math.max(...mapJson.y) - Math.min(...mapJson.y)) / 2;

			const fixedRotation = mapJson.rotation + ROTATION_FIX;

			const sectors = createSectors(mapJson).map((s) => ({
				...s,
				start: rotate(s.start.x, s.start.y, fixedRotation, centerX, centerY),
				end: rotate(s.end.x, s.end.y, fixedRotation, centerX, centerY),
				points: s.points.map((p) => rotate(p.x, p.y, fixedRotation, centerX, centerY)),
			}));

			const cornerPositions: Corner[] = mapJson.corners.map((corner) => ({
				number: corner.number,
				pos: rotate(corner.trackPosition.x, corner.trackPosition.y, fixedRotation, centerX, centerY),
				labelPos: rotate(
					corner.trackPosition.x + CORNER_LABEL_OFFSET * Math.cos(rad(corner.angle)),
					corner.trackPosition.y + CORNER_LABEL_OFFSET * Math.sin(rad(corner.angle)),
					fixedRotation,
					centerX,
					centerY,
				),
			}));

			const rotatedPoints = mapJson.x.map((x, index) => rotate(x, mapJson.y[index], fixedRotation, centerX, centerY));

			const pointsX = rotatedPoints.map((item) => item.x);
			const pointsY = rotatedPoints.map((item) => item.y);

			const cMinX = Math.min(...pointsX) - SPACE;
			const cMinY = Math.min(...pointsY) - SPACE;
			const cWidthX = Math.max(...pointsX) - cMinX + SPACE * 2;
			const cWidthY = Math.max(...pointsY) - cMinY + SPACE * 2;

			const rotatedFinishLine = rotate(mapJson.x[0], mapJson.y[0], fixedRotation, centerX, centerY);

			const dx = rotatedPoints[3].x - rotatedPoints[0].x;
			const dy = rotatedPoints[3].y - rotatedPoints[0].y;
			const startAngle = Math.atan2(dy, dx) * (180 / Math.PI);

			// Store original track points for position calculation
			const originalPoints = mapJson.x.map((x, index) => ({ x, y: mapJson.y[index] }));

			setOutlineOnly(mapJson.outlineOnly ?? false);
			setPitExit(mapJson.pitExit ?? 0);
			setCenter([centerX, centerY]);
			setBounds([cMinX, cMinY, cWidthX, cWidthY]);
			setSectors(sectors);
			setPoints(rotatedPoints);
			setRotation(fixedRotation);
			setCorners(cornerPositions);
			setFinishLine({ x: rotatedFinishLine.x, y: rotatedFinishLine.y, startAngle });
			setOriginalTrackPoints(originalPoints);
		})();
		return () => {
			cancelled = true;
		};
	}, [circuitKey, year, attempt]);

	const yellowSectors = useMemo(() => findYellowSectors(raceControlMessages), [raceControlMessages]);

	const renderedSectors = useMemo(() => {
		const status = getTrackStatusMessage(trackStatus?.Status ? parseInt(trackStatus.Status) : undefined);

		return sectors
			.map((sector) => {
				const color = getSectorColor(sector, status?.bySector, status?.trackColor, yellowSectors);
				return {
					color,
					pulse: status?.pulse,
					number: sector.number,
					strokeWidth: color === "stroke-white" ? 60 : 120,
					d: `M${sector.points[0].x},${sector.points[0].y} ${sector.points.map((point) => `L${point.x},${point.y}`).join(" ")}`,
				};
			})
			.sort(prioritizeColoredSectors);
	}, [trackStatus, sectors, yellowSectors]);

	// No Position.z (F1 now withholds it from unauthenticated clients): animate estimated positions.
	const estimated = !positions;
	const sectorSeconds = useMemo(() => sessionBestSectors(timingStats), [timingStats]);
	const garages = useMemo(() => garageOrder(drivers ? Object.values(drivers) : []), [drivers]);
	const carRef = useTrackAnimation({
		enabled: estimated,
		trackPoints: originalTrackPoints,
		timingLines: timingDrivers?.Lines,
		rotation,
		centerX,
		centerY,
		carRadius: CAR_RADIUS,
		pitScale: PIT_SCALE,
		garages,
		sectorSeconds,
		storageKey: `segmentShares:${circuitKey}:${year}`,
		pitExit,
	});

	if (unavailable || !circuitKey) {
		return (
			<div
				role="status"
				className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-4 font-mono text-sm text-zinc-400"
			>
				<p>{!circuitKey ? "Waiting for circuit information…" : "Track map unavailable for this session."}</p>
				{circuitKey && (
					<>
						<p className="text-xs text-zinc-500">The map provider has not supplied a usable circuit layout.</p>
						<button
							type="button"
							className="border border-zinc-700 px-3 py-1 hover:text-white"
							onClick={() => {
								setUnavailable(false);
								setAttempt((value) => value + 1);
							}}
						>
							Retry map
						</button>
					</>
				)}
			</div>
		);
	}

	if (!points || minX === null || minY === null || !widthX || !widthY) {
		return (
			<div className="h-full w-full p-2" style={{ minHeight: "35rem" }}>
				<div className="h-full w-full animate-pulse rounded-lg bg-zinc-800" />
			</div>
		);
	}

	return (
		<div className="relative h-full w-full">
			{outlineOnly && (
				<p className="absolute top-1 left-2 text-[10px] text-zinc-500">
					Approximate track outline · sector flags unavailable{!positions && " · positions estimated"}
				</p>
			)}
			<svg
				aria-label="Live circuit map"
				viewBox={`${minX} ${minY} ${widthX} ${widthY}`}
				className="h-full w-full xl:max-h-screen"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					className="stroke-gray-800"
					strokeWidth={300}
					strokeLinejoin="round"
					fill="transparent"
					d={`M${points[0].x},${points[0].y} ${points.map((point) => `L${point.x},${point.y}`).join(" ")}`}
				/>

				{renderedSectors.map((sector) => {
					const style = sector.pulse
						? {
								animation: `${sector.pulse * 100}ms linear infinite pulse`,
							}
						: {};
					return (
						<path
							key={`map.sector.${sector.number}`}
							className={sector.color}
							strokeWidth={sector.strokeWidth}
							strokeLinecap="round"
							strokeLinejoin="round"
							fill="transparent"
							d={sector.d}
							style={style}
						/>
					);
				})}

				{finishLine && <FinishLine x={finishLine.x} y={finishLine.y} angle={finishLine.startAngle} />}

				{showCornerNumbers &&
					corners.map((corner) => (
						<CornerNumber
							key={`corner.${corner.number}`}
							number={corner.number}
							x={corner.labelPos.x}
							y={corner.labelPos.y}
						/>
					))}

				{centerX && centerY && drivers && timingDrivers && (
					<>
						{Object.values(drivers)
							// Pit cars first so running cars draw over them; then the leader last so it sits on top.
							.sort(
								(a, b) =>
									Number(!timingDrivers.Lines[a.RacingNumber]?.InPit) -
										Number(!timingDrivers.Lines[b.RacingNumber]?.InPit) ||
									racePosition(timingDrivers.Lines[b.RacingNumber]?.Position) -
										racePosition(timingDrivers.Lines[a.RacingNumber]?.Position),
							)
							.filter((driver) => (filter ? filter.includes(driver.RacingNumber) : true))
							.map((driver) => {
								const timingDriver = timingDrivers?.Lines[driver.RacingNumber];
								const hidden = timingDriver
									? timingDriver.KnockedOut || timingDriver.Stopped || timingDriver.Retired
									: false;
								const pit = timingDriver ? timingDriver.InPit : false;

								const realPos = positions?.[driver.RacingNumber];
								if (!estimated && !realPos) return null;

								return (
									<CarDot
										key={`map.driver.${driver.RacingNumber}`}
										favoriteDriver={favoriteDrivers.length > 0 ? favoriteDrivers.includes(driver.RacingNumber) : false}
										name={driver.Tla}
										color={driver.TeamColour}
										pit={pit}
										hidden={hidden}
										pos={realPos}
										animRef={estimated ? carRef(driver.RacingNumber) : undefined}
										rotation={rotation}
										centerX={centerX}
										centerY={centerY}
									/>
								);
							})}
					</>
				)}
			</svg>
		</div>
	);
}

// Unknown positions sort as last, so they are drawn first (underneath).
const racePosition = (position: string | undefined) => {
	const n = parseInt(position ?? "");
	return Number.isFinite(n) ? n : 99;
};

const CHECKER_ROWS = 2;
const CHECKER_COLS = 6;

type FinishLineProps = {
	x: number;
	y: number;
	angle: number;
};

// Chequered strip across the track at the start/finish point; x runs along the direction of travel.
const FinishLine = ({ x, y, angle }: FinishLineProps) => {
	const cell = FINISH_LINE_WIDTH / CHECKER_COLS;

	return (
		<g transform={`translate(${x}, ${y}) rotate(${angle})`}>
			{Array.from({ length: CHECKER_ROWS * CHECKER_COLS }, (_, i) => {
				const row = Math.floor(i / CHECKER_COLS);
				const col = i % CHECKER_COLS;
				return (
					<rect
						key={`finish.${i}`}
						x={(row - CHECKER_ROWS / 2) * cell}
						y={col * cell - FINISH_LINE_WIDTH / 2}
						width={cell}
						height={cell}
						fill={(row + col) % 2 === 0 ? "#fff" : "#000"}
					/>
				);
			})}
		</g>
	);
};

type CornerNumberProps = {
	number: number;
	x: number;
	y: number;
};

const CornerNumber = ({ number, x, y }: CornerNumberProps) => {
	return (
		<g transform={`translate(${x}, ${y})`}>
			<circle r={CORNER_RADIUS} className="fill-zinc-900 stroke-zinc-600" strokeWidth={25} />
			<text className="fill-zinc-300" fontSize={230} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
				{number}
			</text>
		</g>
	);
};

type CarDotProps = {
	name: string;
	color: string | undefined;
	favoriteDriver: boolean;

	pit: boolean;
	hidden: boolean;

	// Either a real position, or a ref the track animation writes transforms into.
	pos?: PositionCar;
	animRef?: (node: SVGGElement | null) => void;
	rotation: number;

	centerX: number;
	centerY: number;
};

const CarDot = ({
	pos,
	animRef,
	name,
	color,
	favoriteDriver,
	pit,
	hidden,
	rotation,
	centerX,
	centerY,
}: CarDotProps) => {
	const rotatedPos = pos ? rotate(pos.X, pos.Y, rotation, centerX, centerY) : null;
	const transform = rotatedPos
		? `translateX(${rotatedPos.x}px) translateY(${rotatedPos.y}px)${pit ? ` scale(${PIT_SCALE})` : ""}`
		: undefined;

	return (
		<g
			ref={animRef}
			className={clsx({ "opacity-40": pit }, { "opacity-0!": hidden })}
			style={{
				// Animated dots get their transform every frame; only real positions tween via CSS.
				...(transform && { transition: "all 1s linear", transform }),
			}}
		>
			{favoriteDriver && <circle className="stroke-sky-400" r={CAR_RADIUS + 90} fill="transparent" strokeWidth={65} />}

			<circle r={CAR_RADIUS} fill={color ? `#${color}` : "#3f3f46"} stroke="#000" strokeWidth={50} />

			<text fill={textOn(color)} fontSize={235} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
				{name}
			</text>
		</g>
	);
};

// Fastest time anyone has set in each sector this session.
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
