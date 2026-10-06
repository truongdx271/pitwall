import { connection } from "next/server";

import { NextRoundView } from "@/components/schedule/ScheduleView";

import { env } from "@/env";
import type { Round as RoundType } from "@/types/schedule.type";

export const getNext = async () => {
	await connection();

	try {
		const nextReq = await fetch(`${env.API_URL}/api/schedule/next`, {
			cache: "no-store",
		});
		const next: RoundType = await nextReq.json();

		return next;
	} catch (e) {
		console.error("error fetching next round", e);
		return null;
	}
};

export default async function NextRound() {
	return <NextRoundView next={await getNext()} />;
}
