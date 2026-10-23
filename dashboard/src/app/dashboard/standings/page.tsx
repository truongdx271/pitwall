"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";

import {
	fetchBaseStandings,
	fetchLatestStandings,
	predictStandings,
	RACE_POINTS,
	SPRINT_POINTS,
	type BaseStandings,
	type PredictedDriver,
} from "@/lib/standings";
import { fillBackground, standingsRows, type StandingsMode, type StandingsRow } from "@/lib/standingsRows";

import Panel from "@/components/ui/Panel";
import SegmentedControls from "@/components/ui/SegmentedControls";
import DriverChip from "@/components/driver/DriverChip";

export default function Standings() {
	const feedPrediction = useDataStore((state) => state.state?.ChampionshipPrediction);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timingLines = useDataStore((state) => state.state?.TimingData?.Lines);
	const isRace = useDataStore((state) => state.state?.SessionInfo?.Type === "Race");
	const isSprint = useDataStore((state) => state.state?.SessionInfo?.Name === "Sprint");
	const startDate = useDataStore((state) => state.state?.SessionInfo?.StartDate);

	const hasFeed = !!feedPrediction?.Drivers;
	const [mode, setMode] = useState<StandingsMode>("live");

	// Outside a race: plain standings after the previous round, no live points.
	// Keyed by session so a stale result is never shown for another race.
	const baseKey = hasFeed && isRace ? null : `${startDate ?? "none"}|${isRace}|${isSprint}`;
	const [fetched, setFetched] = useState<{ key: string; base: BaseStandings | null } | null>(null);
	// undefined = loading, null = unavailable
	const base = fetched && fetched.key === baseKey ? fetched.base : undefined;

	useEffect(() => {
		if (!baseKey) return;
		let cancelled = false;
		const year = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
		const load = async () => {
			const round = startDate ? await fetchBaseStandings(year, startDate, isRace && !isSprint) : null;
			// Outside a known race weekend, fall back to the season's latest standings.
			return round ?? (isRace ? null : await fetchLatestStandings(year));
		};
		load().then((result) => {
			if (!cancelled) setFetched({ key: baseKey, base: result });
		});
		return () => {
			cancelled = true;
		};
	}, [baseKey, startDate, isRace, isSprint]);

	const computed = useMemo(
		() =>
			!base
				? null
				: isRace
					? timingLines && drivers
						? predictStandings(base, timingLines, drivers, isSprint ? SPRINT_POINTS : RACE_POINTS)
						: null
					: predictStandings(base, {}, drivers ?? {}, []),
		[base, timingLines, drivers, isRace, isSprint],
	);

	const prediction = hasFeed && isRace ? feedPrediction : computed;
	const driverStandings = prediction?.Drivers;
	const teamStandings = prediction?.Teams;

	if (!(hasFeed && isRace) && base === null) {
		return (
			<p className="p-6 text-sm text-fg-2">Couldn&apos;t load the championship standings (jolpica is unavailable).</p>
		);
	}

	if (base && base.drivers.length === 0 && base.teams.length === 0 && !isRace) {
		return <p className="p-6 text-sm text-fg-2">No standings yet this season.</p>;
	}

	// Outside a race there are no live points, so there is only one view.
	const view: StandingsMode = isRace ? mode : "before";
	const teamColour = (name: string) => Object.values(drivers ?? {}).find((d) => d.TeamName === name)?.TeamColour;

	return (
		<div className="flex flex-col gap-3 p-3">
			<div className="flex flex-wrap items-center gap-3">
				{isRace && (
					<SegmentedControls
						selected={mode}
						onSelect={setMode}
						options={[
							{ label: "Live projection", value: "live" },
							{ label: "Before this race", value: "before" },
						]}
					/>
				)}
				<span className="text-xs text-fg-2">
					{isRace
						? view === "live"
							? "If the race finished in the current order. Row shading = points relative to the leader; brighter part = points from this race."
							: "Standings before this race."
						: base?.after
							? `After round ${base.after.round} · ${base.after.raceName}`
							: "Current standings"}
				</span>
			</div>

			<div className="flex flex-wrap items-start gap-3">
				<Panel title="Drivers" className="min-w-0 flex-[1_1_560px] px-1.5 pb-2">
					<StandingsHeader first="DRIVER" race={view === "live"} />
					{!driverStandings && new Array(22).fill("").map((_, i) => <SkeletonRow key={i} />)}
					{driverStandings &&
						standingsRows(Object.values(driverStandings), view).map((row, i) => {
							const info = drivers?.[row.entry.RacingNumber];
							const label = "Tla" in row.entry ? (row.entry as PredictedDriver) : null;
							if (!info && !label?.Tla) return null;
							return (
								<StandingsLine
									key={row.entry.RacingNumber}
									row={row}
									zebra={i % 2 === 1}
									colour={info?.TeamColour}
									race={view === "live"}
									name={
										<>
											<DriverChip short={info?.Tla ?? label?.Tla ?? "?"} teamColor={info?.TeamColour} />
											<span className="truncate font-sans text-[13px] text-fg-1">
												{info?.LastName ?? label?.FamilyName}
											</span>
										</>
									}
								/>
							);
						})}
				</Panel>

				<Panel title="Constructors" className="min-w-0 flex-[1_1_520px] px-1.5 pb-2">
					<StandingsHeader first="TEAM" race={view === "live"} />
					{!teamStandings && new Array(11).fill("").map((_, i) => <SkeletonRow key={i} />)}
					{teamStandings &&
						standingsRows(Object.values(teamStandings), view).map((row, i) => {
							const colour = teamColour(row.entry.TeamName);
							return (
								<StandingsLine
									key={row.entry.TeamName}
									row={row}
									zebra={i % 2 === 1}
									colour={colour}
									race={view === "live"}
									tall
									name={
										<>
											<span
												aria-hidden
												className="h-[18px] w-1.5 shrink-0 rounded-sm"
												style={{ backgroundColor: colour ? `#${colour}` : "var(--color-fg-3)" }}
											/>
											<span className="truncate font-sans text-[13px] font-medium text-fg-1">{row.entry.TeamName}</span>
										</>
									}
								/>
							);
						})}
				</Panel>
			</div>
		</div>
	);
}

