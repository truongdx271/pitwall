"use client";

import { useState } from "react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { sortPos } from "@/lib/sorting";
import { parseTimeMs } from "@/lib/timeUtils";
import { useLoadingGrace } from "@/hooks/useLoadingGrace";

import PracticeDriver from "@/components/driver/PracticeDriver";
import NoSession from "@/components/dashboard/NoSession";
import Panel from "@/components/ui/Panel";

import { practiceGridCols, QUALI_SECTOR_GAP, RACE_GRID_GAP, SECTOR_GRID } from "./raceGrid";

// The practice classification panel (SPEC §5, Practice.png).
export default function PracticeLeaderBoard() {
	const drivers = useDataStore(({ state }) => state?.DriverList);
	const driversTiming = useDataStore(({ state }) => state?.TimingData);
	const timingStats = useDataStore(({ state }) => state?.TimingStats);
	const sessionName = useDataStore(({ state }) => state?.SessionInfo?.Name ?? "Practice");
	const noData = !drivers || !driversTiming;
	const graceOver = useLoadingGrace();
	const showTableHeader = useSettingsStore((state) => state.tableHeaders);
	const [showPace, setShowPace] = useState(false);

	// Fastest lap in the field: the gap column is computed from best laps, as in quali.
	let fastestMs = Infinity;
	if (driversTiming) {
		Object.values(driversTiming.Lines).forEach((d) => {
			const ms = parseTimeMs(d.BestLapTime?.Value ?? "");
			if (ms < fastestMs) fastestMs = ms;
		});
	}

	return (
		<Panel
			title={`${sessionName} classification`}
			className="px-1.5 pb-2"
			header={
				<>
					<span className="text-xs text-fg-2">
						Ordered by best lap · sector cells show <span className="text-fg-1">current</span> /{" "}
						<span className="text-fg-3">personal best</span>
					</span>
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
				<div className={showPace ? "min-w-[940px]" : "min-w-[860px]"}>
					{showTableHeader && <PracticeHeaders showPace={showPace} />}

					<div className="pt-1">
						{noData && !graceOver && new Array(22).fill("").map((_, i) => <SkeletonDriver key={`fp.skeleton.${i}`} />)}

						{noData && graceOver && <NoSession />}

						<LayoutGroup key="practice-drivers">
							{drivers && driversTiming && (
								<AnimatePresence>
									{Object.values(driversTiming.Lines)
										.sort(sortPos)
										.map((timingDriver, index) => (
											<PracticeDriver
												key={`practice.driver.${timingDriver.RacingNumber}`}
												position={index + 1}
												driver={drivers[timingDriver.RacingNumber]}
												timingDriver={timingDriver}
												timingStats={timingStats?.Lines[timingDriver.RacingNumber]}
												fastestMs={fastestMs}
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

function PracticeHeaders({ showPace }: { showPace: boolean }) {
	return (
		<div
			className="grid h-[26px] items-center border-b border-border px-2.5 text-[11px] font-medium tracking-[0.04em] text-fg-3"
			style={{ columnGap: RACE_GRID_GAP, gridTemplateColumns: practiceGridCols(showPace) }}
		>
			<span className="text-right">P</span>
			<span>DRIVER</span>
			<span className="text-right">GAP</span>
			<span className="text-right">BEST</span>
			<span className="text-right">LAST</span>
			<span className="grid" style={{ gridTemplateColumns: SECTOR_GRID, columnGap: QUALI_SECTOR_GAP }}>
				<span>S1</span>
				<span>S2</span>
				<span>S3</span>
			</span>
			<span className="text-right">LAPS</span>
			<span>{showPace ? "TYRE · AVG · DEG" : "TYRE"}</span>
			<span>STATUS</span>
		</div>
	);
}

const SkeletonDriver = () => (
	<div className="flex h-row items-center px-2.5">
		<span className="h-3 w-full animate-pulse rounded-sm bg-surface-2" />
	</div>
);
