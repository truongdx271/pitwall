"use client";

import { useMemo } from "react";
import clsx from "clsx";
import Link from "next/link";
import { motion } from "motion/react";

import type { Driver, TimingDataDriver, TimingStatsDriver } from "@/types/state.type";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDataStore } from "@/stores/useDataStore";
import { useHistoryStore, type LapTimeEntry } from "@/stores/useHistoryStore";
import { parseTimeMs } from "@/lib/timeUtils";
import { getStintBoundaries } from "@/lib/stints";
import { longRun } from "@/lib/longRun";
import { driverStatus, DRIVER_STATUS_COLOR, DRIVER_STATUS_LABEL } from "@/lib/driverStatus";

import { practiceGridCols, QUALI_SECTOR_GAP, RACE_GRID_GAP, SECTOR_GRID } from "@/components/dashboard/raceGrid";
import StatusDot from "@/components/ui/StatusDot";

import DriverChip from "./DriverChip";
import DriverTireStack from "./DriverTireStack";
import { QualiSectorCell } from "./QualiDriver";

type Props = {
	position: number;
	driver: Driver;
	timingDriver: TimingDataDriver;
	timingStats: TimingStatsDriver | undefined;
	/** fastest lap in the field, ms */
	fastestMs: number;
	showPace: boolean;
};

const NO_LAPS: LapTimeEntry[] = [];

// One 30px row of the practice classification (SPEC §5, Practice.png).
export default function PracticeDriver({ position, driver, timingDriver, timingStats, fastestMs, showPace }: Props) {
	const appTimingDriver = useDataStore((state) => state.state?.TimingAppData?.Lines[driver.RacingNumber]);
	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(driver.RacingNumber));
	const laps = useHistoryStore((s) => s.lapTimes[driver.RacingNumber] ?? NO_LAPS);

	const out = !!(timingDriver.Retired || timingDriver.Stopped);
	const hasFastestLap = timingStats?.PersonalBestLapTime.Position === 1;
	const bestMs = parseTimeMs(timingDriver.BestLapTime.Value ?? "");

	// Long run: the current stint has 5+ consecutive valid laps (SPEC §13.2).
	const stints = appTimingDriver?.Stints;
	const run = useMemo(() => {
		const boundaries = getStintBoundaries(stints ?? []);
		return longRun(
			laps,
			boundaries.find((b) => b.isActive),
			boundaries,
			bestMs,
		);
	}, [stints, laps, bestMs]);
	const status = driverStatus(timingDriver, { longRun: run != null });

	const hasBest = isFinite(bestMs) && isFinite(fastestMs);
	const isFastest = hasBest && bestMs <= fastestMs;
	const gap = hasBest && !isFastest ? (bestMs - fastestMs) / 1000 : null;
	const last = timingDriver.LastLapTime;

	return (
		<motion.div
			layout="position"
			className={clsx(
				"group relative flex h-row items-center rounded-md font-mono text-[13px] tabular-nums select-none",
				{
					"opacity-45": out,
					"bg-fl-row": hasFastestLap,
					"bg-row-alt": !hasFastestLap && position % 2 === 0,
					"shadow-[inset_2px_0_0_var(--color-fg-1)]": favoriteDriver,
				},
			)}
		>
			<div
				className="grid min-w-0 flex-1 items-center px-2.5"
				style={{ columnGap: RACE_GRID_GAP, gridTemplateColumns: practiceGridCols(showPace) }}
			>
				<span className="text-right text-fg-2">{position}</span>

				<DriverChip short={driver.Tla} teamColor={driver.TeamColour} />

				<span className={clsx("text-right", gap !== null ? "text-fg-1" : "font-sans text-fg-3")}>
					{isFastest ? "Fastest" : gap !== null ? `+${gap.toFixed(3)}` : "No time"}
				</span>

				<span className={clsx("text-right", hasFastestLap ? "text-session-best" : "text-fg-1")}>
					{timingDriver.BestLapTime.Value || "—"}
				</span>

				<span
					className={clsx("text-right", {
						"text-session-best": last.OverallFastest,
						"text-personal-best": !last.OverallFastest && last.PersonalFastest,
						"text-fg-1": !last.OverallFastest && !last.PersonalFastest,
					})}
				>
					{last.Value || "—"}
				</span>

				<span className="grid min-w-0" style={{ gridTemplateColumns: SECTOR_GRID, columnGap: QUALI_SECTOR_GAP }}>
					{[0, 1, 2].map((i) => (
						<QualiSectorCell
							key={i}
							sector={timingDriver.Sectors[i]}
							best={timingStats?.BestSectors?.[i]?.Value}
							hideBest={showPace}
						/>
					))}
				</span>

				<span className="text-right text-fg-2">{timingDriver.NumberOfLaps ?? 0}</span>

				<DriverTireStack
					stints={appTimingDriver?.Stints}
					racingNumber={driver.RacingNumber}
					showPace={showPace}
					practiceBestMs={isFinite(bestMs) ? bestMs : undefined}
				/>

				<StatusDot label={DRIVER_STATUS_LABEL[status]} color={DRIVER_STATUS_COLOR[status]} />
			</div>

			<Link
				href={`/dashboard/driver/${driver.RacingNumber}`}
				className="absolute right-1 hidden size-5 items-center justify-center rounded-tag bg-surface-3 text-fg-2 group-hover:flex hover:text-fg-1 focus-visible:flex"
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
					aria-hidden="true"
				>
					<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
				</svg>
			</Link>
		</motion.div>
	);
}
