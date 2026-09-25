"use client";

import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { sortPos } from "@/lib/sorting";

import type { PersonalBestLapTime } from "@/types/state.type";

function convertToMph(kmh: string): string {
	const n = parseInt(kmh);
	return isNaN(n) ? "—" : String(Math.floor(n / 1.609344));
}

const SpeedVal = ({ cell, unit }: { cell: PersonalBestLapTime | undefined; unit: string }) => {
	if (!cell?.Value) return <span className="text-zinc-800">—</span>;
	const display = unit === "metric" ? cell.Value : convertToMph(cell.Value);
	return (
		<span
			className={clsx("tabular-nums", {
				"text-violet-400": cell.Position === 1,
				"text-zinc-300": cell.Position !== 1,
			})}
		>
			{display}
		</span>
	);
};

export default function SpeedTraps() {
	const timingStats = useDataStore((s) => s.state?.TimingStats?.Lines);
	const driverList = useDataStore((s) => s.state?.DriverList);
	const timingData = useDataStore((s) => s.state?.TimingData?.Lines);
	const speedUnit = useSettingsStore((s) => s.speedUnit);

	const unit = speedUnit === "metric" ? "km/h" : "mph";

	if (!timingStats || !driverList || !timingData) {
		return <div className="px-2 py-1 font-mono text-sm text-zinc-700">waiting for session data...</div>;
	}

	const drivers = Object.values(timingData)
		.filter((d) => driverList[d.RacingNumber])
		.sort(sortPos);

	return (
		<div className="w-full max-w-3xl font-mono">
			<div className="overflow-auto">
				<table className="w-full text-sm">
					<thead className="sticky top-0 bg-black">
						<tr className="border-b-2 border-zinc-600">
							<th className="px-2 py-0.5 text-left text-[11px] tracking-widest text-zinc-500 uppercase">P</th>
							<th className="px-2 py-0.5 text-left text-[11px] tracking-widest text-zinc-500 uppercase">DRV</th>
							<th className="px-2 py-0.5 text-right text-[11px] tracking-widest text-zinc-500 uppercase">
								I1 <span className="text-zinc-700">{unit}</span>
							</th>
							<th className="px-2 py-0.5 text-right text-[11px] tracking-widest text-zinc-500 uppercase">
								I2 <span className="text-zinc-700">{unit}</span>
							</th>
							<th className="px-2 py-0.5 text-right text-[11px] tracking-widest text-zinc-500 uppercase">
								FL <span className="text-zinc-700">{unit}</span>
							</th>
							<th className="px-2 py-0.5 text-right text-[11px] tracking-widest text-zinc-500 uppercase">
								ST <span className="text-zinc-700">{unit}</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{drivers.map((td, i) => {
							const driver = driverList[td.RacingNumber];
							const stats = timingStats[td.RacingNumber];
							return (
								<tr key={td.RacingNumber} className="border-b border-zinc-900">
									<td className="px-2 py-0.5 text-zinc-600 tabular-nums">{i + 1}</td>
									<td className="px-2 py-0.5">
										<span className="font-bold" style={{ color: `#${driver.TeamColour}` }}>
											{driver.Tla}
										</span>
									</td>
									<td className="px-2 py-0.5 text-right">
										<SpeedVal cell={stats?.BestSpeeds?.I1} unit={unit} />
									</td>
									<td className="px-2 py-0.5 text-right">
										<SpeedVal cell={stats?.BestSpeeds?.I2} unit={unit} />
									</td>
									<td className="px-2 py-0.5 text-right">
										<SpeedVal cell={stats?.BestSpeeds?.Fl} unit={unit} />
									</td>
									<td className="px-2 py-0.5 text-right">
										<SpeedVal cell={stats?.BestSpeeds?.St} unit={unit} />
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
