"use client";

import clsx from "clsx";
import Link from "next/link";
import { motion } from "motion/react";

import type { Driver, TimingDataDriver } from "@/types/state.type";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDataStore } from "@/stores/useDataStore";

import DriverTag from "./DriverTag";
import DriverGap from "./DriverGap";
import DriverTireStack from "./DriverTireStack";
import DriverMiniSectors from "./DriverMiniSectors";
import DriverLapTime from "./DriverLapTime";
import DriverBestLap from "./DriverBestLap";
import DriverInfo from "./DriverInfo";
import DriverCarMetrics from "./DriverCarMetrics";
import DriverPace from "./DriverPace";
import DriverProximity from "./DriverProximity";

type Props = {
	position: number;
	driver: Driver;
	timingDriver: TimingDataDriver;
	showPace: boolean;
};

export const DRIVER_GRID_GAP = "2ch";
export const driverGridCols = (showPace: boolean) =>
	showPace ? "7ch 4ch 5ch 9ch 8ch 9ch 9ch 1fr 16ch auto" : "7ch 4ch 5ch 9ch 8ch 9ch 9ch 1fr 16ch";
// keep alias so any other import doesn't break
export const DRIVER_GRID_COLS = driverGridCols(true);

const inDangerZone = (position: number, sessionPart: number) => {
	switch (sessionPart) {
		case 1:
			return position > 15;
		case 2:
			return position > 10;
		default:
			return false;
	}
};

export default function Driver({ driver, timingDriver, position, showPace }: Props) {
	const sessionPart = useDataStore((state) => state.state?.TimingData?.SessionPart);
	const timingStatsDriver = useDataStore((state) => state.state?.TimingStats?.Lines[driver.RacingNumber]);
	const appTimingDriver = useDataStore((state) => state.state?.TimingAppData?.Lines[driver.RacingNumber]);
	const carData = useDataStore((state) => state.carsData?.[driver.RacingNumber]?.Channels);

	const hasFastest = timingStatsDriver?.PersonalBestLapTime.Position == 1;
	const carMetrics = useSettingsStore((state) => state.carMetrics);
	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(driver.RacingNumber));

	return (
		<motion.div
			layout="position"
			className={clsx(
				"group flex w-full items-center border-b border-zinc-900 py-0.5 pr-1 pl-2 font-mono text-base leading-none select-none",
				{
					"opacity-30": timingDriver.KnockedOut || timingDriver.Retired || timingDriver.Stopped,
					"bg-sky-950/60": favoriteDriver,
					"bg-violet-950/60": hasFastest,
					"bg-red-950/60": sessionPart != undefined && inDangerZone(position, sessionPart),
				},
			)}
		>
			<div
				className="grid min-w-0 flex-1 items-center"
				style={{ columnGap: DRIVER_GRID_GAP, gridTemplateColumns: driverGridCols(showPace) }}
			>
				<DriverTag short={driver.Tla} teamColor={driver.TeamColour} position={position} />

				<DriverInfo
					timingDriver={timingDriver}
					gridPos={appTimingDriver ? parseInt(appTimingDriver.GridPos) : 0}
					hasFastest={hasFastest}
				/>

				<DriverProximity timingDriver={timingDriver} />

				<DriverGap timingDriver={timingDriver} sessionPart={sessionPart} />

				<DriverGap timingDriver={timingDriver} sessionPart={sessionPart} showInterval />

				<DriverLapTime last={timingDriver.LastLapTime} best={timingDriver.BestLapTime} hasFastest={hasFastest} />

				<DriverBestLap best={timingDriver.BestLapTime} hasFastest={hasFastest} />

				<DriverMiniSectors sectors={timingDriver.Sectors} />

				<DriverTireStack stints={appTimingDriver?.Stints} />

				{showPace && <DriverPace stints={appTimingDriver?.Stints} racingNumber={driver.RacingNumber} />}

				{carMetrics && carData && <DriverCarMetrics carData={carData} />}
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
