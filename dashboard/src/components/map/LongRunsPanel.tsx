"use client";

import { useMemo } from "react";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { parseTimeMs } from "@/lib/timeUtils";
import { getStintBoundaries, formatMs } from "@/lib/stints";
import { longRun, type LongRun } from "@/lib/longRun";

import Panel from "@/components/ui/Panel";
import DriverChip from "@/components/driver/DriverChip";

const GRID = "44px 40px minmax(0, 1fr) 62px 56px";

const TYRE: Record<string, { letter: string; bg: string }> = {
	soft: { letter: "S", bg: "bg-tyre-soft" },
	medium: { letter: "M", bg: "bg-tyre-medium" },
	hard: { letter: "H", bg: "bg-tyre-hard" },
	intermediate: { letter: "I", bg: "bg-tyre-inter" },
	wet: { letter: "W", bg: "bg-tyre-wet" },
};

// Practice "Long runs" panel (SPEC §6.4): one row per driver whose current stint is a long run.
export default function LongRunsPanel() {
	const drivers = useDataStore((s) => s.state?.DriverList);
	const timing = useDataStore((s) => s.state?.TimingData);
	const app = useDataStore((s) => s.state?.TimingAppData);
	const lapTimes = useHistoryStore((s) => s.lapTimes);

	// Recomputed only when laps, stints or best laps change, not on every timing tick.
	const bestLaps = Object.values(timing?.Lines ?? {})
		.map((l) => `${l.RacingNumber}:${l.BestLapTime?.Value ?? ""}`)
		.join(",");
	const runs = useMemo(() => {
		const out: { nr: string; run: LongRun; compound: string }[] = [];
		for (const line of Object.values(timing?.Lines ?? {})) {
			const boundaries = getStintBoundaries(app?.Lines?.[line.RacingNumber]?.Stints ?? []);
			// The last stint with laps: a just-fitted set has none yet, so the previous one runs on.
			const current = boundaries[boundaries.length - 1];
			const best = parseTimeMs(line.BestLapTime?.Value ?? "");
			const run = longRun(lapTimes[line.RacingNumber] ?? [], current, boundaries, best);
			if (run && current) out.push({ nr: line.RacingNumber, run, compound: current.compound.toLowerCase() });
		}
		return out.sort((a, b) => a.run.avgMs - b.run.avgMs);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [app, lapTimes, bestLaps]);

	const fastest = runs[0]?.run.avgMs;
	const slowest = runs[runs.length - 1]?.run.avgMs;

	return (
		<Panel
			title="Long runs"
			className="min-h-80 flex-1"
			header={
				<>
					<span className="rounded-tag bg-surface-3 px-1.5 py-px font-mono text-[11px] text-fg-2">{runs.length}</span>
					<span className="ml-auto text-xs text-fg-3">Current stint, 5+ clean laps</span>
				</>
			}
		>
			<div
				className="grid h-[22px] items-center gap-x-2 border-b border-border px-3 text-[11px] font-medium tracking-[0.04em] text-fg-3"
				style={{ gridTemplateColumns: GRID }}
			>
				<span />
				<span>TYRE</span>
				<span>AVG</span>
				<span className="text-right">Δ BEST</span>
				<span className="text-right">DEG</span>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-1.5 pt-1 pb-1.5">
				{runs.length === 0 && <p className="px-1.5 py-4 text-[13px] text-fg-2">No long runs yet this session</p>}

				{runs.map(({ nr, run, compound }) => {
					const driver = drivers?.[nr];
					if (!driver || fastest == null) return null;
					const tyre = TYRE[compound];
					const delta = run.avgMs - fastest;
					// The fastest average is full width; the slowest keeps a sliver.
					const spread = (slowest ?? fastest) - fastest;
					const width = spread > 0 ? 100 - (delta / spread) * 80 : 100;
					const deg = run.degMsPerLap;

					return (
						<div
							key={nr}
							className="grid h-11 items-center gap-x-2 rounded-md px-1.5 font-mono text-[13px] tabular-nums"
							style={{ gridTemplateColumns: GRID }}
						>
							<DriverChip short={driver.Tla} teamColor={driver.TeamColour} />
							<span
								className={clsx(
									"inline-block min-w-9 rounded-tag px-1 py-0.5 text-center text-xs leading-[14px] font-bold",
									tyre ? `${tyre.bg} text-bg` : "bg-surface-3 text-fg-2",
								)}
							>
								{tyre?.letter ?? "?"} {run.laps}
							</span>
							<span className="flex min-w-0 flex-col gap-1">
								<span className="text-fg-1">{formatMs(run.avgMs)}</span>
								<span className="h-1 rounded-sm bg-surface-3" aria-hidden>
									<span className="block h-1 rounded-sm bg-fg-2" style={{ width: `${width}%` }} />
								</span>
							</span>
							<span className={clsx("text-right", delta === 0 ? "font-sans text-personal-best" : "text-fg-2")}>
								{delta === 0 ? "Best" : `+${(delta / 1000).toFixed(3)}`}
							</span>
							<span
								className={clsx("text-right text-xs", {
									"text-loss": deg != null && deg > 80,
									"text-personal-best": deg != null && deg < 30,
									"text-fg-2": deg != null && deg >= 30 && deg <= 80,
									"text-fg-3": deg == null,
								})}
							>
								{deg == null ? "—" : `${deg >= 0 ? "+" : "−"}${(Math.abs(deg) / 1000).toFixed(3)}`}
							</span>
						</div>
					);
				})}
			</div>

			<p className="border-t border-border px-3 pt-2 pb-2.5 text-[11px] leading-normal text-fg-3">
				Laps slower than 107% of the driver&apos;s best are left out. Fuel loads aren&apos;t published, so compare with
				care.
			</p>
		</Panel>
	);
}
