"use client";

import { useState } from "react";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useHeadToHeadStore } from "@/stores/useHeadToHeadStore";
import { getStintBoundaries, classifyLap, type StintBoundary } from "@/lib/stints";

// ── Component ────────────────────────────────────────────────────────────────

export default function LapTimes() {
	const driverList = useDataStore((s) => s.state?.DriverList);
	const currentLap = useDataStore((s) => s.state?.LapCount?.CurrentLap ?? 0);
	const timingLines = useDataStore((s) => s.state?.TimingData?.Lines);
	const timingAppLines = useDataStore((s) => s.state?.TimingAppData?.Lines);
	const lapTimes = useHistoryStore((s) => s.lapTimes);

	const { first, second, setFirst, setSecond } = useHeadToHeadStore();

	const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
	const [showPicker, setShowPicker] = useState(false);
	const [compareMode, setCompareMode] = useState(false);

	if (!driverList) {
		return <div className="px-2 py-1 font-mono text-sm text-zinc-700">waiting for session data...</div>;
	}

	const allDrivers = Object.values(driverList).sort((a, b) => {
		const posA = parseInt(timingLines?.[a.RacingNumber]?.Position ?? "99");
		const posB = parseInt(timingLines?.[b.RacingNumber]?.Position ?? "99");
		return posA - posB;
	});

	const visibleDrivers =
		selectedDrivers.size > 0 ? allDrivers.filter((d) => selectedDrivers.has(d.RacingNumber)) : allDrivers.slice(0, 5);

	const laps = Array.from({ length: currentLap }, (_, i) => currentLap - i);

	const toggleDriver = (nr: string) => {
		setSelectedDrivers((prev) => {
			const next = new Set(prev);
			if (next.has(nr)) next.delete(nr);
			else next.add(nr);
			return next;
		});
	};

	const selectAll = () => setSelectedDrivers(new Set(allDrivers.map((d) => d.RacingNumber)));
	const selectNone = () => setSelectedDrivers(new Set());

	// Precompute stint boundaries per driver
	const stintBoundariesByDriver: Record<string, StintBoundary[]> = {};
	for (const d of allDrivers) {
		const stints = timingAppLines?.[d.RacingNumber]?.Stints ?? [];
		stintBoundariesByDriver[d.RacingNumber] = getStintBoundaries(stints);
	}

	// Compare mode drivers
	const d1 = first ? driverList[first] : null;
	const d2 = second ? driverList[second] : null;

	return (
		<div className="flex w-full flex-col font-mono">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-800 px-2 py-0.5">
				<span className="text-[11px] tracking-widest text-zinc-500 uppercase">lap times</span>
				<div className="flex items-center gap-3">
					<button
						onClick={() => setCompareMode((v) => !v)}
						className={clsx("text-[11px] tracking-widest uppercase transition-colors", {
							"text-zinc-400": compareMode,
							"text-zinc-700 hover:text-zinc-400": !compareMode,
						})}
					>
						compare
					</button>
					<span className="text-zinc-800">│</span>
					<button
						onClick={() => setShowPicker((v) => !v)}
						className="text-[11px] tracking-widest text-zinc-700 uppercase transition-colors hover:text-zinc-400"
					>
						drivers ({visibleDrivers.length})
					</button>
				</div>
			</div>

			{/* Driver picker */}
			{showPicker && (
				<div className="border-b border-zinc-800 px-2 py-1">
					<div className="mb-1 flex gap-2">
						<button
							onClick={selectAll}
							className="text-[11px] tracking-widest text-zinc-500 uppercase hover:text-zinc-300"
						>
							all
						</button>
						<span className="text-zinc-700">│</span>
						<button
							onClick={selectNone}
							className="text-[11px] tracking-widest text-zinc-500 uppercase hover:text-zinc-300"
						>
							none
						</button>
						<span className="text-zinc-700">│</span>
						<button
							onClick={() => setShowPicker(false)}
							className="text-[11px] tracking-widest text-zinc-500 uppercase hover:text-zinc-300"
						>
							done
						</button>
					</div>
					<div className="flex flex-wrap gap-1">
						{allDrivers.map((d) => {
							const selected =
								selectedDrivers.size === 0 ? visibleDrivers.includes(d) : selectedDrivers.has(d.RacingNumber);
							return (
								<button
									key={d.RacingNumber}
									onClick={() => toggleDriver(d.RacingNumber)}
									className={clsx("text-[11px] font-bold transition-opacity", { "opacity-30": !selected })}
									style={{ color: `#${d.TeamColour}` }}
								>
									{d.Tla}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Compare mode */}
			{compareMode ? (
				<div className="flex flex-col">
					<div className="flex items-center gap-2 border-b border-zinc-800 px-2 py-1">
						<select
							value={first ?? ""}
							onChange={(e) => setFirst(e.target.value || null)}
							className="border border-zinc-800 bg-black px-1 py-0.5 text-[11px] tracking-widest text-zinc-400 uppercase focus:outline-none"
						>
							<option value="">driver A</option>
							{allDrivers.map((d) => (
								<option key={d.RacingNumber} value={d.RacingNumber}>
									{d.Tla}
								</option>
							))}
						</select>
						<span className="text-[11px] text-zinc-700">vs</span>
						<select
							value={second ?? ""}
							onChange={(e) => setSecond(e.target.value || null)}
							className="border border-zinc-800 bg-black px-1 py-0.5 text-[11px] tracking-widest text-zinc-400 uppercase focus:outline-none"
						>
							<option value="">driver B</option>
							{allDrivers.map((d) => (
								<option key={d.RacingNumber} value={d.RacingNumber}>
									{d.Tla}
								</option>
							))}
						</select>
					</div>

					{!d1 || !d2 ? (
						<div className="px-2 py-3 text-[11px] text-zinc-700">select two drivers to compare</div>
					) : (
						<div className="overflow-auto">
							<table className="w-full min-w-max text-sm">
								<thead className="sticky top-0 bg-black">
									<tr className="border-b-2 border-zinc-600">
										<th className="px-2 py-0.5 text-left text-[11px] tracking-widest text-zinc-500 uppercase">LAP</th>
										<th className="px-2 py-0.5 text-right text-[11px] font-bold" style={{ color: `#${d1.TeamColour}` }}>
											{d1.Tla}
										</th>
										<th className="px-2 py-0.5 text-center text-[11px] tracking-widest text-zinc-500 uppercase">Δ</th>
										<th className="px-2 py-0.5 text-left text-[11px] font-bold" style={{ color: `#${d2.TeamColour}` }}>
											{d2.Tla}
										</th>
									</tr>
								</thead>
								<tbody>
									{laps.map((lap) => {
										const e1 = lapTimes[d1.RacingNumber]?.find((e) => e.lap === lap);
										const e2 = lapTimes[d2.RacingNumber]?.find((e) => e.lap === lap);
										const delta = e1 && e2 ? e1.ms - e2.ms : null;
										const d1Faster = delta !== null && delta < 0;
										const d2Faster = delta !== null && delta > 0;
										return (
											<tr key={lap} className="border-b border-zinc-900">
												<td className="px-2 py-0.5 text-[11px] text-zinc-600 tabular-nums">{lap}</td>
												<td
													className={clsx(
														"px-2 py-0.5 text-right text-sm tabular-nums",
														d1Faster ? "text-emerald-400" : "text-zinc-300",
													)}
												>
													{e1 ? e1.time : <span className="text-zinc-800">—</span>}
												</td>
												<td className="px-2 py-0.5 text-center text-[11px] tabular-nums">
													{delta !== null ? (
														<span
															className={clsx(
																delta < 0 ? "text-emerald-400" : delta > 0 ? "text-red-400" : "text-zinc-600",
															)}
														>
															{delta > 0 ? "+" : ""}
															{(delta / 1000).toFixed(3)}
														</span>
													) : (
														<span className="text-zinc-800">—</span>
													)}
												</td>
												<td
													className={clsx(
														"px-2 py-0.5 text-left text-sm tabular-nums",
														d2Faster ? "text-emerald-400" : "text-zinc-300",
													)}
												>
													{e2 ? e2.time : <span className="text-zinc-800">—</span>}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			) : currentLap === 0 ? (
				<div className="px-2 py-3 text-sm text-zinc-700">no laps completed yet</div>
			) : (
				<div className="overflow-auto">
					<table className="w-full min-w-max text-sm">
						<thead className="sticky top-0 bg-black">
							<tr className="border-b-2 border-zinc-600">
								<th className="px-2 py-0.5 text-left text-[11px] tracking-widest text-zinc-500 uppercase">LAP</th>
								{visibleDrivers.map((d) => (
									<th
										key={d.RacingNumber}
										className="px-2 py-0.5 text-right text-[11px] font-bold"
										style={{ color: `#${d.TeamColour}` }}
									>
										{d.Tla}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{laps.map((lap) => (
								<tr key={lap} className="border-b border-zinc-900">
									<td className="px-2 py-0.5 text-[11px] text-zinc-600 tabular-nums">{lap}</td>
									{visibleDrivers.map((d) => {
										const entry = lapTimes[d.RacingNumber]?.find((e) => e.lap === lap);
										const boundaries = stintBoundariesByDriver[d.RacingNumber];
										const lapType = boundaries.length > 0 ? classifyLap(lap, boundaries) : "push";
										return (
											<td key={d.RacingNumber} className="px-2 py-0.5 text-right tabular-nums">
												{entry ? (
													<span className="inline-flex items-baseline gap-0.5">
														<span
															className={clsx("text-sm", {
																"text-violet-400": entry.overallFastest,
																"text-emerald-400": !entry.overallFastest && entry.personalFastest,
																"text-zinc-300": !entry.overallFastest && !entry.personalFastest,
															})}
														>
															{entry.time}
														</span>
														{lapType === "out" && <span className="text-[9px] text-zinc-600">O</span>}
														{lapType === "in" && <span className="text-[9px] text-zinc-600">I</span>}
													</span>
												) : (
													<span className="text-zinc-800">—</span>
												)}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
