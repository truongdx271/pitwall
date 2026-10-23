"use client";

import { useEffect, useState } from "react";

import { env } from "@/env";
import { loadSchedule, nextSession, type NextSession } from "@/lib/schedule";

const pad = (n: number) => String(n).padStart(2, "0");

// "United States GP weekend · Practice 1 in 01d 09h", from the schedule API.
export default function WeekendStatus() {
	const [next, setNext] = useState<NextSession | null>(null);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!env.NEXT_PUBLIC_API_URL) return;
		let cancelled = false;
		loadSchedule(env.NEXT_PUBLIC_API_URL).then((rounds) => {
			if (!cancelled && rounds) setNext(nextSession(rounds, Date.now()));
		});
		const id = setInterval(() => setNow(Date.now()), 60_000);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, []);

	if (!next) return null;

	const ms = Math.max(0, Date.parse(next.start) - now);
	const days = Math.floor(ms / 86_400_000);
	const hours = Math.floor((ms % 86_400_000) / 3_600_000);
	const minutes = Math.floor((ms % 3_600_000) / 60_000);
	return (
		<span className="inline-flex h-8 items-center gap-2 self-start rounded-full border border-border-subtle px-3 text-xs text-fg-2">
			<span aria-hidden className="size-2 rounded-full bg-personal-best" />
			{next.country} GP weekend · {next.kind} in
			<span className="font-mono text-fg-1 tabular-nums">
				{days > 0 ? `${pad(days)}d ${pad(hours)}h` : `${pad(hours)}h ${pad(minutes)}m`}
			</span>
		</span>
	);
}
