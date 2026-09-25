"use client";

import clsx from "clsx";
import Link from "next/link";
import { motion } from "motion/react";

import type { Driver, Sector, TimingDataDriver, TimingStatsDriver, PersonalBestLapTime } from "@/types/state.type";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDataStore } from "@/stores/useDataStore";
import { formatDelta, parseTimeMs } from "@/lib/timeUtils";

import DriverTag from "./DriverTag";
import DriverTire from "./DriverTire";

// Every column is a fixed width so the tower stays aligned regardless of what
// each cell holds (live bars of varying length, deltas, blanks). Sector cells
// right-align their content and clip overflow, so the times/Δ always line up.
export const QUALI_GRID_COLS = "7ch 9ch 10ch 10ch 18ch 18ch 18ch 7ch";
export const QUALI_GRID_GAP = "2ch";

type Props = {
	position: number;
	driver: Driver;
	timingDriver: TimingDataDriver;
	timingStats: TimingStatsDriver | undefined;
	fastestSectors: (number | null)[];
	/** fastest complete lap in the field, ms — for the gap-to-pole column */
	poleMs: number;
};

export default function QualiDriver({ position, driver, timingDriver, timingStats, poleMs }: Props) {
	const appTimingDriver = useDataStore((state) => state.state?.TimingAppData?.Lines[driver.RacingNumber]);
	const showMiniSectors = useSettingsStore((state) => state.showMiniSectors);

	const isOut = timingDriver.KnockedOut || timingDriver.Retired || timingDriver.Stopped;
	const hasFastestLap = timingStats?.PersonalBestLapTime.Position === 1;

	// Gap to pole, computed from best laps — the quali feed has no reliable GapToLeader.
	const bestMs = parseTimeMs(timingDriver.BestLapTime.Value ?? "");
	const hasBest = isFinite(bestMs) && isFinite(poleMs);
	const isPole = hasBest && bestMs <= poleMs;
	const gapToPole = hasBest && !isPole ? (bestMs - poleMs) / 1000 : null;

	return (
		<motion.div
			layout="position"
			className={clsx(
				"group flex w-full items-center border-b border-zinc-900 py-0.5 pr-1 pl-2 font-mono text-base leading-none select-none",
				{
					"opacity-25": isOut,
					"bg-violet-950/60": hasFastestLap,
				},
			)}
		>
			<div
				className="grid min-w-0 flex-1 items-center"
				style={{ columnGap: QUALI_GRID_GAP, gridTemplateColumns: QUALI_GRID_COLS }}
			>
				<DriverTag short={driver.Tla} teamColor={driver.TeamColour} position={position} />

				{/* GAP to pole (P1 best lap) */}
				<span
					className={clsx("block w-full text-right tabular-nums", {
						"text-emerald-400": isPole,
						"text-zinc-300": gapToPole !== null,
						"text-zinc-700": !hasBest,
					})}
				>
					{isPole ? "LEADER" : gapToPole !== null ? `+${gapToPole.toFixed(3)}` : "---"}
				</span>

				{/* Best lap time */}
				<span
					className={clsx("block w-full text-right tabular-nums", {
						"text-violet-400": hasFastestLap,
						"text-zinc-300": !hasFastestLap && !!timingDriver.BestLapTime.Value,
						"text-zinc-700": !timingDriver.BestLapTime.Value,
					})}
				>
					{timingDriver.BestLapTime.Value || "---"}
				</span>

				{/* Last lap time */}
				<span
					className={clsx("block w-full text-right tabular-nums", {
						"text-violet-400": timingDriver.LastLapTime.OverallFastest,
						"text-emerald-400": !timingDriver.LastLapTime.OverallFastest && timingDriver.LastLapTime.PersonalFastest,
						"text-zinc-300":
							!timingDriver.LastLapTime.OverallFastest &&
							!timingDriver.LastLapTime.PersonalFastest &&
							!!timingDriver.LastLapTime.Value,
						"text-zinc-700": !timingDriver.LastLapTime.Value,
					})}
				>
					{timingDriver.LastLapTime.Value || "---"}
				</span>

				{/* S1, S2, S3 — merged: best on top, current + Δ below */}
				{[0, 1, 2].map((i) => (
					<QualiSectorCell
						key={`s${i}`}
						sector={timingDriver.Sectors[i]}
						bestSector={timingStats?.BestSectors[i]}
						showMiniSectors={showMiniSectors}
					/>
				))}

				<DriverTire stints={appTimingDriver?.Stints} />
			</div>

			<Link
				href={`/dashboard/driver/${driver.RacingNumber}`}
				className="ml-2 hidden h-4 w-4 shrink-0 items-center justify-center text-zinc-800 group-hover:flex hover:text-zinc-500"
				aria-label={`View ${driver.FullName}`}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="10"
					height="10"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
				</svg>
			</Link>
		</motion.div>
	);
}

