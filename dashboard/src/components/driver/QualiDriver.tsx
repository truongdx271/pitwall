"use client";

import clsx from "clsx";
import Link from "next/link";
import { motion } from "motion/react";

import type { Driver, PersonalBestLapTime, Sector, TimingDataDriver, TimingStatsDriver } from "@/types/state.type";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDataStore } from "@/stores/useDataStore";
import { parseTimeMs } from "@/lib/timeUtils";
import { segmentColor } from "@/lib/raceRow";
import { driverStatus, DRIVER_STATUS_COLOR, DRIVER_STATUS_LABEL } from "@/lib/driverStatus";

import { QUALI_GRID_COLS, QUALI_SECTOR_GAP, RACE_GRID_GAP, SECTOR_GRID } from "@/components/dashboard/raceGrid";
import StatusDot from "@/components/ui/StatusDot";

import DriverChip from "./DriverChip";
import DriverTireStack from "./DriverTireStack";

type Props = {
	position: number;
	driver: Driver;
	timingDriver: TimingDataDriver;
	timingStats: TimingStatsDriver | undefined;
	/** fastest complete lap in the field, ms — for the gap-to-pole column */
	poleMs: number;
	/** this row sits in the knockout zone */
	knockout: boolean;
};

// One 30px row of the qualifying classification (SPEC §4, Quali.png).
export default function QualiDriver({ position, driver, timingDriver, timingStats, poleMs, knockout }: Props) {
	const appTimingDriver = useDataStore((state) => state.state?.TimingAppData?.Lines[driver.RacingNumber]);
	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(driver.RacingNumber));

	const knockedOut = !!(timingDriver.KnockedOut || timingDriver.Retired || timingDriver.Stopped);
	const hasFastestLap = timingStats?.PersonalBestLapTime.Position === 1;
	const status = driverStatus(timingDriver);

	// Gap to pole, computed from best laps — the quali feed has no reliable GapToLeader.
	const bestMs = parseTimeMs(timingDriver.BestLapTime.Value ?? "");
	const hasBest = isFinite(bestMs) && isFinite(poleMs);
	const isPole = hasBest && bestMs <= poleMs;
	const gapToPole = hasBest && !isPole ? (bestMs - poleMs) / 1000 : null;

	const last = timingDriver.LastLapTime;

	return (
		<motion.div
			layout="position"
			className={clsx(
				"group relative flex h-row items-center rounded-md font-mono text-[13px] tabular-nums select-none",
				{
					"opacity-45": knockedOut,
					"bg-fl-row": hasFastestLap,
					"bg-ko-row": knockout && !hasFastestLap,
					// Zebra stripes by position (stable while rows reorder); highlights win.
					"bg-row-alt": !hasFastestLap && !knockout && position % 2 === 0,
					"shadow-[inset_2px_0_0_var(--color-fg-1)]": favoriteDriver,
				},
			)}
		>
			<div
				className="grid min-w-0 flex-1 items-center px-2.5"
				style={{ columnGap: RACE_GRID_GAP, gridTemplateColumns: QUALI_GRID_COLS }}
			>
				<span className={clsx("text-right", knockout ? "text-loss" : "text-fg-2")}>{position}</span>

				<DriverChip short={driver.Tla} teamColor={driver.TeamColour} />

				<span className={clsx("text-right", gapToPole !== null ? "text-fg-1" : "font-sans text-fg-3")}>
					{isPole ? "Fastest" : gapToPole !== null ? `+${gapToPole.toFixed(3)}` : "No time"}
				</span>

				<span className={clsx("text-right", hasFastestLap ? "text-session-best" : "text-fg-1")}>
					{timingDriver.BestLapTime.Value || "—"}
				</span>

				<span
					className={clsx("text-right", {
						"text-session-best": last.OverallFastest,
						"text-personal-best": !last.OverallFastest && last.PersonalFastest,
						"text-slower": !last.OverallFastest && !last.PersonalFastest && !!last.Value,
						"text-fg-3": !last.Value,
					})}
				>
					{last.Value || "—"}
				</span>

				<span className="grid min-w-0" style={{ gridTemplateColumns: SECTOR_GRID, columnGap: QUALI_SECTOR_GAP }}>
					{[0, 1, 2].map((i) => (
						<QualiSectorCell key={i} sector={timingDriver.Sectors[i]} best={timingStats?.BestSectors?.[i]} />
					))}
				</span>

				<DriverTireStack stints={appTimingDriver?.Stints} racingNumber={driver.RacingNumber} />

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

// Current-lap sector time large on the left, the personal-best sector small on the right
// (purple when it is the best of the session), the mini-sector bar underneath (SPEC §4;
// the old cell had them the other way round).
export function QualiSectorCell({
	sector,
	best,
	hideBest = false,
}: {
	sector: Sector | undefined;
	best: PersonalBestLapTime | undefined;
	/** Practice pace view: the sector column is too narrow for both times. */
	hideBest?: boolean;
}) {
	const showMiniSectors = useSettingsStore((state) => state.showMiniSectors);
	const showBestSectors = useSettingsStore((state) => state.showBestSectors);

	return (
		<span className="flex min-w-0 flex-col gap-[3px]">
			<span className="flex justify-between gap-1 text-xs leading-[14px]">
				<span
					className={clsx({
						"text-session-best": sector?.OverallFastest,
						"text-personal-best": !sector?.OverallFastest && sector?.PersonalFastest,
						"text-slower": !sector?.OverallFastest && !sector?.PersonalFastest && !!sector?.Value,
						"text-fg-3": !sector?.Value,
					})}
				>
					{sector?.Value || "—"}
				</span>
				{showBestSectors && !hideBest && best?.Value && (
					<span className={clsx("text-[11px]", best.Position === 1 ? "text-session-best" : "text-fg-3")}>
						{best.Value}
					</span>
				)}
			</span>
			{showMiniSectors && (
				<span className="flex h-[3px] gap-px" aria-hidden>
					{(sector?.Segments ?? []).map((segment, j) => (
						<span key={j} className={clsx("h-full flex-1", segmentColor(segment.Status))} />
					))}
				</span>
			)}
		</span>
	);
}
