import { connection } from "next/server";

import { ScheduleList } from "@/components/schedule/ScheduleView";

import type { Round as RoundType } from "@/types/schedule.type";

import { env } from "@/env";

export const getSchedule = async () => {
	await connection();

	try {
		const scheduleReq = await fetch(`${env.API_URL}/api/schedule`, {
			cache: "no-store",
		});
		const schedule: RoundType[] = await scheduleReq.json();

		return schedule;
	} catch (e) {
		console.error("error fetching schedule", e);
		return null;
	}
};

export default async function Schedule() {
	return <ScheduleList schedule={await getSchedule()} />;
}
