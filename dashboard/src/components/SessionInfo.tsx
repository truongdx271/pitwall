"use client";

import { utc, duration } from "moment";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { sessionPartPrefix } from "@/lib/sessionPart";

export default function SessionInfo() {
	const clock = useDataStore((state) => state.state?.ExtrapolatedClock);
	const session = useDataStore((state) => state.state?.SessionInfo);
	const timingData = useDataStore((state) => state.state?.TimingData);

	const delay = useSettingsStore((state) => state.delay);

	const timeRemaining =
		!!clock && !!clock.Remaining
			? clock.Extrapolating
				? utc(
						duration(clock.Remaining)
							.subtract(utc().diff(utc(clock.Utc)))
							.asMilliseconds() + (delay ? delay * 1000 : 0),
					).format("HH:mm:ss")
				: clock.Remaining
			: undefined;

	const countryCode = session?.Meeting.Country.Code?.toUpperCase() ?? "---";
	const sessionName = session
		? `${session.Meeting.Name}: ${session.Name}${timingData?.SessionPart ? ` ${sessionPartPrefix(session.Name)}${timingData.SessionPart}` : ""}`
		: null;

	return (
		<span className="flex items-center gap-[1.5ch] font-mono text-sm">
			<span className="text-zinc-500 tabular-nums">{countryCode}</span>
			<span className="text-zinc-700">│</span>
			{sessionName ? (
				<span className="tracking-wide text-zinc-300 uppercase">{sessionName}</span>
			) : (
				<span className="text-zinc-700">loading...</span>
			)}
			<span className="text-zinc-700">│</span>
			<span className="font-bold text-white tabular-nums">{timeRemaining ?? "--:--:--"}</span>
		</span>
	);
}
