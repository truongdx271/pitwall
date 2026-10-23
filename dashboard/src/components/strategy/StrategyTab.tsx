"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { sortPos } from "@/lib/sorting";
import { stintLaps } from "@/lib/tyreStrategy";
import { displaySpeed, pitStops, stintSegments, strategyAxis, topSpeeds } from "@/lib/strategy";

import Panel from "@/components/ui/Panel";
import SegmentedControls from "@/components/ui/SegmentedControls";
import SelectMultiple from "@/components/ui/SelectMultiple";
import DriverChip from "@/components/driver/DriverChip";

const TYRE_BG: Record<string, string> = {
	SOFT: "bg-tyre-soft",
	MEDIUM: "bg-tyre-medium",
	HARD: "bg-tyre-hard",
	INTERMEDIATE: "bg-tyre-inter",
	WET: "bg-tyre-wet",
};

const TYRE_LETTER: Record<string, string> = { SOFT: "S", MEDIUM: "M", HARD: "H", INTERMEDIATE: "I", WET: "W" };

// Strategy tab (SPEC §8, Strategy.png): tyre strategy on the left, lap times and speed traps
// on the right. The logic is the old Tyres, Lap Times and Speed Traps pages'.
export default function StrategyTab() {
	return (
		<div className="flex h-full flex-wrap items-stretch gap-3 p-3 xl:flex-nowrap">
			<div className="flex min-w-0 flex-[999_1_760px] flex-col">
				<TyreStrategyPanel />
			</div>
			<div className="flex min-w-0 flex-[1_1_440px] flex-col gap-3 xl:max-w-[460px]">
				<LapTimesPanel />
				<SpeedTrapsPanel />
			</div>
		</div>
	);
}

const LEGEND = [
	["Soft", "bg-tyre-soft"],
	["Medium", "bg-tyre-medium"],
	["Hard", "bg-tyre-hard"],
	["Inter", "bg-tyre-inter"],
	["Wet", "bg-tyre-wet"],
] as const;

const STRATEGY_GRID = "24px 48px minmax(0, 1fr) 132px";

