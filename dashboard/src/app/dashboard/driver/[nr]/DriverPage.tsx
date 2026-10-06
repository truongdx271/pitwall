"use client";

import { use } from "react";
import Link from "next/link";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { sortUtc } from "@/lib/sorting";

import DriverTag from "@/components/driver/DriverTag";
import DriverTire from "@/components/driver/DriverTire";
import DriverGap from "@/components/driver/DriverGap";
import DriverLapTime from "@/components/driver/DriverLapTime";
import DriverMiniSectors from "@/components/driver/DriverMiniSectors";
import DriverCarMetrics from "@/components/driver/DriverCarMetrics";
import DriverHistoryTires from "@/components/driver/DriverHistoryTires";
import DriverDRS from "@/components/driver/DriverDRS";
import DriverInfo from "@/components/driver/DriverInfo";
import RadioMessage from "@/components/dashboard/RadioMessage";

type Props = { params: Promise<{ nr: string }> };

const hasDRS = (drs: number) => drs > 9;
const possibleDRS = (drs: number) => drs === 8;

const COMPOUND_COLORS: Record<string, string> = {
	SOFT: "#E8002D",
	MEDIUM: "#FFF200",
	HARD: "#F0F0F0",
	INTERMEDIATE: "#39B54A",
	WET: "#0085FF",
	UNKNOWN: "#888888",
};

const COMPOUND_TEXT: Record<string, string> = {
	SOFT: "#fff",
	MEDIUM: "#000",
	HARD: "#000",
	INTERMEDIATE: "#fff",
	WET: "#fff",
	UNKNOWN: "#fff",
};

