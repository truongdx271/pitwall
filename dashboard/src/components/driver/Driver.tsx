"use client";

import clsx from "clsx";
import Link from "next/link";
import { motion } from "motion/react";

import type { Driver, TimingDataDriver } from "@/types/state.type";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDataStore } from "@/stores/useDataStore";
import { inKnockoutZone } from "@/lib/knockout";
import { positionDelta, proximityBars, segmentColor } from "@/lib/raceRow";

import { raceGridCols, RACE_GRID_GAP, SECTOR_GRID, SECTOR_GRID_GAP } from "@/components/dashboard/raceGrid";

import DriverChip from "./DriverChip";
import DriverTireStack from "./DriverTireStack";
import DriverCarMetrics from "./DriverCarMetrics";

type Props = {
	position: number;
	driver: Driver;
	timingDriver: TimingDataDriver;
	showPace: boolean;
};

// One 30px row of the race classification (SPEC §3.1).
export default function Driver({ driver, timingDriver, position, showPace }: Props) {
	const sessionPart = useDataStore((state) => state.state?.TimingData?.SessionPart);
	const noEntries = useDataStore((state) => state.state?.TimingData?.NoEntries);
	const timingStatsDriver = useDataStore((state) => state.state?.TimingStats?.Lines[driver.RacingNumber]);
	const appTimingDriver = useDataStore((state) => state.state?.TimingAppData?.Lines[driver.RacingNumber]);
	const carData = useDataStore((state) => state.carsData?.[driver.RacingNumber]?.Channels);

	const hasFastest = timingStatsDriver?.PersonalBestLapTime.Position == 1;
	const carMetrics = useSettingsStore((state) => state.carMetrics);
	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(driver.RacingNumber));

	const out = !!(timingDriver.Retired || timingDriver.Stopped || timingDriver.KnockedOut);
	const danger = inKnockoutZone(position, noEntries, sessionPart);
	const gridPos = appTimingDriver ? parseInt(appTimingDriver.GridPos) : undefined;

	return (
		<motion.div
			layout="position"
			className={clsx(
				"group relative flex h-row items-center rounded-md font-mono text-[13px] tabular-nums select-none",
				{
					"opacity-45": out,
					"bg-fl-row": hasFastest,
					"bg-ko-row": danger && !hasFastest,
					// Zebra stripes by position (stable while rows reorder); highlights win.
					"bg-row-alt": !hasFastest && !danger && position % 2 === 0,
					// Followed drivers: a quiet 2px bar on the left (not in the mockup, SPEC §3.1).
					"shadow-[inset_2px_0_0_var(--color-fg-1)]": favoriteDriver,
				},
			)}
		>
			<div
				className="grid min-w-0 flex-1 items-center px-2.5"
				style={{ columnGap: RACE_GRID_GAP, gridTemplateColumns: raceGridCols(showPace) }}
			>
				<span className={clsx("text-right", danger ? "text-loss" : "text-fg-2")}>{position}</span>

				<DriverChip short={driver.Tla} teamColor={driver.TeamColour} />

				<DeltaCell delta={positionDelta(out ? undefined : gridPos, parseInt(timingDriver.Position), hasFastest)} />

				<ProximityMeter interval={out ? undefined : timingDriver.IntervalToPositionAhead?.Value} />

				<GapCell timingDriver={timingDriver} out={out} />

				<span className="text-right text-fg-2">
					{out || timingDriver.Position === "1" ? "—" : timingDriver.IntervalToPositionAhead?.Value || "—"}
				</span>

				<span
					className={clsx("text-right", {
						"text-session-best": timingDriver.LastLapTime.OverallFastest,
						"text-personal-best": !timingDriver.LastLapTime.OverallFastest && timingDriver.LastLapTime.PersonalFastest,
						"text-fg-1": !timingDriver.LastLapTime.OverallFastest && !timingDriver.LastLapTime.PersonalFastest,
					})}
				>
					{timingDriver.LastLapTime.Value || "—"}
				</span>

				<span className={clsx("text-right", hasFastest ? "text-session-best" : "text-fg-1")}>
					{timingDriver.BestLapTime.Value || "—"}
				</span>

				<SectorCells sectors={timingDriver.Sectors} />

				<DriverTireStack stints={appTimingDriver?.Stints} racingNumber={driver.RacingNumber} showPace={showPace} />
			</div>

			{carMetrics && carData && <DriverCarMetrics carData={carData} />}

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

function DeltaCell({ delta }: { delta: ReturnType<typeof positionDelta> }) {
	switch (delta.kind) {
		case "fl":
			return <span className="font-sans text-xs font-semibold text-session-best">FL</span>;
		case "gain":
			return <span className="font-sans text-xs font-medium text-gain">▲{delta.places}</span>;
		case "loss":
			return <span className="font-sans text-xs font-medium text-loss">▼{delta.places}</span>;
		default:
			return <span className="font-sans text-xs text-fg-3">—</span>;
	}
}

// Four bars that fill as the interval to the car ahead drops under a second.
function ProximityMeter({ interval }: { interval: string | undefined }) {
	const filled = proximityBars(interval);

	return (
		<span className="flex h-3 w-[26px] gap-px" aria-label={filled ? `Within ${interval} s` : undefined}>
			{[0, 1, 2, 3].map((k) => (
				<span
					key={k}
					className={clsx(
						"h-full flex-1 rounded-[1px]",
						k < filled ? (filled === 4 ? "bg-loss" : "bg-slower") : "bg-surface-3",
					)}
				/>
			))}
		</span>
	);
}

function GapCell({ timingDriver, out }: { timingDriver: TimingDataDriver; out: boolean }) {
	if (out) return <span className="text-right text-fg-3">{timingDriver.Retired ? "RET" : "OUT"}</span>;

	// For the leader the feed puts the lap ("LAP 12") in the gap field.
	const gap = timingDriver.GapToLeader ?? "";
	const leader = timingDriver.Position === "1" || /^LAP \d/i.test(gap);

	if (leader) return <span className="text-right font-sans text-fg-3">Leader</span>;
	return <span className="text-right text-fg-1">{gap || "—"}</span>;
}

// S1 · S2 · S3: the sector time over a 3px bar with one block per mini-sector.
function SectorCells({ sectors = [] }: { sectors: TimingDataDriver["Sectors"] }) {
	const showMiniSectors = useSettingsStore((state) => state.showMiniSectors);

	return (
		<span className="grid min-w-0" style={{ gridTemplateColumns: SECTOR_GRID, columnGap: SECTOR_GRID_GAP }}>
			{[0, 1, 2].map((i) => {
				const sector = sectors[i];
				const value = sector?.Value || sector?.PreviousValue || "";

				return (
					<span key={i} className="flex min-w-0 flex-col gap-[3px]">
						<span
							className={clsx("text-xs leading-[14px]", {
								"text-session-best": sector?.OverallFastest,
								"text-personal-best": !sector?.OverallFastest && sector?.PersonalFastest,
								"text-slower": !sector?.OverallFastest && !sector?.PersonalFastest && !!sector?.Value,
								"text-fg-3": !sector?.Value,
							})}
						>
							{value || "—"}
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
			})}
		</span>
	);
}
