"use client";

import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { sortPos } from "@/lib/sorting";
import { driverStatus } from "@/lib/driverStatus";
import { knockoutCutoff } from "@/lib/knockout";
import { formatDelta, pushLapDeltas } from "@/lib/pushLap";

import Panel from "@/components/ui/Panel";
import DriverChip from "@/components/driver/DriverChip";

const GRID = "44px minmax(0, 1fr) 66px 66px";

// Quali "On a push lap" panel (SPEC §6.3): running deltas over the completed sectors,
// against the driver's own bests and against the car at the cut-off (P1 in Q3).
export default function PushLapPanel() {
	const drivers = useDataStore((s) => s.state?.DriverList);
	const timing = useDataStore((s) => s.state?.TimingData);
	const stats = useDataStore((s) => s.state?.TimingStats);

	const lines = timing ? Object.values(timing.Lines).sort(sortPos) : [];
	const cutoff = knockoutCutoff(timing?.NoEntries, timing?.SessionPart);
	const refPos = cutoff ?? 1;
	const refLine = lines[refPos - 1];
	const refBest = (stats?.Lines[refLine?.RacingNumber ?? ""]?.BestSectors ?? []).map((s) => s?.Value);
	const refLabel = `P${refPos}`;

	const pushers = lines
		.map((line, index) => ({ line, position: index + 1 }))
		.filter(({ line }) => driverStatus(line) === "push");

	return (
		<Panel
			title="On a push lap"
			className="min-h-80 flex-1"
			header={
				<>
					<span className="rounded-tag bg-surface-3 px-1.5 py-px font-mono text-[11px] text-fg-2">
						{pushers.length}
					</span>
					{refLine?.BestLapTime?.Value && (
						<span className="ml-auto text-xs text-fg-3">
							{cutoff ? "Cut-off" : "Pole"}{" "}
							<span className="font-mono text-fg-1 tabular-nums">{refLine.BestLapTime.Value}</span> · {refLabel}
						</span>
					)}
				</>
			}
		>
			<div
				className="grid h-[22px] items-center gap-x-2 border-b border-border px-3 text-[11px] font-medium tracking-[0.04em] text-fg-3"
				style={{ gridTemplateColumns: GRID }}
			>
				<span />
				<span>PROGRESS</span>
				<span className="text-right">Δ OWN PB</span>
				<span className="text-right">{cutoff ? `Δ ${refLabel}` : "Δ POLE"}</span>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-1.5 pt-1 pb-1.5">
				{pushers.length === 0 && <p className="px-1.5 py-4 text-[13px] text-fg-2">No one on a push lap right now</p>}

				{pushers.map(({ line, position }) => {
					const driver = drivers?.[line.RacingNumber];
					if (!driver) return null;
					const ownBest = (stats?.Lines[line.RacingNumber]?.BestSectors ?? []).map((s) => s?.Value);
					const d = pushLapDeltas(line.Sectors, ownBest, refBest);
					const isRef = refLine?.RacingNumber === line.RacingNumber;
					const ko = cutoff != null && position > cutoff;

					return (
						<div
							key={line.RacingNumber}
							className="grid h-11 items-center gap-x-2 rounded-md px-1.5"
							style={{ gridTemplateColumns: GRID }}
						>
							<DriverChip short={driver.Tla} teamColor={driver.TeamColour} />
							<span className="flex min-w-0 flex-col gap-1">
								<span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-fg-2">
									P{position} · {d.completed ? `S${d.completed} done` : "Started"}
									{ko && (
										<span className="rounded-tag bg-loss/14 px-1 py-px text-[10px] font-semibold text-loss">KO</span>
									)}
								</span>
								<span className="flex h-1 gap-0.5" aria-hidden>
									{[0, 1, 2].map((k) => (
										<span
											key={k}
											className={clsx("h-full flex-1 rounded-sm", k < d.completed ? "bg-fg-1" : "bg-surface-3")}
										/>
									))}
								</span>
							</span>
							<DeltaValue ms={d.ownMs} sessionBest={d.sessionBest} />
							{isRef ? (
								<span className="text-right font-mono text-[13px] text-fg-3">is {refLabel}</span>
							) : (
								<DeltaValue ms={d.refMs} />
							)}
						</div>
					);
				})}
			</div>

			<p className="border-t border-border px-3 pt-2 pb-2.5 text-[11px] leading-normal text-fg-3">
				Deltas count completed sectors only, against the driver&apos;s best sectors and {refLabel}&apos;s best sectors.
				Not a lap prediction.
			</p>
		</Panel>
	);
}

function DeltaValue({ ms, sessionBest = false }: { ms: number | null; sessionBest?: boolean }) {
	if (ms == null) return <span className="text-right font-mono text-[13px] text-fg-3">—</span>;
	return (
		<span
			className={clsx(
				"text-right font-mono text-[13px] tabular-nums",
				// A sector that just set the PB is already in BestSectors, so it reads 0: count it as green.
				sessionBest ? "text-session-best" : ms <= 0 ? "text-personal-best" : "text-slower",
			)}
		>
			{formatDelta(ms)}
		</span>
	);
}