type SectorCellProps = {
	sector: Sector | undefined;
	bestSector: PersonalBestLapTime | undefined;
	showMiniSectors: boolean;
};

/**
 * Line 1 (big): personal best sector — the standing reference.
 * Line 2 (small): what's happening THIS lap.
 *   • in-sector  → mini-bar blocks (live pace)
 *   • completed  → sector time + Δ vs personal best
 *   • nothing    → empty (driver between laps / no data)
 *
 * `sector.Value`        = sector timing for the CURRENT lap (non-empty while active/just finished)
 * `sector.PreviousValue`= sector from the previous lap  (don't show Δ — could be any lap)
 */
function QualiSectorCell({ sector, bestSector, showMiniSectors }: SectorCellProps) {
	if (!sector) return <span className="block text-right text-zinc-800">---</span>;

	const bestTime = bestSector?.Value ?? "";
	const curTime = sector.Value ?? "";
	const prevTime = sector.PreviousValue ?? "";
	const hasSegs = showMiniSectors && sector.Segments.length > 0;

	const isSessionFastest = bestSector?.Position === 1;

	// Delta only for current-lap sector (sector.Value), not a cached prev-lap value
	const deltaMs = curTime && bestTime ? parseTimeMs(curTime) - parseTimeMs(bestTime) : null;

	const displayTime = curTime || prevTime;
	const hasLine2 = hasSegs || !!displayTime || deltaMs !== null;

	return (
		<span className="flex min-w-0 flex-col items-end gap-px overflow-hidden">
			{/* ── Line 1: personal best — always the standing reference ── */}
			<span
				className={clsx("whitespace-nowrap tabular-nums", {
					"text-violet-400": isSessionFastest,
					"text-zinc-300": !isSessionFastest && !!bestTime,
					"text-zinc-700": !bestTime,
				})}
			>
				{bestTime || "---"}
			</span>

			{/* ── Line 2: current/prev time + Δ (pinned right) with live bars trailing left ── */}
			{hasLine2 && (
				<span className="flex w-full items-center justify-end gap-[0.5ch] overflow-hidden text-[11px] leading-none whitespace-nowrap">
					{hasSegs && (
						<span className="flex min-w-0 shrink items-center gap-px overflow-hidden">
							{sector.Segments.map((seg, j) => (
								<MiniBlock key={j} status={seg.Status} />
							))}
						</span>
					)}
					{displayTime && (
						<span
							className={clsx("shrink-0 tabular-nums", {
								"text-violet-400": sector.OverallFastest,
								"text-emerald-400": !sector.OverallFastest && sector.PersonalFastest,
								"text-zinc-400": !sector.OverallFastest && !sector.PersonalFastest && !!curTime,
								"text-zinc-700": !curTime,
							})}
						>
							{displayTime}
						</span>
					)}
					{deltaMs !== null && (
						<span
							className={clsx("shrink-0 font-bold tabular-nums", {
								"text-emerald-400": deltaMs < 0,
								"text-red-500": deltaMs > 0,
							})}
						>
							{formatDelta(deltaMs)}
						</span>
					)}
				</span>
			)}
		</span>
	);
}

function MiniBlock({ status }: { status: number }) {
	return (
		<span
			className={clsx("leading-none", {
				"text-amber-400": status === 2048 || status === 2052,
				"text-emerald-400": status === 2049,
				"text-violet-400": status === 2051,
				"text-blue-400": status === 2064,
				"text-zinc-800": status === 0,
			})}
		>
			{status === 0 ? "▒" : "█"}
		</span>
	);
}
