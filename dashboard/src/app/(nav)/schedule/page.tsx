import { Suspense } from "react";

import NextRound from "@/components/schedule/NextRound";
import Schedule from "@/components/schedule/Schedule";
import ScheduleClient from "@/components/schedule/ScheduleClient";
import { FullScheduleLoading, NextRoundLoading } from "@/components/schedule/ScheduleView";

// The static Cloudflare build (NEXT_EXPORT=1) has no server, so the schedule is fetched in the browser.
const isStaticExport = process.env.NEXT_EXPORT === "1";

export default async function SchedulePage() {
	return (
		<div className="font-mono">
			<div className="my-4 border-b border-zinc-800 pb-1">
				<p className="text-[11px] tracking-widest text-zinc-500 uppercase">up next</p>
				<p className="text-[10px] text-zinc-700">all times local</p>
			</div>

			{isStaticExport ? (
				<ScheduleClient section="next" />
			) : (
				<Suspense fallback={<NextRoundLoading />}>
					<NextRound />
				</Suspense>
			)}

			<div className="my-4 border-b border-zinc-800 pb-1">
				<p className="text-[11px] tracking-widest text-zinc-500 uppercase">schedule</p>
				<p className="text-[10px] text-zinc-700">all times local</p>
			</div>

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
