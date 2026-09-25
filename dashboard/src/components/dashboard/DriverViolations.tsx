import type { Driver, TimingData } from "@/types/state.type";

import { calculatePosition } from "@/lib/calculatePosition";

import DriverTag from "@/components/driver/DriverTag";

type Props = {
	driver: Driver;
	driverViolations: number;
	driversTiming: TimingData | undefined;
	max: number;
};

export default function DriverViolations({ driver, driverViolations, driversTiming, max }: Props) {
	const hasPenalty = driverViolations > 4;
	const penaltySeconds = Math.round(driverViolations / 5) * 5;
	const pct = Math.max(0.06, driverViolations / max);

	return (
		<div className="flex items-center gap-[1ch] border-b border-zinc-900 px-2 py-1 font-mono text-sm">
			<DriverTag teamColor={driver.TeamColour} short={driver.Tla} />

			<span className="h-2 flex-1">
				<span
					className={hasPenalty ? "block h-full bg-red-500/70" : "block h-full bg-amber-400/60"}
					style={{ width: `${pct * 100}%` }}
				/>
			</span>

			<span className="shrink-0 text-amber-400 tabular-nums">{driverViolations}v</span>
			{hasPenalty && <span className="shrink-0 text-red-500 tabular-nums">+{penaltySeconds}s</span>}
			{hasPenalty && driversTiming && (
				<span className="shrink-0 text-zinc-600">
					→ P{calculatePosition(penaltySeconds, driver.RacingNumber, driversTiming)}
				</span>
			)}
		</div>
	);
}
