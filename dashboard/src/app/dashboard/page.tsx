"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";

import LeaderBoard from "@/components/dashboard/LeaderBoard";
import QualiLeaderBoard from "@/components/dashboard/QualiLeaderBoard";
import PracticeLeaderBoard from "@/components/dashboard/PracticeLeaderBoard";
import RaceControl from "@/components/dashboard/RaceControl";
import TeamRadios from "@/components/dashboard/TeamRadios";
import TrackViolations from "@/components/dashboard/TrackViolations";
import TrackPanel from "@/components/dashboard/TrackPanel";
import MessagesPanel from "@/components/dashboard/MessagesPanel";
import { parseTab } from "@/components/shell/tabs";
import { sessionKind } from "@/lib/sessionKind";

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
	const kind = useDataStore((state) => sessionKind(state.state?.SessionInfo));
	const isPractice = kind === "practice";
	const isQuali = kind === "qualifying";
	// Practice and quali share the 860px table width.
	const wideTable = isPractice || isQuali;

	return (
		<div className="flex h-full w-full flex-col">
			{/* Tab content */}
			<div className="min-h-0 flex-1">
				{activeTab === "live" && (
					// Table on the left; Track over Messages on the right, Messages filling the rest.
					// Below 1280px the right column wraps under the table (SPEC §0).
					<div className="flex w-full flex-wrap items-stretch gap-3 p-3 xl:h-full">
						<div
							className={clsx(
								"min-w-0 xl:h-full xl:overflow-y-auto",
								wideTable ? "flex-[999_1_860px]" : "flex-[999_1_840px]",
							)}
						>
							{isPractice ? <PracticeLeaderBoard /> : isQuali ? <QualiLeaderBoard /> : <LeaderBoard />}
						</div>
						<div
							className={clsx(
								"flex min-w-0 flex-col gap-3 xl:h-full",
								wideTable ? "flex-[1_1_480px]" : "flex-[1_1_500px]",
							)}
						>
							<TrackPanel className="shrink-0" />
							<MessagesPanel className="max-h-[480px] min-h-[260px] flex-1 xl:max-h-none" />
						</div>
					</div>
				)}

				{activeTab === "map" && <TrackMapPage />}

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
