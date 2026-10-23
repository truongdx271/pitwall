"use client";

import { useState } from "react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import clsx from "clsx";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDataStore } from "@/stores/useDataStore";

import { sortPos } from "@/lib/sorting";
import { useLoadingGrace } from "@/hooks/useLoadingGrace";

import Driver from "@/components/driver/Driver";
import NoSession from "@/components/dashboard/NoSession";
import Panel from "@/components/ui/Panel";

import { raceGridCols, RACE_GRID_GAP, SECTOR_GRID, SECTOR_GRID_GAP } from "./raceGrid";

const LEGEND = [
	{ label: "Session best", color: "bg-session-best" },
	{ label: "Personal best", color: "bg-personal-best" },
	{ label: "Slower", color: "bg-slower" },
	{ label: "Pit lane", color: "bg-pit" },
];

// The race classification panel (SPEC §3.1, Main.png).
export default function LeaderBoard() {
	const drivers = useDataStore(({ state }) => state?.DriverList);
	const driversTiming = useDataStore(({ state }) => state?.TimingData);
	const noData = !drivers || !driversTiming;
	const graceOver = useLoadingGrace();
	const showTableHeader = useSettingsStore((state) => state.tableHeaders);
	const [showPace, setShowPace] = useState(false);

	return (
		<Panel
			title="Classification"
			className="px-1.5 pb-2"
			header={
				<>
					<ul className="flex flex-wrap items-center gap-3.5 text-xs text-fg-2">
						{LEGEND.map((item) => (
							<li key={item.label} className="flex items-center gap-1.5">
								<span aria-hidden className={clsx("size-2 rounded-[2px]", item.color)} />
								{item.label}
							</li>
						))}
					</ul>
					<button
						type="button"
						aria-pressed={showPace}
						onClick={() => setShowPace((v) => !v)}
						className={clsx(
							"ml-auto h-[30px] cursor-pointer rounded-md border border-border-subtle px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fg-1",
							showPace ? "bg-fg-1 text-bg" : "text-fg-2 hover:text-fg-1",
						)}
					>
						Pace view
					</button>
				</>
			}
		>
			<div className="overflow-x-auto">
				<div className="min-w-[840px]">
					{showTableHeader && <TableHeaders showPace={showPace} />}

					<div className="pt-1">
						{noData &&
							!graceOver &&
							new Array(22).fill("").map((_, index) => <SkeletonDriver key={`driver.loading.${index}`} />)}

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
				</div>
			</div>
		</Panel>
	);
}

const TableHeaders = ({ showPace }: { showPace: boolean }) => (
	<div
		className="grid h-[26px] items-center border-b border-border px-2.5 text-[11px] font-medium tracking-[0.04em] text-fg-3"
		style={{ columnGap: RACE_GRID_GAP, gridTemplateColumns: raceGridCols(showPace) }}
	>
		<span className="text-right">P</span>
		<span>DRIVER</span>
		<span>+/−</span>
		<span>&lt;1S</span>
		<span className="text-right">GAP</span>
		<span className="text-right">INT</span>
		<span className="text-right">LAST</span>
		<span className="text-right">BEST</span>
		<span className="grid" style={{ gridTemplateColumns: SECTOR_GRID, columnGap: SECTOR_GRID_GAP }}>
			<span>S1</span>
			<span>S2</span>
			<span>S3</span>
		</span>
		<span>{showPace ? "TYRE · AVG" : "TYRE"}</span>
	</div>
);

const SkeletonDriver = () => (
	<div className="flex h-row items-center px-2.5">
		<span className="h-3 w-full animate-pulse rounded-sm bg-surface-2" />
	</div>
);