function TyreStrategyPanel() {
	const timingApp = useDataStore((s) => s.state?.TimingAppData?.Lines);
	const timing = useDataStore((s) => s.state?.TimingData?.Lines);
	const drivers = useDataStore((s) => s.state?.DriverList);
	const scheduledLaps = useDataStore((s) => s.state?.LapCount?.TotalLaps ?? 0);
	const [mode, setMode] = useState<"so-far" | "full">("so-far");

	const lines = timing ? Object.values(timing).sort(sortPos) : [];
	const runs = lines.map((l) => timingApp?.[l.RacingNumber]?.Stints ?? []);
	const axis = strategyAxis(mode, scheduledLaps, runs);
	const done = strategyAxis("so-far", 0, runs);
	const step = Math.max(1, Math.ceil(axis / 10));
	const ticks = Array.from({ length: Math.floor(axis / step) + 1 }, (_, i) => i * step);

	return (
		<Panel
			title="Tyre strategy"
			className="h-full"
			header={
				<>
					<ul className="flex flex-wrap items-center gap-3 text-xs text-fg-2">
						{LEGEND.map(([label, bg]) => (
							<li key={label} className="flex items-center gap-1.5">
								<span aria-hidden className={clsx("size-2 rounded-[2px]", bg)} />
								{label}
							</li>
						))}
					</ul>
					{/* Practice and quali have no race distance, so there is no full-race axis. */}
					{scheduledLaps > 0 && (
						<SegmentedControls
							className="ml-auto"
							selected={mode}
							onSelect={setMode}
							options={[
								{ label: "Laps so far", value: "so-far" },
								{ label: "Full race", value: "full" },
							]}
						/>
					)}
				</>
			}
		>
			<div
				className="grid h-[26px] items-center gap-x-2 border-b border-border px-2.5 text-[11px] font-medium tracking-[0.04em] text-fg-3"
				style={{ gridTemplateColumns: STRATEGY_GRID }}
			>
				<span className="text-right">P</span>
				<span>DRIVER</span>
				<span>STINTS BY LAP</span>
				<span>NOW · STOPS</span>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-1.5 pt-1">
				{lines.length === 0 && <p className="px-2 py-4 text-[13px] text-fg-2">Waiting for session data…</p>}
				{lines.map((line, index) => {
					const driver = drivers?.[line.RacingNumber];
					if (!driver) return null;
					const stints = timingApp?.[line.RacingNumber]?.Stints ?? [];
					const segments = stintSegments(stints);
					const current = stints[stints.length - 1];
					const out = !!(line.Retired || line.Stopped);
					const stops = pitStops(stints);
					const compound = (current?.Compound ?? "").toUpperCase();

					return (
						<div
							key={line.RacingNumber}
							className={clsx(
								"grid h-[29px] items-center gap-x-2 rounded-md px-1 font-mono text-[13px] tabular-nums",
								index % 2 === 1 && "bg-row-alt",
								out && "opacity-45",
							)}
							style={{ gridTemplateColumns: STRATEGY_GRID }}
						>
							<span className="text-right text-fg-2">{index + 1}</span>
							<DriverChip short={driver.Tla} teamColor={driver.TeamColour} />
							<span className="relative h-4 rounded-sm bg-surface-2" aria-label={`${stops} stops`}>
								{segments.map((s, k) => (
									<span
										key={k}
										className={clsx("absolute inset-y-0 rounded-[2px]", TYRE_BG[s.compound] ?? "bg-surface-3")}
										style={{
											left: `${(s.startLap / axis) * 100}%`,
											// a 2px gap marks the pit stop between stints
											width: `calc(${((s.endLap - s.startLap) / axis) * 100}% - 2px)`,
										}}
									/>
								))}
								<span
									aria-hidden
									className="absolute -inset-y-0.5 w-0.5 bg-fg-1"
									style={{ left: `${(done / axis) * 100}%` }}
								/>
							</span>
							<span className="flex items-center gap-2">
								{current ? (
									<span
										className={clsx(
											"inline-block min-w-9 rounded-tag px-[5px] py-0.5 text-center text-xs leading-[14px] font-bold",
											TYRE_BG[compound] ? `${TYRE_BG[compound]} text-bg` : "bg-surface-3 text-fg-2",
										)}
									>
										{TYRE_LETTER[compound] ?? "?"} {stintLaps(current)}
									</span>
								) : (
									<span className="text-fg-3">—</span>
								)}
								<span className="text-xs text-fg-2">
									{out ? "Retired" : `${stops} ${stops === 1 ? "stop" : "stops"}`}
								</span>
							</span>
						</div>
					);
				})}
			</div>

			<div
				className="grid h-7 items-center gap-x-2 px-2.5 text-[11px] text-fg-3"
				style={{ gridTemplateColumns: STRATEGY_GRID }}
			>
				<span />
				<span>Lap</span>
				<span className="relative h-full">
					{ticks
						// keep clear of the "now" label, which sits just right of the marker
						.filter((lap) => (lap > done ? (lap - done) / axis > 0.08 : (done - lap) / axis > 0.03))
						.map((lap) => (
							<span
								key={lap}
								className="absolute top-1.5 -translate-x-1/2 font-mono tabular-nums"
								style={{ left: `${(lap / axis) * 100}%` }}
							>
								{lap}
							</span>
						))}
					<span
						className="absolute top-1.5 translate-x-1 font-mono text-fg-1"
						style={{ left: `${(done / axis) * 100}%` }}
					>
						now
					</span>
				</span>
				<span />
			</div>
		</Panel>
	);
}

const MAX_COMPARE = 5;
const NO_LAPS: never[] = [];