export default function DriverPage({ params }: Props) {
	const { nr } = use(params);

	const driver = useDataStore((s) => s.state?.DriverList?.[nr]);
	const timingDriver = useDataStore((s) => s.state?.TimingData?.Lines?.[nr]);
	const timingStats = useDataStore((s) => s.state?.TimingStats?.Lines?.[nr]);
	const appTiming = useDataStore((s) => s.state?.TimingAppData?.Lines?.[nr]);
	const sessionPart = useDataStore((s) => s.state?.TimingData?.SessionPart);
	const sessionPath = useDataStore((s) => s.state?.SessionInfo?.Path);
	const gmtOffset = useDataStore((s) => s.state?.SessionInfo?.GmtOffset);
	const totalLaps = useDataStore((s) => s.state?.LapCount?.TotalLaps ?? 0);
	const teamRadio = useDataStore((s) => s.state?.TeamRadio);
	const carData = useDataStore((s) => (s.carsData ? s.carsData[nr]?.Channels : undefined));
	const lapHistory = useHistoryStore((s) => s.lapTimes[nr]);
	const speedUnit = useSettingsStore((s) => s.speedUnit);
	const timingLines = useDataStore((s) => s.state?.TimingData?.Lines);

	const hasFastest = timingStats?.PersonalBestLapTime.Position === 1;
	const basePath = `https://livetiming.formula1.com/static/${sessionPath}`;
	const driverRadios = teamRadio?.Captures?.filter((c) => c.RacingNumber === nr).sort(sortUtc) ?? [];

	const position = timingLines
		? Object.values(timingLines)
				.sort((a, b) => parseInt(a.Position) - parseInt(b.Position))
				.findIndex((d) => d.RacingNumber === nr) + 1
		: 0;

	if (!driver) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="text-zinc-500">driver not found</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col overflow-y-auto">
			{/* Header */}
			<div
				className="flex items-center gap-3 border-b border-zinc-800 p-4"
				style={{ borderTopColor: `#${driver.TeamColour}`, borderTopWidth: 3 }}
			>
				<DriverTag position={position || undefined} short={driver.Tla} teamColor={driver.TeamColour} />
				<div className="min-w-0 flex-1">
					<p className="truncate text-xl font-bold">{driver.FullName}</p>
					<p className="text-sm text-zinc-400">{driver.TeamName}</p>
				</div>
				<Link
					href="/dashboard"
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
				>
					✕
				</Link>
			</div>

			<div className="flex flex-col divide-y divide-zinc-800/60">
				{/* Status row */}
				{timingDriver && (
					<div className="flex flex-wrap items-center gap-6 px-4 py-3">
						<DriverDRS
							on={carData ? hasDRS(carData[45] ?? 0) : false}
							possible={carData ? possibleDRS(carData[45] ?? 0) : false}
							inPit={timingDriver.InPit}
							pitOut={timingDriver.PitOut}
						/>
						<DriverInfo timingDriver={timingDriver} gridPos={appTiming ? parseInt(appTiming.GridPos) : 0} />
						<DriverGap timingDriver={timingDriver} sessionPart={sessionPart} />
						<DriverLapTime last={timingDriver.LastLapTime} best={timingDriver.BestLapTime} hasFastest={hasFastest} />
					</div>
				)}

				{/* Car telemetry */}
				{carData && (
					<div className="px-4 py-3">
						<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Car</p>
						<DriverCarMetrics carData={carData} />
					</div>
				)}

				{/* Current sectors */}
				{timingDriver && (
					<div className="px-4 py-3">
						<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Sectors</p>
						<DriverMiniSectors sectors={timingDriver.Sectors} />
					</div>
				)}

				{/* Tyres */}
				{appTiming?.Stints && (
					<div className="px-4 py-3">
						<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Tyres</p>
						<div className="flex items-center gap-4">
							<DriverTire stints={appTiming.Stints} />
							<DriverHistoryTires stints={appTiming.Stints} />
						</div>
					</div>
				)}

				{/* Strategy bar */}
				{appTiming?.Stints && totalLaps > 0 && (
					<div className="px-4 py-3">
						<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Strategy</p>
						<div className="relative h-6 w-full rounded-sm bg-zinc-900">
							{(() => {
								let offset = 0;
								return (appTiming.Stints ?? []).map((stint, i) => {
									const laps = stint.TotalLaps ?? 0;
									if (laps === 0) return null;
									const leftPct = (offset / totalLaps) * 100;
									const widthPct = (laps / totalLaps) * 100;
									const compound = stint.Compound ?? "UNKNOWN";
									const bg = COMPOUND_COLORS[compound] ?? COMPOUND_COLORS.UNKNOWN;
									const fg = COMPOUND_TEXT[compound] ?? "#fff";
									offset += laps;
									return (
										<div
											key={i}
											className="absolute top-0 flex h-full items-center overflow-hidden rounded-sm px-1"
											style={{ left: `${leftPct}%`, width: `calc(${widthPct}% - 1px)`, backgroundColor: bg }}
											title={`${compound} — ${laps} laps${stint.New === "TRUE" ? "" : " (used)"}`}
										>
											<span className="truncate text-xs font-semibold" style={{ color: fg }}>
												{laps}L
											</span>
										</div>
									);
								});
							})()}
						</div>
					</div>
				)}

				{/* Speed traps */}
				{timingStats?.BestSpeeds && (
					<div className="px-4 py-3">
						<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Speed Traps</p>
						<div className="grid grid-cols-4 gap-3">
							{(
								[
									["I1", timingStats.BestSpeeds.I1],
									["I2", timingStats.BestSpeeds.I2],
									["FL", timingStats.BestSpeeds.Fl],
									["ST", timingStats.BestSpeeds.St],
								] as const
							).map(([label, speed]) => (
								<div key={label} className="flex flex-col">
									<p className="text-xs text-zinc-500">{label}</p>
									<p className={clsx("font-mono font-medium", { "text-violet-400": speed?.Position === 1 })}>
										{speed?.Value
											? speedUnit === "metric"
												? speed.Value
												: String(Math.floor(parseInt(speed.Value) / 1.609344))
											: "—"}
									</p>
									<p className="text-xs text-zinc-600">P{speed?.Position ?? "—"}</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Lap history */}
				{lapHistory && lapHistory.length > 0 && (
					<div className="px-4 py-3">
						<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">Lap History</p>
						<div className="no-scrollbar max-h-48 overflow-y-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-xs text-zinc-500">
										<th className="pr-4 pb-1">Lap</th>
										<th className="pb-1">Time</th>
									</tr>
								</thead>
								<tbody>
									{[...lapHistory].reverse().map((entry) => (
										<tr key={entry.lap} className="border-t border-zinc-800/50">
											<td className="py-0.5 pr-4 text-zinc-500">{entry.lap}</td>
											<td
												className={clsx("py-0.5 font-mono", {
													"text-violet-400": entry.overallFastest,
													"text-emerald-400": !entry.overallFastest && entry.personalFastest,
													"text-zinc-300": !entry.overallFastest && !entry.personalFastest,
												})}
											>
												{entry.time}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Team radio */}
				{driverRadios.length > 0 && gmtOffset && (
					<div className="px-4 py-3">
						<p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
							Team Radio ({driverRadios.length})
						</p>
						<ul className="flex flex-col gap-2">
							{driverRadios.slice(0, 10).map((capture, i) => (
								<RadioMessage key={`radio.${i}`} driver={driver} capture={capture} basePath={basePath} />
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
}
