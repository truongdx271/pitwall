"use client";

import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";

import Map from "@/components/dashboard/Map";
import DriverTag from "@/components/driver/DriverTag";
import DriverDRS from "@/components/driver/DriverDRS";
import DriverInfo from "@/components/driver/DriverInfo";
import DriverGap from "@/components/driver/DriverGap";
import DriverLapTime from "@/components/driver/DriverLapTime";

import { sortPos } from "@/lib/sorting";

import { useDataStore } from "@/stores/useDataStore";
import type { Driver, TimingDataDriver } from "@/types/state.type";
import { useSettingsStore } from "@/stores/useSettingsStore";

const GRID_COLS = "7ch 3ch 5ch 8ch 9ch";
const GRID_GAP = "1.5ch";

export default function TrackMap() {
	const drivers = useDataStore((state) => state.state?.DriverList);
	const driversTiming = useDataStore((state) => state.state?.TimingData);

	return (
		<div className="flex h-full flex-col-reverse font-mono md:flex-row">
			{/* Sidebar */}
			<div className="w-full shrink-0 overflow-y-auto border-r border-zinc-800 md:w-auto">
				{(!drivers || !driversTiming) &&
					new Array(20).fill("").map((_, i) => <SkeletonDriver key={`map.skeleton.${i}`} />)}

				{drivers && driversTiming && (
					<AnimatePresence>
						{Object.values(driversTiming.Lines)
							.sort(sortPos)
							.map((timingDriver, index) => (
								<TrackMapDriver
									key={`trackmap.driver.${timingDriver.RacingNumber}`}
									position={index + 1}
									driver={drivers[timingDriver.RacingNumber]}
									timingDriver={timingDriver}
								/>
							))}
					</AnimatePresence>
				)}
			</div>

			{/* Map */}
			<div className="min-h-64 flex-1 md:min-h-0">
				<Map />
			</div>
		</div>
	);
}

type TrackMapDriverProps = {
	position: number;
	driver: Driver;
	timingDriver: TimingDataDriver;
};

const hasDRS = (drs: number) => drs > 9;
const possibleDRS = (drs: number) => drs === 8;

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

const TrackMapDriver = ({ position, driver, timingDriver }: TrackMapDriverProps) => {
	const sessionPart = useDataStore((state) => state.state?.TimingData?.SessionPart);
	const timingStatsDriver = useDataStore((state) => state.state?.TimingStats?.Lines[driver.RacingNumber]);
	const appTimingDriver = useDataStore((state) => state.state?.TimingAppData?.Lines[driver.RacingNumber]);
	const hasFastest = timingStatsDriver?.PersonalBestLapTime.Position == 1;
	const carData = useDataStore((state) => state.carsData?.[driver.RacingNumber]?.Channels);
	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(driver.RacingNumber));

	return (
		<motion.div
			layout="position"
			className={clsx("border-b border-zinc-900 py-0.5 pr-1 pl-2 leading-none select-none", {
				"opacity-30": timingDriver.KnockedOut || timingDriver.Retired || timingDriver.Stopped,
				"bg-sky-950/60": favoriteDriver,
				"bg-violet-950/60": hasFastest,
				"bg-red-950/60": sessionPart != undefined && inDangerZone(position, sessionPart),
			})}
		>
			<div className="grid items-center" style={{ columnGap: GRID_GAP, gridTemplateColumns: GRID_COLS }}>
				<DriverTag short={driver.Tla} teamColor={driver.TeamColour} position={position} />
				<DriverDRS
					on={carData ? hasDRS(carData[45] ?? 0) : false}
					possible={carData ? possibleDRS(carData[45] ?? 0) : false}
					inPit={timingDriver.InPit}
					pitOut={timingDriver.PitOut}
				/>
				<DriverInfo
					timingDriver={timingDriver}
					gridPos={appTimingDriver ? parseInt(appTimingDriver.GridPos) : 0}
					hasFastest={hasFastest}
				/>
				<DriverGap timingDriver={timingDriver} sessionPart={sessionPart} />
				<DriverLapTime last={timingDriver.LastLapTime} best={timingDriver.BestLapTime} hasFastest={hasFastest} />
			</div>
		</motion.div>
	);
};

const SkeletonDriver = () => (
	<div
		className="grid items-center border-b border-zinc-900 py-0.5 pr-1 pl-2 text-zinc-800"
		style={{ columnGap: GRID_GAP, gridTemplateColumns: GRID_COLS }}
	>
		<span>▌ ---</span>
		<span>---</span>
		<span>----</span>
		<span className="text-right">--------</span>
		<span className="text-right">--------</span>
	</div>
);
