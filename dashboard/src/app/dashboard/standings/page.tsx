"use client";

import { useDataStore } from "@/stores/useDataStore";
import { useLoadingGrace } from "@/hooks/useLoadingGrace";

export default function Standings() {
	const driverStandings = useDataStore((state) => state.state?.ChampionshipPrediction?.Drivers);
	const teamStandings = useDataStore((state) => state.state?.ChampionshipPrediction?.Teams);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const isRace = useDataStore((state) => state.state?.SessionInfo?.Type === "Race");

	// the feed doesn't always carry ChampionshipPrediction — after a grace period,
	// stop showing skeletons forever and say so.
	const waited = useLoadingGrace();

	if (!isRace) {
		return (
			<div className="px-2 py-3 font-mono text-sm text-zinc-700">standings only available during a race session</div>
		);
	}

	if (!driverStandings && !teamStandings && waited) {
		return (
			<div className="px-2 py-3 font-mono text-sm text-zinc-700">no championship prediction for this session</div>
		);
	}

	return (
		<div className="grid max-w-5xl grid-cols-1 font-mono lg:grid-cols-2 lg:divide-x lg:divide-zinc-800">
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
							if (!info) return null;
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
									<span className="font-bold" style={{ color: `#${info.TeamColour}` }}>
										{info.Tla}
									</span>
									<span className="text-zinc-400">{info.LastName}</span>
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
