"use client";

import { Fragment } from "react";
import { AnimatePresence, LayoutGroup } from "motion/react";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { sortPos } from "@/lib/sorting";
import { parseTimeMs } from "@/lib/timeUtils";
import { sessionPartPrefix } from "@/lib/sessionPart";
import { knockedOutCount, knockoutCutoff } from "@/lib/knockout";
import { useLoadingGrace } from "@/hooks/useLoadingGrace";

import QualiDriver from "@/components/driver/QualiDriver";
import NoSession from "@/components/dashboard/NoSession";
import Panel from "@/components/ui/Panel";

import { QUALI_GRID_COLS, QUALI_SECTOR_GAP, RACE_GRID_GAP, SECTOR_GRID } from "./raceGrid";

// The qualifying classification panel (SPEC §4, Quali.png).
export default function QualiLeaderBoard() {
	const drivers = useDataStore(({ state }) => state?.DriverList);
	const driversTiming = useDataStore(({ state }) => state?.TimingData);
	const timingStats = useDataStore(({ state }) => state?.TimingStats);
	const sessionName = useDataStore(({ state }) => state?.SessionInfo?.Name ?? "");
	const noData = !drivers || !driversTiming;
	const graceOver = useLoadingGrace();
	const showTableHeader = useSettingsStore((state) => state.tableHeaders);

	// Pole time = fastest complete lap in the field. Drives the gap-to-pole column
	// (the quali feed has no reliable GapToLeader).
	let poleMs = Infinity;
	if (driversTiming) {
		Object.values(driversTiming.Lines).forEach((d) => {
			const ms = parseTimeMs(d.BestLapTime?.Value ?? "");
			if (ms < poleMs) poleMs = ms;
		});
	}

	const sessionPart = driversTiming?.SessionPart;
	const part = sessionPart ? `${sessionPartPrefix(sessionName) || "Q"}${sessionPart}` : null;
	const cutoff = knockoutCutoff(driversTiming?.NoEntries, sessionPart);
	const outCount = knockedOutCount(driversTiming?.NoEntries, sessionPart);

	return (
		<Panel
			title={part ? `${part} classification` : "Qualifying classification"}
			className="px-1.5 pb-2"
			header={
				<span className="text-xs text-fg-2">
					{outCount != null && `Bottom ${outCount} are knocked out · `}
					sector cells show <span className="text-fg-1">current</span> /{" "}
					<span className="text-fg-3">personal best</span>
				</span>
			}
		>
			<div className="overflow-x-auto">
				<div className="min-w-[860px]">
					{showTableHeader && <QualiHeaders />}

					<div className="pt-1">
						{noData &&
							!graceOver &&
							new Array(22).fill("").map((_, i) => <SkeletonDriver key={`quali.skeleton.${i}`} />)}

						{noData && graceOver && <NoSession />}

						<LayoutGroup key="quali-drivers">
							{drivers && driversTiming && (
								<AnimatePresence>
									{Object.values(driversTiming.Lines)
										.sort(sortPos)
										.map((timingDriver, index) => {
											const position = index + 1;
											return (
												<Fragment key={`quali.driver.${timingDriver.RacingNumber}`}>
													{cutoff != null && position === cutoff + 1 && <KnockoutDivider part={part} />}
													<QualiDriver
														position={position}
														driver={drivers[timingDriver.RacingNumber]}
														timingDriver={timingDriver}
														timingStats={timingStats?.Lines[timingDriver.RacingNumber]}
														poleMs={poleMs}
														knockout={cutoff != null && position > cutoff}
													/>
												</Fragment>
											);
										})}
								</AnimatePresence>
							)}
						</LayoutGroup>
					</div>
				</div>
			</div>
		</Panel>
	);
}

// Between P[cut-off] and P[cut-off + 1] (SPEC §4).
function KnockoutDivider({ part }: { part: string | null }) {
	return (
		<div role="separator" className="flex items-center gap-2.5 px-2.5 pt-1.5 pb-1">
			<span className="h-px flex-1 bg-loss/50" />
			<span className="text-[11px] font-semibold tracking-[0.05em] text-loss">
				KNOCKOUT ZONE{part ? ` — OUT AFTER ${part}` : ""}
			</span>
			<span className="h-px flex-1 bg-loss/50" />
		</div>
	);
}

function QualiHeaders() {
	return (
		<div
			className="grid h-[26px] items-center border-b border-border px-2.5 text-[11px] font-medium tracking-[0.04em] text-fg-3"
			style={{ columnGap: RACE_GRID_GAP, gridTemplateColumns: QUALI_GRID_COLS }}
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
			<span>TYRE</span>
			<span>STATUS</span>
		</div>
	);
}

const SkeletonDriver = () => (
	<div className="flex h-row items-center px-2.5">
		<span className="h-3 w-full animate-pulse rounded-sm bg-surface-2" />
	</div>
);
