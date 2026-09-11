"use client";

import { useDataStore } from "@/stores/useDataStore";
import { stintLaps, tyreLapScale } from "@/lib/tyreStrategy";
import type { Stint } from "@/types/state.type";

const COMPOUND_COLORS: Record<string, string> = {
	SOFT: "#E8002D",
	MEDIUM: "#FFF200",
	HARD: "#F0F0F0",
	INTERMEDIATE: "#39B54A",
	WET: "#0085FF",
	UNKNOWN: "#555555",
};

const COMPOUND_TEXT: Record<string, string> = {
	SOFT: "#fff",
	MEDIUM: "#000",
	HARD: "#000",
	INTERMEDIATE: "#fff",
	WET: "#fff",
	UNKNOWN: "#fff",
};

const COMPOUND_LETTER: Record<string, string> = {
	SOFT: "S",
	MEDIUM: "M",
	HARD: "H",
	INTERMEDIATE: "I",
	WET: "W",
	UNKNOWN: "?",
};

const X_TICKS = 10;

function isLight(hex: string): boolean {
	if (!hex || hex.length < 6) return false;
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export default function TyreStrategy() {
	const timingApp = useDataStore((s) => s.state?.TimingAppData?.Lines);
	const driverList = useDataStore((s) => s.state?.DriverList);
	const scheduledLaps = useDataStore((s) => s.state?.LapCount?.TotalLaps ?? 0);
	const currentLap = useDataStore((s) => s.state?.LapCount?.CurrentLap ?? 0);

	if (!timingApp || !driverList) {
		return <div className="px-2 py-1 font-mono text-sm text-zinc-700">waiting for session data...</div>;
	}

	const drivers = Object.values(timingApp)
		.filter((d) => driverList[d.RacingNumber])
		.sort((a, b) => a.Line - b.Line);

	const totalLaps = tyreLapScale(
		scheduledLaps,
		drivers.map((d) => d.Stints ?? []),
	);

	const tickInterval = Math.ceil(totalLaps / X_TICKS);
	// Drop the last regular tick when it would crowd the "total laps" label at the end.
	const ticks = Array.from({ length: Math.floor(totalLaps / tickInterval) + 1 }, (_, i) => i * tickInterval).filter(
		(lap) => lap > 0 && lap < totalLaps - tickInterval / 2,
	);

	const usedCompounds = Array.from(
		new Set(
			drivers.flatMap((d) => (d.Stints ?? []).map((s) => s.Compound ?? "UNKNOWN")).filter((c) => c in COMPOUND_LETTER),
		),
	);

	return (
		<div className="flex w-full flex-col px-2 py-1 font-mono">
			<div className="mb-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
				<span className="text-[11px] tracking-widest text-zinc-500 uppercase">tyre strategy</span>
				{usedCompounds.length > 0 && (
					<span className="flex items-center gap-3 text-[10px] text-zinc-500">
						{usedCompounds.map((c) => (
							<span key={c} className="flex items-center gap-1">
								<span className="inline-block h-2 w-2" style={{ backgroundColor: COMPOUND_COLORS[c] }} />
								{COMPOUND_LETTER[c]}
							</span>
						))}
					</span>
				)}
			</div>

			{scheduledLaps === 0 && (
				<p className="mb-2 text-[11px] text-zinc-500">Laps completed per driver — scale grows with the session.</p>
			)}

			<div className="flex min-w-0 flex-1 flex-col gap-px overflow-auto pr-[1.5ch]">
				{drivers.map((d) => {
					const driver = driverList[d.RacingNumber];
					if (!driver) return null;

					const teamColor = driver.TeamColour ? `#${driver.TeamColour}` : "#444";
					const textColor = driver.TeamColour && isLight(driver.TeamColour) ? "#000" : "#fff";
					const stints = d.Stints ?? [];
					const pitLaps = getPitLaps(stints);

					return (
						<div key={d.RacingNumber} className="flex items-center gap-2">
							{/* Driver label — highlighted like the rest of the UI */}
							<div className="w-8 shrink-0 text-right">
								<span
									className="px-[0.3ch] text-[11px] leading-none font-bold"
									style={{ backgroundColor: teamColor, color: textColor }}
								>
									{driver.Tla}
								</span>
							</div>

							{/* Bar area */}
							<div className="relative h-5 flex-1 bg-zinc-900">
								{renderStints(stints, totalLaps)}

								{/* Pit stop markers */}
								{pitLaps.map((lap) => (
									<div
										key={lap}
										className="absolute top-0 z-10 h-full w-px bg-black/70"
										style={{ left: `${(lap / totalLaps) * 100}%` }}
										title={`Pit at lap ${lap}`}
									/>
								))}

								{/* Current lap marker */}
								{currentLap > 0 && (
									<div
										className="absolute top-0 z-20 h-full w-px bg-white/40"
										style={{ left: `${(currentLap / totalLaps) * 100}%` }}
									/>
								)}
							</div>
						</div>
					);
				})}

				{/* Lap ruler */}
				<div className="mt-1 flex items-start gap-2">
					<div className="w-8 shrink-0" />
					<div className="relative h-4 flex-1">
						{/* Regular tick numbers */}
						{ticks.map((lap) => (
							<span
								key={lap}
								className="absolute -translate-x-1/2 text-[10px] text-zinc-700 tabular-nums"
								style={{ left: `${(lap / totalLaps) * 100}%` }}
							>
								{lap}
							</span>
						))}
						{/* Total laps — flush with the right edge so it can't clip */}
						<span className="absolute right-0 text-[10px] text-zinc-600 tabular-nums">{totalLaps}</span>
						{/* Current lap — white, bold */}
						{currentLap > 0 && (
							<span
								className="absolute -translate-x-1/2 text-[10px] font-bold text-zinc-300 tabular-nums"
								style={{ left: `${(currentLap / totalLaps) * 100}%` }}
							>
								{currentLap}
							</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function getPitLaps(stints: Stint[]): number[] {
	const laps: number[] = [];
	let offset = 0;
	for (let i = 0; i < stints.length - 1; i++) {
		const lapsInStint = stintLaps(stints[i]);
		offset += lapsInStint;
		if (lapsInStint > 0) laps.push(offset);
	}
	return laps;
}

function renderStints(stints: Stint[], totalLaps: number) {
	let offset = 0;

	return stints.map((stint, i) => {
		const laps = stintLaps(stint);
		// A one-lap wet or intermediate run is still a valid stint.
		if (laps === 0) return null;
		const compound = stint.Compound ?? "UNKNOWN";

		const startLap = offset + 1;
		const endLap = offset + laps;
		const leftPct = (offset / totalLaps) * 100;
		const widthPct = (laps / totalLaps) * 100;
		const bg = COMPOUND_COLORS[compound] ?? COMPOUND_COLORS.UNKNOWN;
		const fg = COMPOUND_TEXT[compound] ?? "#fff";
		const letter = COMPOUND_LETTER[compound] ?? "?";
		const isNew = stint.New?.toUpperCase() === "TRUE";
		const isCurrent = i === stints.length - 1;

		offset += laps;

		// Decide what label to show based on available width
		const widthChars = (widthPct / 100) * 80; // rough estimate at typical width
		const label = widthChars > 10 ? `${letter} ${startLap}–${endLap}` : widthChars > 4 ? letter : "";

		return (
			<div
				key={i}
				className="absolute top-0 flex h-full items-center overflow-hidden px-0.5"
				style={{
					left: `${leftPct}%`,
					width: `calc(${widthPct}% - 1px)`,
					backgroundColor: bg,
					outline: isNew ? "none" : "1px solid rgba(255,255,255,0.15)",
					opacity: isCurrent ? 1 : 0.85,
				}}
				title={`${compound}${isNew ? "" : " (used)"} — L${startLap}–${endLap} (${laps} laps)`}
			>
				<span className="truncate text-[10px] leading-none font-bold tabular-nums" style={{ color: fg }}>
					{label}
				</span>
			</div>
		);
	});
}
