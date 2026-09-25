"use client";

import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { getWindDirection } from "@/lib/getWindDirection";

/**
 * Current conditions, read straight from WeatherData. Overlaid on the rain radar
 * so the tab is useful even when it's dry and there's nothing on the map.
 */
export default function WeatherPanel() {
	const weather = useDataStore((state) => state.state?.WeatherData);

	if (!weather) return null;

	const trc = Math.round(parseFloat(weather.TrackTemp));
	const air = Math.round(parseFloat(weather.AirTemp));
	const hum = Math.round(parseFloat(weather.Humidity));
	const pressure = parseFloat(weather.Pressure);
	const windSpeed = parseFloat(weather.WindSpeed);
	const windDeg = parseInt(weather.WindDirection);
	const windDir = getWindDirection(windDeg);
	const raining = weather.Rainfall === "1";

	return (
		<div className="pointer-events-none absolute top-0 left-0 z-20 m-2 rounded-lg bg-black/80 p-3 font-mono text-sm backdrop-blur-xs">
			<div className="mb-2 flex items-center justify-between gap-6">
				<span className="text-[11px] tracking-widest text-zinc-500 uppercase">conditions</span>
				<span
					className={clsx("text-[11px] font-bold tracking-widest uppercase", {
						"text-blue-400": raining,
						"text-zinc-600": !raining,
					})}
				>
					{raining ? "● rain" : "dry"}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
				<Metric label="track" value={`${trc}°`} className="text-amber-300" />
				<Metric label="air" value={`${air}°`} className="text-sky-300" />
				<Metric label="humidity" value={`${hum}%`} />
				<Metric label="pressure" value={`${pressure.toFixed(1)}`} unit="mb" />
				<div className="col-span-2 flex items-baseline justify-between gap-4">
					<span className="text-[11px] tracking-widest text-zinc-600 uppercase">wind</span>
					<span className="flex items-baseline gap-[0.5ch] tabular-nums">
						<span
							aria-hidden
							className="text-zinc-500"
							style={{ display: "inline-block", transform: `rotate(${windDeg}deg)` }}
						>
							↑
						</span>
						<span className="text-zinc-300">{windSpeed.toFixed(1)}</span>
						<span className="text-zinc-600">m/s</span>
						<span className="text-zinc-500">{windDir}</span>
					</span>
				</div>
			</div>
		</div>
	);
}

function Metric({
	label,
	value,
	unit,
	className,
}: {
	label: string;
	value: string;
	unit?: string;
	className?: string;
}) {
	return (
		<div className="flex items-baseline justify-between gap-4">
			<span className="text-[11px] tracking-widest text-zinc-600 uppercase">{label}</span>
			<span className="tabular-nums">
				<span className={className ?? "text-zinc-300"}>{value}</span>
				{unit && <span className="text-zinc-600"> {unit}</span>}
			</span>
		</div>
	);
}
