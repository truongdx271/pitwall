"use client";

import { useState } from "react";
import Link from "next/link";
import { now, utc } from "moment";
import clsx from "clsx";

import Countdown from "@/components/schedule/Countdown";
import Round, { countryCode } from "@/components/schedule/Round";
import SegmentedControls from "@/components/ui/SegmentedControls";
import type { Round as RoundType } from "@/types/schedule.type";
import { groupSessionByDay } from "@/lib/groupSessionByDay";
import { formatDayRange, formatMonth } from "@/lib/dateFormatter";
import { roundTitle } from "@/lib/schedule";

// Markup shared by the server-rendered schedule (Docker) and the client-fetched one (static Cloudflare build).

// The next weekend (Schedule.png): countdowns to the next session and the race, and its days.
export function NextRoundView({ next }: { next: RoundType | null }) {
	if (!next) {
		return (
			<div className="rounded-panel border border-border bg-surface-1 p-6 text-sm text-fg-2">
				No upcoming weekend found.
			</div>
		);
	}

	const nextSession = next.sessions.filter((s) => utc(s.start) > utc() && s.kind.toLowerCase() !== "race")[0];
	const nextRace = next.sessions.find((s) => s.kind.toLowerCase() == "race");
	const upNext = next.sessions.find((s) => utc(s.end).isAfter(now()));
	const thisWeekend = utc().isBetween(utc(next.start).subtract(1, "day"), utc(next.end));

	return (
		<section className="flex flex-wrap gap-8 rounded-panel border border-border bg-surface-1 p-6">
			<div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
				<div className="flex flex-wrap items-center gap-2.5">
					<span className="rounded-tag bg-surface-3 px-1.5 py-0.5 font-mono text-xs font-semibold text-fg-2">
						{countryCode(next.countryName)}
					</span>
					<h2 className="text-xl font-semibold">{roundTitle(next)}</h2>
					<span className="rounded-md bg-personal-best/14 px-1.5 py-0.5 text-xs font-semibold text-personal-best">
						{thisWeekend ? "This weekend" : "Up next"}
					</span>
					<span className="text-sm text-fg-2">
						{formatMonth(next.start, next.end)} {formatDayRange(next.start, next.end)}
					</span>
				</div>
				<div className="flex flex-wrap gap-x-12 gap-y-4">
					{nextSession && <Countdown next={nextSession} type="other" />}
					{nextRace && <Countdown next={nextRace} type="race" />}
				</div>
				<Link
					href="/dashboard"
					className="flex h-10 items-center self-start rounded-control border border-border-strong px-3.5 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-fg-1"
				>
					Open dashboard
				</Link>
			</div>

			<div className="grid min-w-0 flex-[1_1_520px] grid-cols-3 gap-2.5">
				{groupSessionByDay(next.sessions).map((day, i) => (
					<div key={i} className="flex flex-col gap-2">
						<p className="text-xs font-medium text-fg-2">{utc(day.date).local().format("dddd D")}</p>
						{day.sessions.map((s, j) => {
							const isUpNext = s === upNext;
							return (
								<div
									key={j}
									className={clsx(
										"flex flex-col gap-1 rounded-control border p-3",
										isUpNext ? "border-personal-best" : "border-border",
										utc(s.end).isBefore(now()) && "opacity-50",
									)}
								>
									<span className={clsx("text-[13px]", s.kind.toLowerCase() === "race" && "font-semibold")}>
										{s.kind}
									</span>
									<span className="font-mono text-xs text-fg-2 tabular-nums">
										{utc(s.start).local().format("HH:mm")}–{utc(s.end).local().format("HH:mm")}
									</span>
									{isUpNext && <span className="text-[11px] font-semibold text-personal-best">Next up</span>}
								</div>
							);
						})}
					</div>
				))}
			</div>
		</section>
	);
}

// Every weekend, as a grid; Upcoming hides the finished ones.
export function ScheduleList({ schedule }: { schedule: RoundType[] | null }) {
	const [show, setShow] = useState<"upcoming" | "all">("upcoming");

	if (!schedule) {
		return <p className="rounded-panel border border-border bg-surface-1 p-6 text-sm text-fg-2">Schedule not found.</p>;
	}

	const next = schedule.filter((round) => !round.over)[0];
	const rounds = show === "upcoming" ? schedule.filter((round) => !round.over) : schedule;

	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<h2 className="text-lg font-semibold">Rest of the season</h2>
				<SegmentedControls
					className="ml-auto"
					selected={show}
					onSelect={setShow}
					options={[
						{ label: "Upcoming", value: "upcoming" },
						{ label: "Whole season", value: "all" },
					]}
				/>
			</div>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,460px),1fr))] gap-3">
				{rounds.map((round) => (
					<Round nextName={next?.name} round={round} key={round.name} />
				))}
			</div>
		</section>
	);
}

const Skeleton = ({ className }: { className: string }) => (
	<div className={clsx("animate-pulse rounded-panel border border-border bg-surface-1", className)} />
);

export const NextRoundLoading = () => <Skeleton className="h-60" />;

export const FullScheduleLoading = () => (
	<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,460px),1fr))] gap-3">
		{Array.from({ length: 6 }).map((_, i) => (
			<Skeleton key={i} className="h-44" />
		))}
	</div>
);
