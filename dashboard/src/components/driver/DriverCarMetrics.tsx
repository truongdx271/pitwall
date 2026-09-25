import clsx from "clsx";

import { useSettingsStore } from "@/stores/useSettingsStore";

import type { CarDataChannels } from "@/types/state.type";

type Props = {
	carData: CarDataChannels;
};

function convertKmhToMph(kmhValue: number) {
	return Math.floor(kmhValue / 1.609344);
}

/**
 * Compact telemetry strip. Rendered on an implicit second grid row under the
 * driver (spanning every column) so it stays tight instead of doubling the row.
 */
export default function DriverCarMetrics({ carData }: Props) {
	const speedUnit = useSettingsStore((state) => state.speedUnit);
	const speed = speedUnit === "metric" ? carData[2] : convertKmhToMph(carData[2]);
	const unit = speedUnit === "metric" ? "km/h" : "mph";

	return (
		<div className="col-span-full flex items-center gap-3 pt-0.5 pl-[7ch] font-mono text-[11px] leading-none">
			<span className="tabular-nums">
				<span className="text-zinc-700">G</span>
				<span className="text-zinc-300">{carData[3]}</span>
			</span>
			<span className="tabular-nums">
				<span className="text-zinc-300">{speed}</span>
				<span className="text-zinc-700"> {unit}</span>
			</span>
			<span className="flex items-center gap-2">
				<Bar label="RPM" value={carData[0]} max={15000} className="bg-sky-500" />
				<Bar label="THR" value={carData[4]} max={100} className="bg-emerald-500" />
				<Bar label="BRK" value={carData[5]} max={100} className="bg-red-500" />
			</span>
		</div>
	);
}

function Bar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
	const pct = Math.max(0, Math.min(1, value / max));
	return (
		<span className="flex items-center gap-1">
			<span className="text-[9px] text-zinc-700">{label}</span>
			<span className="h-1 w-10 overflow-hidden rounded-full bg-zinc-800">
				<span
					className={clsx("block h-full transition-[width] duration-100 ease-linear", className)}
					style={{ width: `${pct * 100}%` }}
				/>
			</span>
		</span>
	);
}
