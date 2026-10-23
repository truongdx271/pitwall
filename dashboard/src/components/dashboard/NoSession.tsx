"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { env } from "@/env";
import { loadSchedule, nextSession, type NextSession } from "@/lib/schedule";

const pad = (n: number) => String(n).padStart(2, "0");

const countdown = (ms: number) => {
	const total = Math.max(0, Math.floor(ms / 1000));
	const d = Math.floor(total / 86400);
	const hms = `${pad(Math.floor((total % 86400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
	return d > 0 ? `${d}d ${hms}` : hms;
};

// No session (States.png): countdown to the next session from the schedule, plus a link to it.
// The feed doesn't say how long each qualifying part is, so the Q1/Q2/Q3 chips are left out.
export default function NoSession() {
	const [next, setNext] = useState<NextSession | null>(null);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		// The schedule comes from the API worker; without a public API URL there's no countdown.
		if (!env.NEXT_PUBLIC_API_URL) return;
		let cancelled = false;
		loadSchedule(env.NEXT_PUBLIC_API_URL).then((rounds) => {
			if (!cancelled && rounds) setNext(nextSession(rounds, Date.now()));
		});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	return (
		<div className="flex justify-center p-3">
			<div className="flex w-full max-w-md flex-col gap-3.5 rounded-panel border border-border bg-surface-1 p-6">
				{next ? (
					<>
						<span className="text-xs text-fg-2">
							{next.round} · {next.kind}
						</span>
						<div className="flex flex-col gap-1">
							<span className="text-[13px] text-fg-2">Session starts in</span>
							<span className="font-mono text-[40px] leading-[1.1] font-semibold tabular-nums">
								[{countdown(Date.parse(next.start) - now)}]
							</span>
						</div>
					</>
				) : (
					<div className="flex flex-col gap-1">
						<span className="text-[15px] font-semibold">No live session</span>
						<span className="text-[13px] text-fg-2">The feed only carries data while a session is running.</span>
					</div>
				)}

				<Link
					href="/schedule"
					className="flex h-9 items-center self-start rounded-control border border-border-strong px-3.5 text-[13px] font-medium text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
				>
					Open schedule
				</Link>
			</div>
		</div>
	);
}
