"use client";

import { useEffect, useRef, useState } from "react";
import { duration, now, utc } from "moment";

import type { Session } from "@/types/schedule.type";

type Props = {
	next: Session;
	type: "race" | "other";
};

export default function Countdown({ next, type }: Props) {
	const [[days, hours, minutes, seconds], setDuration] = useState<
		[number | null, number | null, number | null, number | null]
	>([null, null, null, null]);

	const nextMoment = utc(next.start);
	const requestRef = useRef<number | null>(null);

	useEffect(() => {
		const animateNextFrame = () => {
			const diff = duration(nextMoment.diff(now()));
			const d = parseInt(diff.asDays().toString());

			if (diff.asSeconds() > 0) {
				setDuration([d, diff.hours(), diff.minutes(), diff.seconds()]);
			} else {
				setDuration([0, 0, 0, 0]);
			}

			requestRef.current = requestAnimationFrame(animateNextFrame);
		};

		requestRef.current = requestAnimationFrame(animateNextFrame);
		return () => (requestRef.current ? cancelAnimationFrame(requestRef.current) : void 0);
	}, [nextMoment]);

	const fmt = (n: number | null) => (n !== null ? String(n).padStart(2, "0") : "--");

	return (
		<div className="flex flex-col gap-2">
			<p className="text-xs text-fg-2">{type === "race" ? "Race" : next.kind} starts in</p>
			<div className="flex items-end gap-4 font-mono tabular-nums">
				{(
					[
						[days, "days"],
						[hours, "hours"],
						[minutes, "min"],
						[seconds, "sec"],
					] as const
				).map(([n, unit]) => (
					<div key={unit} className="flex flex-col">
						<span className={`text-[34px] leading-none font-semibold ${unit === "sec" ? "text-fg-3" : "text-fg-1"}`}>
							{fmt(n)}
						</span>
						<span className="font-sans text-[11px] text-fg-3">{unit}</span>
					</div>
				))}
			</div>
		</div>
	);
}