const STANDINGS_GRID = "24px 14px minmax(0, 1fr) 56px 44px 44px";

function StandingsHeader({ first, race }: { first: string; race: boolean }) {
	return (
		<div
			className="grid h-[26px] items-center gap-x-2 border-b border-border px-2.5 text-[11px] font-medium tracking-[0.04em] text-fg-3"
			style={{ gridTemplateColumns: STANDINGS_GRID }}
		>
			<span className="text-right">P</span>
			<span />
			<span>{first}</span>
			<span className="text-right">GAP</span>
			<span className="text-right">PTS</span>
			<span className="text-right">{race ? "+RACE" : ""}</span>
		</div>
	);
}

type LineProps = {
	row: StandingsRow<{
		CurrentPosition: number;
		PredictedPosition: number;
		CurrentPoints: number;
		PredictedPoints: number;
	}>;
	zebra: boolean;
	colour: string | undefined;
	race: boolean;
	name: ReactNode;
	tall?: boolean;
};

// A "fill" row (SPEC §10): the row background is the points bar.
function StandingsLine({ row, zebra, colour, race, name, tall }: LineProps) {
	return (
		<div
			className={clsx(
				"grid items-center gap-x-2 rounded-md px-2.5 font-mono text-[13px] tabular-nums",
				// Constructors get taller, spaced rows; the 22 drivers sit flush so they fit 900px.
				tall ? "mt-1 h-9" : "h-row",
			)}
			style={{
				gridTemplateColumns: STANDINGS_GRID,
				background: fillBackground(
					colour,
					row.basePct,
					row.totalPct,
					zebra ? "var(--color-row-alt)" : "var(--color-surface-1)",
				),
			}}
		>
			<span className="text-right text-fg-2">{row.position}</span>
			<span
				className={clsx("text-[10px]", row.moved > 0 ? "text-gain" : "text-loss")}
				aria-label={row.moved ? `${row.moved > 0 ? "up" : "down"} ${Math.abs(row.moved)}` : undefined}
			>
				{row.moved > 0 ? "▲" : row.moved < 0 ? "▼" : ""}
			</span>
			<span className="flex min-w-0 items-center gap-2">{name}</span>
			<span className="text-right text-fg-2">{row.gap === 0 ? "Leader" : `−${row.gap}`}</span>
			<span className="text-right font-semibold text-fg-1">{row.points}</span>
			<span className="text-right text-xs text-gain">{race && row.race > 0 ? `+${row.race}` : ""}</span>
		</div>
	);
}

const SkeletonRow = () => (
	<div className="mt-1 flex h-row items-center px-2.5">
		<span className="h-3 w-full animate-pulse rounded-sm bg-surface-2" />
	</div>
);
