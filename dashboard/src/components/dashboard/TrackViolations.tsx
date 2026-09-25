import type { Driver } from "@/types/state.type";

import { useDataStore } from "@/stores/useDataStore";

import DriverViolations from "./DriverViolations";

type Violations = {
	[key: string]: number;
};

const findCarNumber = (message: string): string | undefined => {
	const match = message.match(/CAR (\d+)/);
	return match?.[1];
};

const sortViolations = (driverA: Driver, driverB: Driver, violations: Violations): number => {
	const a = violations[driverA.RacingNumber];
	const b = violations[driverB.RacingNumber];
	return b - a;
};

export default function TrackViolations() {
	const messages = useDataStore((state) => state.state?.RaceControlMessages);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const driversTiming = useDataStore((state) => state.state?.TimingData);

	const trackLimits =
		messages?.Messages.filter((rcm) => rcm.Category == "Other")
			.filter((rcm) => rcm.Message.includes("TRACK LIMITS"))
			.reduce((acc: Violations, violations) => {
				const carNr = findCarNumber(violations.Message);
				if (!carNr) return acc;
				acc[carNr] = (acc[carNr] ?? 0) + 1;
				return acc;
			}, {}) ?? {};

	const violationDrivers = drivers
		? Object.values(drivers).filter((driver) => trackLimits[driver.RacingNumber] > 0)
		: undefined;

	const total = Object.values(trackLimits).reduce((a, b) => a + b, 0);
	const max = Math.max(1, ...Object.values(trackLimits));

	return (
		<div className="max-w-lg font-mono">
			<div className="flex items-center justify-between border-b-2 border-zinc-700 px-2 py-0.5">
				<span className="text-[11px] tracking-widest text-zinc-500 uppercase">track violations</span>
				{total > 0 && <span className="text-[11px] text-zinc-600 tabular-nums">{total} total</span>}
			</div>

			{violationDrivers && violationDrivers.length < 1 && (
				<div className="px-2 py-3 text-sm text-zinc-700">no violations</div>
			)}

			{violationDrivers &&
				trackLimits &&
				violationDrivers
					.sort((a, b) => sortViolations(a, b, trackLimits))
					.map((driver) => (
						<DriverViolations
							key={`violation.driver.${driver.RacingNumber}`}
							driver={driver}
							driversTiming={driversTiming ?? undefined}
							driverViolations={trackLimits[driver.RacingNumber]}
							max={max}
						/>
					))}
		</div>
	);
}