function LapTimesPanel() {
	const drivers = useDataStore((s) => s.state?.DriverList);
	const timing = useDataStore((s) => s.state?.TimingData?.Lines);
	const lapTimes = useHistoryStore((s) => s.lapTimes);
	const [chosen, setChosen] = useState<string[]>([]);
	const [editing, setEditing] = useState(false);

	const order = timing
		? Object.values(timing)
				.sort(sortPos)
				.map((l) => l.RacingNumber)
		: [];
	// Up to five drivers: the viewer's picks, or the top five.
	const shown = (chosen.length > 0 ? chosen : order).slice(0, MAX_COMPARE).filter((nr) => drivers?.[nr]);
	const lastLap = Math.max(0, ...shown.flatMap((nr) => (lapTimes[nr] ?? NO_LAPS).map((e) => e.lap)));
	const laps = Array.from({ length: lastLap }, (_, i) => lastLap - i);
	const options = order
		.filter((nr) => drivers?.[nr])
		.map((nr) => ({ value: nr, label: `${drivers![nr].Tla} · ${drivers![nr].FullName}` }));

	return (
		<Panel
			title="Lap times"
			header={
				<>
					<span className="text-xs whitespace-nowrap text-fg-3">Compare up to {MAX_COMPARE}</span>
					<span className="ml-auto flex flex-wrap items-center gap-1">
						{shown.map((nr) => (
							<DriverChip key={nr} short={drivers![nr].Tla} teamColor={drivers![nr].TeamColour} size="sm" />
						))}
					</span>
					<button
						type="button"
						aria-expanded={editing}
						onClick={() => setEditing((v) => !v)}
						className="h-[30px] cursor-pointer rounded-md border border-border-subtle px-2.5 text-xs text-fg-2 hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
					>
						{editing ? "Done" : "Edit"}
					</button>
				</>
			}
		>
			{editing && (
				<div className="border-t border-border px-3 py-2">
					<SelectMultiple
						placeholder="Pick up to 5 drivers"
						options={options}
						selected={chosen}
						setSelected={(v) => setChosen(v.slice(0, MAX_COMPARE))}
					/>
				</div>
			)}

			<div className="max-h-[260px] overflow-y-auto border-t border-border px-1.5 pb-1.5">
				<table className="w-full font-mono text-[13px] tabular-nums">
					<thead className="sticky top-0 bg-surface-1">
						<tr className="h-[26px] text-[11px] font-medium tracking-[0.04em] text-fg-3">
							<th className="px-1.5 text-left font-medium">LAP</th>
							{shown.map((nr) => (
								<th key={nr} className="px-1.5 text-right font-medium">
									{drivers![nr].Tla}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{laps.length === 0 && (
							<tr>
								<td colSpan={shown.length + 1} className="px-1.5 py-3 font-sans text-[13px] text-fg-2">
									No laps recorded yet
								</td>
							</tr>
						)}
						{laps.map((lap, i) => (
							<tr key={lap} className={clsx("h-7", i % 2 === 1 && "bg-row-alt")}>
								<td className="rounded-l-md px-1.5 text-fg-3">{lap}</td>
								{shown.map((nr) => {
									const e = (lapTimes[nr] ?? NO_LAPS).find((x) => x.lap === lap);
									return (
										<td
											key={nr}
											className={clsx("px-1.5 text-right last:rounded-r-md", {
												"text-session-best": e?.overallFastest,
												"text-personal-best": e && !e.overallFastest && e.personalFastest,
												"text-fg-1": e && !e.overallFastest && !e.personalFastest,
												"text-fg-3": !e,
											})}
										>
											{e?.time ?? "—"}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}

const TRAPS = [
	{ key: "I1", label: "Intermediate 1" },
	{ key: "I2", label: "Intermediate 2" },
	{ key: "FL", label: "Finish line" },
	{ key: "ST", label: "Speed trap" },
] as const;

function SpeedTrapsPanel() {
	const stats = useDataStore((s) => s.state?.TimingStats?.Lines);
	const drivers = useDataStore((s) => s.state?.DriverList);
	const unit = useSettingsStore((s) => s.speedUnit);

	return (
		<Panel
			title="Speed traps"
			className="flex-1"
			header={
				<>
					<span className="text-xs text-fg-3">Top 5 · {unit === "metric" ? "km/h" : "mph"}</span>
					<Link
						href="/dashboard/speed-traps"
						className="ml-auto text-xs text-fg-2 hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
					>
						Full table
					</Link>
				</>
			}
		>
			<div className="grid flex-1 grid-cols-2 border-t border-border">
				{TRAPS.map((trap, i) => {
					const top = topSpeeds(
						Object.entries(stats ?? {}).map(([nr, line]) => ({ nr, value: line?.BestSpeeds?.[trap.key]?.Value })),
					);
					const max = top[0]?.kmh ?? 1;
					return (
						<div
							key={trap.key}
							className={clsx(
								"flex flex-col gap-1.5 p-3",
								i % 2 === 0 && "border-r border-border",
								i >= 2 && "border-t border-border",
							)}
						>
							<span className="text-[11px] text-fg-3">
								<span className="mr-1 font-semibold text-fg-1">{trap.key}</span>
								{trap.label}
							</span>
							{top.length === 0 && <span className="pt-2 text-xs text-fg-3">No readings yet this session</span>}
							{top.map((r, k) => {
								const d = drivers?.[r.nr];
								return (
									<div key={r.nr} className="flex items-center gap-2 font-mono text-[13px] tabular-nums">
										<span className="w-3 text-[11px] text-fg-3">{k + 1}</span>
										{d && <DriverChip short={d.Tla} teamColor={d.TeamColour} size="sm" />}
										<span className="h-1 flex-1 rounded-sm bg-surface-3" aria-hidden>
											<span className="block h-1 rounded-sm bg-fg-3" style={{ width: `${(r.kmh / max) * 100}%` }} />
										</span>
										<span className={clsx("w-9 text-right", k === 0 ? "text-session-best" : "text-fg-1")}>
											{displaySpeed(r.kmh, unit)}
										</span>
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</Panel>
	);
}
