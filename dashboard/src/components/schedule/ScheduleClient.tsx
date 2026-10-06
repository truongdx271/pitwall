"use client";

import { useEffect, useState } from "react";

import {
	FullScheduleLoading,
	NextRoundLoading,
	NextRoundView,
	ScheduleList,
} from "@/components/schedule/ScheduleView";

import { env } from "@/env";
import { firstUpcoming, loadSchedule } from "@/lib/schedule";
import type { Round } from "@/types/schedule.type";

type State = { status: "loading" } | { status: "done"; schedule: Round[] | null };

// Static Cloudflare build: no server renders /schedule, so the browser asks the API worker.
export default function ScheduleClient({ section }: { section: "next" | "all" }) {
	const [state, setState] = useState<State>({ status: "loading" });

	useEffect(() => {
		let cancelled = false;
		loadSchedule(env.NEXT_PUBLIC_API_URL ?? "").then((schedule) => {
			if (!cancelled) setState({ status: "done", schedule });
		});
		return () => {
			cancelled = true;
		};
	}, []);

	if (state.status === "loading") return section === "next" ? <NextRoundLoading /> : <FullScheduleLoading />;
	if (section === "next") return <NextRoundView next={state.schedule && firstUpcoming(state.schedule)} />;
	return <ScheduleList schedule={state.schedule} />;
}
