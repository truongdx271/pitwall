"use client";

import { useEffect, useMemo, useState } from "react";

import { useDataStore } from "@/stores/useDataStore";

import {
	fetchBaseStandings,
	predictStandings,
	RACE_POINTS,
	SPRINT_POINTS,
	type BaseStandings,
	type PredictedDriver,
} from "@/lib/standings";

export default function Standings() {
	const feedPrediction = useDataStore((state) => state.state?.ChampionshipPrediction);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timingLines = useDataStore((state) => state.state?.TimingData?.Lines);
	const isRace = useDataStore((state) => state.state?.SessionInfo?.Type === "Race");
	const isSprint = useDataStore((state) => state.state?.SessionInfo?.Name === "Sprint");
	const startDate = useDataStore((state) => state.state?.SessionInfo?.StartDate);

	const hasFeed = !!feedPrediction?.Drivers;

	// Keyed by session so a stale result is never shown for another race.
	const baseKey = isRace && !hasFeed && startDate ? `${startDate}|${isSprint}` : null;
	const [fetched, setFetched] = useState<{ key: string; base: BaseStandings | null } | null>(null);
	// undefined = loading, null = unavailable
	const base = fetched && fetched.key === baseKey ? fetched.base : undefined;

	useEffect(() => {
		if (!baseKey || !startDate) return;
		let cancelled = false;
		fetchBaseStandings(new Date(startDate).getFullYear(), startDate, !isSprint).then((result) => {
			if (!cancelled) setFetched({ key: baseKey, base: result });
		});
		return () => {
			cancelled = true;
		};
	}, [baseKey, startDate, isSprint]);

	const computed = useMemo(
		() =>
			base && timingLines && drivers
				? predictStandings(base, timingLines, drivers, isSprint ? SPRINT_POINTS : RACE_POINTS)
				: null,
		[base, timingLines, drivers, isSprint],
	);

	const prediction = hasFeed ? feedPrediction : computed;
	const driverStandings = prediction?.Drivers;
	const teamStandings = prediction?.Teams;

	if (!isRace) {
		return (
			<div className="px-2 py-3 font-mono text-sm text-zinc-700">standings only available during a race session</div>
		);
	}

	if (!hasFeed && base === null) {
		return (
			<div className="px-2 py-3 font-mono text-sm text-zinc-700">
				couldn&apos;t load the standings before this race (jolpica unavailable)
			</div>
		);
	}

	return (
		<div className="max-w-5xl font-mono">
			<div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-zinc-800">
				{/* Drivers */}
				<div>
					<div className="border-b-2 border-zinc-700 px-2 py-0.5 text-[11px] tracking-widest text-zinc-500 uppercase">
						drivers
					</div>
					{!driverStandings && new Array(20).fill("").map((_, i) => <SkeletonRow key={i} />)}
					{driverStandings &&
						drivers &&
						Object.values(driverStandings)
							.sort((a, b) => a.PredictedPosition - b.PredictedPosition)
							.map((driver) => {
								const info = drivers[driver.RacingNumber];
								const label = "Tla" in driver ? (driver as PredictedDriver) : null;
								if (!info && !label?.Tla) return null;
								const delta = driver.PredictedPosition - driver.CurrentPosition;
								return (
									<div
										key={driver.RacingNumber}
										className="flex items-baseline gap-[1ch] border-b border-zinc-900 px-2 py-0.5 text-sm"
									>
										<span className="w-[2ch] shrink-0 text-zinc-600 tabular-nums">{driver.PredictedPosition}</span>
										<span className={delta < 0 ? "text-emerald-400" : delta > 0 ? "text-red-500" : "text-zinc-700"}>
											{delta < 0 ? "↑" : delta > 0 ? "↓" : "·"}
										</span>
										<span
											className={info ? "font-bold" : "font-bold text-zinc-600"}
											style={info ? { color: `#${info.TeamColour}` } : undefined}
										>
											{info?.Tla ?? label?.Tla}
										</span>
										<span className={info ? "text-zinc-400" : "text-zinc-600"}>
											{info?.LastName ?? label?.FamilyName}
										</span>
										<span className="ml-auto text-zinc-300 tabular-nums">{driver.PredictedPoints}</span>
										<span
											className={`w-[4ch] text-right text-[11px] tabular-nums ${driver.PredictedPoints > driver.CurrentPoints ? "text-emerald-400" : "text-zinc-700"}`}
										>
											{driver.PredictedPoints > driver.CurrentPoints
												? `+${driver.PredictedPoints - driver.CurrentPoints}`
												: ""}
										</span>
									</div>
								);
							})}
				</div>

				{/* Teams */}
				<div>
					<div className="border-b-2 border-zinc-700 px-2 py-0.5 text-[11px] tracking-widest text-zinc-500 uppercase">
						constructors
					</div>
					{!teamStandings && new Array(10).fill("").map((_, i) => <SkeletonRow key={i} />)}
					{teamStandings &&
						Object.values(teamStandings)
							.sort((a, b) => a.PredictedPosition - b.PredictedPosition)
							.map((team) => {
								const delta = team.PredictedPosition - team.CurrentPosition;
								return (
									<div
										key={team.TeamName}
										className="flex items-baseline gap-[1ch] border-b border-zinc-900 px-2 py-0.5 text-sm"
									>
										<span className="w-[2ch] shrink-0 text-zinc-600 tabular-nums">{team.PredictedPosition}</span>
										<span className={delta < 0 ? "text-emerald-400" : delta > 0 ? "text-red-500" : "text-zinc-700"}>
											{delta < 0 ? "↑" : delta > 0 ? "↓" : "·"}
										</span>
										<span className="text-zinc-300">{team.TeamName}</span>
										<span className="ml-auto text-zinc-300 tabular-nums">{team.PredictedPoints}</span>
										<span
											className={`w-[4ch] text-right text-[11px] tabular-nums ${team.PredictedPoints > team.CurrentPoints ? "text-emerald-400" : "text-zinc-700"}`}
										>
											{team.PredictedPoints > team.CurrentPoints ? `+${team.PredictedPoints - team.CurrentPoints}` : ""}
										</span>
									</div>
								);
							})}
				</div>
			</div>
		</div>
	);
}

const SkeletonRow = () => (
	<div className="flex items-baseline gap-[1ch] border-b border-zinc-900 px-2 py-0.5">
		<span className="inline-block h-3 w-4 animate-pulse rounded-sm bg-zinc-800" />
		<span className="inline-block h-3 w-8 animate-pulse rounded-sm bg-zinc-800" />
		<span className="inline-block h-3 w-24 animate-pulse rounded-sm bg-zinc-800" />
		<span className="ml-auto inline-block h-3 w-8 animate-pulse rounded-sm bg-zinc-800" />
	</div>
);
