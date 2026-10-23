"use client";

import { createPortal } from "react-dom";

import type { Driver, TimingDataDriver } from "@/types/state.type";
import { useDataStore } from "@/stores/useDataStore";

import DriverTag from "./DriverTag";
import DriverGap from "./DriverGap";
import DriverLapTime from "./DriverLapTime";
import DriverMiniSectors from "./DriverMiniSectors";
import DriverCarMetrics from "./DriverCarMetrics";
import DriverTire from "./DriverTire";
import DriverDRS from "./DriverDRS";
import DriverInfo from "./DriverInfo";

type Props = {
	driver: Driver;
	timingDriver: TimingDataDriver;
	position: number;
	onClose: () => void;
};

const hasDRS = (drs: number) => drs > 9;
const possibleDRS = (drs: number) => drs === 8;

export default function DriverDetailModal({ driver, timingDriver, position, onClose }: Props) {
	const sessionPart = useDataStore((s) => s.state?.TimingData?.SessionPart);
	const timingStatsDriver = useDataStore((s) => s.state?.TimingStats?.Lines[driver.RacingNumber]);
	const appTimingDriver = useDataStore((s) => s.state?.TimingAppData?.Lines[driver.RacingNumber]);
	const carData = useDataStore((s) => s.carsData?.[driver.RacingNumber]?.Channels);
	const hasFastest = timingStatsDriver?.PersonalBestLapTime.Position === 1;

	return createPortal(
		<div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-sm">
			<div
				className="flex items-center gap-3 border-b border-zinc-800 p-4"
				style={{ borderTopColor: `#${driver.TeamColour}`, borderTopWidth: 3 }}
			>
				<DriverTag position={position} short={driver.Tla} teamColor={driver.TeamColour} />
				<div className="min-w-0 flex-1">
					<p className="truncate text-xl font-bold text-white">{driver.FullName}</p>
					<p className="text-sm text-zinc-400">{driver.TeamName}</p>
				</div>
				<button
					onClick={onClose}
					className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 active:bg-zinc-700"
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<div className="flex-1 divide-y divide-zinc-800/60 overflow-y-auto">
				<div className="flex items-center gap-4 px-4 py-3">
					<DriverDRS
						on={carData ? hasDRS(carData[45] ?? 0) : false}
						possible={carData ? possibleDRS(carData[45] ?? 0) : false}
						inPit={timingDriver.InPit}
						pitOut={timingDriver.PitOut}
					/>
					<DriverInfo timingDriver={timingDriver} gridPos={appTimingDriver ? parseInt(appTimingDriver.GridPos) : 0} />
				</div>

				<div className="px-4 py-3">
					<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Tire</p>
					<DriverTire stints={appTimingDriver?.Stints} />
				</div>

				<div className="px-4 py-3">
					<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Gap</p>
					<DriverGap timingDriver={timingDriver} sessionPart={sessionPart} />
				</div>

				<div className="px-4 py-3">
					<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Lap Time</p>
					<DriverLapTime last={timingDriver.LastLapTime} best={timingDriver.BestLapTime} hasFastest={hasFastest} />
				</div>

				<div className="px-4 py-3">
					<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Sectors</p>
					<DriverMiniSectors sectors={timingDriver.Sectors} />
				</div>

				{carData && (
					<div className="px-4 py-3">
						<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Car</p>
						<DriverCarMetrics carData={carData} />
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
}
