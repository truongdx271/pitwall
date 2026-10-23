"use client";

import { now, utc } from "moment";
import clsx from "clsx";

import type { Round as RoundType } from "@/types/schedule.type";

import { groupSessionByDay } from "@/lib/groupSessionByDay";
import { formatDayRange, formatMonth } from "@/lib/dateFormatter";

type Props = {
	round: RoundType;
	nextName?: string;
};

const countryCodeMap: Record<string, string> = {
	Australia: "AUS",
	Austria: "AUT",
	Azerbaijan: "AZE",
	Bahrain: "BRN",
	Belgium: "BEL",
	Brazil: "BRA",
	Canada: "CAN",
	China: "CHN",
	Spain: "ESP",
	France: "FRA",
	"Great Britain": "GBR",
	"United Kingdom": "GBR",
	Germany: "GER",
	Hungary: "HUN",
	Italy: "ITA",
	Japan: "JPN",
	"Saudi Arabia": "KSA",
	Mexico: "MEX",
	Monaco: "MON",
	Netherlands: "NED",
	Portugal: "POR",
	Qatar: "QAT",
	Singapore: "SGP",
	"United Arab Emirates": "UAE",
	"United States": "USA",
};

// Exported for the next-round card.
export const countryCode = (name: string) => countryCodeMap[name] ?? "???";

// A weekend in the schedule grid (Schedule.png): country, dates, then sessions by day.
export default function Round({ round, nextName }: Props) {
	const isNext = round.name === nextName;
	const thisWeekend = isNext && utc().isBetween(utc(round.start).subtract(1, "day"), utc(round.end));

	return (
		<article
			className={clsx(
				"flex flex-col rounded-panel border bg-surface-1 p-4",
				isNext ? "border-border-strong" : "border-border",
				round.over && "opacity-50",
			)}
		>
			<div className="flex items-center gap-2.5 border-b border-border pb-3">
				<span className="rounded-tag bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-fg-2">
					{countryCode(round.countryName)}
				</span>
				<span className="text-[15px] font-semibold">{round.countryName}</span>
				{isNext && (
					<span className="rounded-md bg-personal-best/14 px-1.5 py-0.5 text-[11px] font-semibold text-personal-best">
						{thisWeekend ? "This weekend" : "Up next"}
					</span>
				)}
				{round.over && <span className="text-[11px] text-fg-3">Over</span>}
				<span className="ml-auto text-[13px] text-fg-2">
					{formatMonth(round.start, round.end)} {formatDayRange(round.start, round.end)}
				</span>
			</div>

			<div className="grid grid-cols-3 gap-4 pt-3">
				{groupSessionByDay(round.sessions).map((day, i) => (
					<div className="flex flex-col gap-2" key={`round.day.${i}`}>
						<p className="text-[11px] font-medium tracking-[0.04em] text-fg-3 uppercase">
							{utc(day.date).local().format("ddd")}
						</p>
						{day.sessions.map((session, j) => (
							<div
								key={`round.day.${i}.session.${j}`}
								className={clsx("flex flex-col", !round.over && utc(session.end).isBefore(now()) && "opacity-50")}
							>
								<p
									className={clsx(
										"truncate text-[13px]",
										session.kind.toLowerCase() === "race" ? "font-semibold text-fg-1" : "text-fg-1",
									)}
								>
									{session.kind}
								</p>
								<p className="font-mono text-[11px] text-fg-3 tabular-nums">
									{utc(session.start).local().format("HH:mm")}–{utc(session.end).local().format("HH:mm")}
								</p>
							</div>
						))}
					</div>
				))}
			</div>
		</article>
	);
}
