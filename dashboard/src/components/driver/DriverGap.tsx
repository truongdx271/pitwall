import clsx from "clsx";

import type { TimingDataDriver } from "@/types/state.type";

type Props = {
	timingDriver: TimingDataDriver;
	sessionPart: number | undefined;
	showInterval?: boolean;
};

export default function DriverGap({ timingDriver, sessionPart, showInterval = false }: Props) {
	const gapToLeader =
		timingDriver.GapToLeader ??
		(timingDriver.Stats ? timingDriver.Stats[sessionPart ? sessionPart - 1 : 0].TimeDiffToFastest : undefined) ??
		timingDriver.TimeDiffToFastest ??
		"";

	const gapToFront =
		timingDriver.IntervalToPositionAhead?.Value ??
		(timingDriver.Stats ? timingDriver.Stats[sessionPart ? sessionPart - 1 : 0].TimeDifftoPositionAhead : undefined) ??
		timingDriver.TimeDiffToPositionAhead ??
		"";

	const catching = timingDriver.IntervalToPositionAhead?.Catching;

	// For the race leader the feed puts the current lap ("LAP 12") in the gap field.
	const leaderLapMarker = /^LAP \d/i.test(gapToLeader);
	// Retired / stopped cars also have empty gaps, so only P1 may treat "empty" as leading.
	const inFirst = timingDriver.Position === "1";

	if (showInterval) {
		const isLeader = gapToFront === "0.000" || (!gapToFront && inFirst);
		return (
			<span
				className={clsx("block w-full text-right tabular-nums", {
					"text-emerald-400": catching && !isLeader,
					"text-zinc-500": isLeader,
					"text-zinc-300": !catching && !isLeader && !!gapToFront,
					"text-zinc-700": !gapToFront,
				})}
			>
				{isLeader ? "·" : gapToFront || "---"}
			</span>
		);
	}

	const isLeader = gapToLeader === "0.000" || leaderLapMarker || (!gapToLeader && inFirst);
	return (
		<span
			className={clsx("block w-full text-right tabular-nums", {
				"text-emerald-400": isLeader,
				"text-zinc-300": !isLeader && !!gapToLeader,
				"text-zinc-700": !gapToLeader,
			})}
		>
			{isLeader ? "LEADER" : gapToLeader || "---"}
		</span>
	);
}
