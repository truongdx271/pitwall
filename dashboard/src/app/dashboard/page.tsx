"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";

import LeaderBoard from "@/components/dashboard/LeaderBoard";
import QualiLeaderBoard from "@/components/dashboard/QualiLeaderBoard";
import RaceControl from "@/components/dashboard/RaceControl";
import TeamRadios from "@/components/dashboard/TeamRadios";
import TrackViolations from "@/components/dashboard/TrackViolations";
import TrackPanel from "@/components/dashboard/TrackPanel";
import MessagesPanel from "@/components/dashboard/MessagesPanel";
import { parseTab } from "@/components/shell/tabs";

import TyreStrategyPage from "@/app/dashboard/tyre-strategy/page";
import LapTimesPage from "@/app/dashboard/lap-times/page";
import SpeedTrapsPage from "@/app/dashboard/speed-traps/page";
import StandingsPage from "@/app/dashboard/standings/page";
import TrackMapPage from "@/app/dashboard/track-map/page";
import WeatherPage from "@/app/dashboard/weather/page";

export default function Page() {
	// useSearchParams needs a Suspense boundary for the static export (yarn cf:build).
	return (
		<Suspense>
			<Dashboard />
		</Suspense>
	);
}

function Dashboard() {
	const activeTab = parseTab(useSearchParams().get("tab"));
	const sessionName = useDataStore((state) => state.state?.SessionInfo?.Name ?? "");
	const isQuali = sessionName.toLowerCase().includes("qualifying");

	return (
		<div className="flex h-full w-full flex-col">
			{/* Tab content */}
			<div className="min-h-0 flex-1">
				{activeTab === "live" && (
					// Table on the left; Track over Messages on the right, Messages filling the rest.
					// Below 1280px the right column wraps under the table (SPEC §0).
					<div className={clsx("flex w-full flex-wrap items-stretch gap-3 p-3", !isQuali && "xl:h-full")}>
						{isQuali ? (
							// The old quali table is wider than 840px; it gets the full width until PR 5
							// moves it onto the new grid.
							<div className="min-w-0 flex-[1_1_100%]">
								<QualiLeaderBoard />
							</div>
						) : (
							<div className="min-w-0 flex-[999_1_840px] xl:h-full xl:overflow-y-auto">
								<LeaderBoard />
							</div>
						)}
						<div className={clsx("flex min-w-0 flex-[1_1_500px] flex-col gap-3", !isQuali && "xl:h-full")}>
							<TrackPanel className="shrink-0" />
							<MessagesPanel className="max-h-[480px] min-h-[260px] flex-1 xl:max-h-none" />
						</div>
					</div>
				)}

				{activeTab === "map" && (
					<div className="h-[calc(100vh-12rem)]">
						<TrackMapPage />
					</div>
				)}

				{/* Messages and Strategy stack the old views until PR 8 and PR 9 redesign them. */}
				{activeTab === "messages" && (
					<div className="flex flex-col divide-y divide-border">
						<RaceControl />
						<TeamRadios />
						<TrackViolations />
					</div>
				)}

				{activeTab === "strategy" && (
					<div className="flex flex-col divide-y divide-border">
						<TyreStrategyPage />
						<LapTimesPage />
						<SpeedTrapsPage />
					</div>
				)}

				{activeTab === "weather" && (
					<div className="h-[calc(100vh-8rem)] overflow-y-auto">
						<WeatherPage />
					</div>
				)}

				{activeTab === "standings" && (
					<div className="h-[calc(100vh-8rem)] overflow-y-auto">
						<StandingsPage />
					</div>
				)}
			</div>
		</div>
	);
}
