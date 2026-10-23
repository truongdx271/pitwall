"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { useDataStore } from "@/stores/useDataStore";

import LeaderBoard from "@/components/dashboard/LeaderBoard";
import QualiLeaderBoard from "@/components/dashboard/QualiLeaderBoard";
import RaceControl from "@/components/dashboard/RaceControl";
import TeamRadios from "@/components/dashboard/TeamRadios";
import RadioTranscripts from "@/components/dashboard/RadioTranscripts";
import TrackViolations from "@/components/dashboard/TrackViolations";
import Map from "@/components/dashboard/Map";
import Footer from "@/components/Footer";
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
		<div className="flex w-full flex-col">
			{/* Tab content */}
			<div className="flex-1">
				{activeTab === "live" && (
					<div className="flex w-full flex-col">
						{isQuali ? <QualiLeaderBoard /> : <LeaderBoard />}
						<div className="grid border-t border-border md:h-[40vh] md:min-h-64 md:grid-cols-2">
							<div className="h-[40vh] min-h-64 overflow-hidden py-2 md:h-auto md:min-h-0">
								<Map />
							</div>
							<div className="flex h-[40vh] min-h-64 flex-col overflow-hidden border-t border-border md:h-auto md:min-h-0 md:border-t-0 md:border-l">
								<div className="min-h-0 flex-1 pt-2">
									<RadioTranscripts />
								</div>
								<div className="flex min-h-0 flex-1 flex-col border-t border-border pt-1">
									<span className="border-b border-border px-2 pb-1 font-mono text-[11px] tracking-widest text-fg-2 uppercase">
										Race control
									</span>
									<div className="min-h-0 flex-1 overflow-y-auto">
										<RaceControl />
									</div>
								</div>
							</div>
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

			<Footer />
		</div>
	);
}
