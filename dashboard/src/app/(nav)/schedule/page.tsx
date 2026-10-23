import { Suspense } from "react";

import NextRound from "@/components/schedule/NextRound";
import Schedule from "@/components/schedule/Schedule";
import ScheduleClient from "@/components/schedule/ScheduleClient";
import { FullScheduleLoading, NextRoundLoading } from "@/components/schedule/ScheduleView";

// The static Cloudflare build (NEXT_EXPORT=1) has no server, so the schedule is fetched in the browser.
const isStaticExport = process.env.NEXT_EXPORT === "1";

export default async function SchedulePage() {
	return (
		<div className="flex flex-col gap-8 py-10">
			<div className="flex flex-wrap items-end gap-3">
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-semibold tracking-[-0.02em]">{new Date().getFullYear()} schedule</h1>
					<p className="text-sm text-fg-2">All times in your local time</p>
				</div>
			</div>

			{isStaticExport ? (
				<ScheduleClient section="next" />
			) : (
				<Suspense fallback={<NextRoundLoading />}>
					<NextRound />
				</Suspense>
			)}

			{isStaticExport ? (
				<ScheduleClient section="all" />
			) : (
				<Suspense fallback={<FullScheduleLoading />}>
					<Schedule />
				</Suspense>
			)}
		</div>
	);
}
