"use client";

import { useState } from "react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import clsx from "clsx";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDataStore } from "@/stores/useDataStore";

import { sortPos } from "@/lib/sorting";
import { useLoadingGrace } from "@/hooks/useLoadingGrace";

import Driver, { driverGridCols, DRIVER_GRID_GAP } from "@/components/driver/Driver";
import RaceHelpModal from "@/components/dashboard/RaceHelpModal";
import NoSession from "@/components/dashboard/NoSession";

export default function LeaderBoard() {
	const drivers = useDataStore(({ state }) => state?.DriverList);
	const driversTiming = useDataStore(({ state }) => state?.TimingData);
	const noData = !drivers || !driversTiming;
	const graceOver = useLoadingGrace();
	const showTableHeader = useSettingsStore((state) => state.tableHeaders);
	const [showPace, setShowPace] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);

	return (
		<>
			{helpOpen && <RaceHelpModal onClose={() => setHelpOpen(false)} />}
			<div className="w-full overflow-x-auto font-mono text-base">
				<div className="flex items-center justify-between border-b border-zinc-800 px-2 py-0.5">
					<span className="text-[11px] tracking-widest text-zinc-600 uppercase">RACE</span>
					<div className="flex items-center gap-3">
						<button
							onClick={() => setShowPace((v) => !v)}
							className={clsx("text-[11px] tracking-widest uppercase transition-colors", {
								"text-zinc-400": showPace,
								"text-zinc-700 hover:text-zinc-400": !showPace,
							})}
						>
							pace
						</button>
						<span className="text-zinc-800">│</span>
						<button
							onClick={() => setHelpOpen(true)}
							className="text-[11px] tracking-widest text-zinc-700 uppercase transition-colors hover:text-zinc-400"
							aria-label="Race timing help"
						>
							? help
						</button>
					</div>
				</div>

				{showTableHeader && (
					<TableHeaders
						showPace={showPace}
					/>
				)}

				{noData && !graceOver && new Array(20).fill("").map((_, index) => <SkeletonDriver key={`driver.loading.${index}`} />)}

				{noData && graceOver && <NoSession />}

				<LayoutGroup key="drivers">
					{drivers && driversTiming && (
						<AnimatePresence>
							{Object.values(driversTiming.Lines)
								.sort(sortPos)
								.map((timingDriver, index) => (
									<Driver
										key={`leaderBoard.driver.${timingDriver.RacingNumber}`}
										position={index + 1}
										driver={drivers[timingDriver.RacingNumber]}
										timingDriver={timingDriver}
										showPace={showPace}
									/>
								))}
						</AnimatePresence>
					)}
				</LayoutGroup>
			</div>
		</>
	);
}

type HeaderProps = {
	showPace: boolean;
};

const TableHeaders = ({ showPace }: HeaderProps) => (
	<div
		className="grid items-center border-b-2 border-zinc-600 py-0.5 pr-1 pl-2 font-mono text-base leading-none"
		style={{ columnGap: DRIVER_GRID_GAP, gridTemplateColumns: driverGridCols(showPace) }}
	>
		<span className="text-[11px] tracking-widest text-zinc-400 uppercase">POS</span>
		<span className="text-right text-[11px] tracking-widest text-zinc-400 uppercase">INFO</span>
		<span className="text-[11px] tracking-widest text-zinc-600 uppercase">&lt;1s</span>
		<span className="text-right text-[11px] tracking-widest text-zinc-400 uppercase">GAP</span>
		<span className="text-right text-[11px] tracking-widest text-zinc-400 uppercase">INT</span>
		<span className="text-right text-[11px] tracking-widest text-zinc-400 uppercase">LAP</span>
		<span className="text-right text-[11px] tracking-widest text-zinc-400 uppercase">BEST</span>
		<span className="text-[11px] tracking-widest text-zinc-400 uppercase">SECTORS</span>
		<span className="text-[11px] tracking-widest text-zinc-400 uppercase">TYRE</span>
		{showPace && <span className="text-[11px] tracking-widest text-zinc-400 uppercase">PACE</span>}
	</div>
);

const SkeletonDriver = () => (
	<div className="border-b border-zinc-900 py-0.5 pr-1 pl-2 font-mono text-base leading-none text-zinc-800">
		▌ -- ??? --------- ---------- -------- --------- ▒▒▒▒▒▒▒▒ --- ▒▒▒▒▒▒▒▒ --- ▒▒▒▒▒▒▒▒ ---
	</div>
);
