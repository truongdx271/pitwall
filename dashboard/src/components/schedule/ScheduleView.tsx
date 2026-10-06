import { utc } from "moment";

import Countdown from "@/components/schedule/Countdown";
import Round from "@/components/schedule/Round";

import type { Round as RoundType } from "@/types/schedule.type";

// Markup shared by the server-rendered schedule (Docker) and the client-fetched one (static Cloudflare build).

export function NextRoundView({ next }: { next: RoundType | null }) {
	if (!next) {
		return (
			<div className="flex h-32 flex-col items-center justify-center font-mono">
				<p className="text-[11px] tracking-widest text-zinc-600 uppercase">no upcoming weekend found</p>
			</div>
		);
	}

	const nextSession = next.sessions.filter((s) => utc(s.start) > utc() && s.kind.toLowerCase() !== "race")[0];
	const nextRace = next.sessions.find((s) => s.kind.toLowerCase() == "race");

	return (
		<div className="mb-4 grid grid-cols-1 gap-8 sm:grid-cols-2">
			{nextSession || nextRace ? (
				<div className="flex flex-col gap-6">
					{nextSession && <Countdown next={nextSession} type="other" />}
					{nextRace && <Countdown next={nextRace} type="race" />}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center font-mono">
					<p className="text-[11px] tracking-widest text-zinc-600 uppercase">no upcoming sessions found</p>
				</div>
			)}

			<Round round={next} />
		</div>
	);
}

export function ScheduleList({ schedule }: { schedule: RoundType[] | null }) {
	if (!schedule) {
		return (
			<div className="flex h-44 flex-col items-center justify-center">
				<p>Schedule not found</p>
			</div>
		);
	}

	const next = schedule.filter((round) => !round.over)[0];

	return (
		<div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-2">
			{schedule.map((round, roundI) => (
				<Round nextName={next?.name} round={round} key={`round.${roundI}`} />
			))}
		</div>
	);
}

const RoundLoading = () => {
	return (
		<div className="flex flex-col gap-2 font-mono">
			<p className="animate-pulse text-sm text-zinc-700">▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌</p>
			<div className="grid grid-cols-3 gap-4 pt-1">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={`day.${i}`} className="flex flex-col gap-2">
						<p className="animate-pulse text-[11px] text-zinc-700">▌▌▌▌▌▌▌</p>
						<p className="animate-pulse text-xs text-zinc-700">▌▌▌▌▌▌▌▌▌▌▌▌</p>
						<p className="animate-pulse text-xs text-zinc-700">▌▌▌▌▌▌▌▌</p>
					</div>
				))}
			</div>
		</div>
	);
};

export const NextRoundLoading = () => {
	return (
		<div className="mb-4 grid grid-cols-1 gap-8 sm:grid-cols-2">
			<div className="flex flex-col gap-4 font-mono">
				<p className="animate-pulse text-3xl text-zinc-700 tabular-nums">-- -- -- --</p>
				<p className="animate-pulse text-[11px] tracking-widest text-zinc-700 uppercase">▌▌▌▌▌▌▌▌▌▌</p>
			</div>
			<RoundLoading />
		</div>
	);
};

export const FullScheduleLoading = () => {
	return (
		<div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-2">
			{Array.from({ length: 6 }).map((_, i) => (
				<RoundLoading key={`round.${i}`} />
			))}
		</div>
	);
};
