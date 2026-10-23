"use client";

import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { getWindDirection } from "@/lib/getWindDirection";

import Panel from "@/components/ui/Panel";

const COMPASS: Record<string, string> = {
	N: "north",
	NE: "north-east",
	E: "east",
	SE: "south-east",
	S: "south",
	SW: "south-west",
	W: "west",
	NW: "north-west",
};

/** Conditions from WeatherData (SPEC §9), plus where the numbers come from. */
export default function WeatherPanel() {
	const weather = useDataStore((state) => state.state?.WeatherData);

	return (
		<div className="flex flex-col gap-3">
			<Panel
				title="Conditions"
				className="pb-3"
				header={
					weather && (
						<span
							className={clsx(
								"ml-auto flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold",
								weather.Rainfall === "1" ? "bg-pit/15 text-pit" : "bg-surface-2 text-fg-1",
							)}
						>
							{weather.Rainfall === "1" ? "Rain — rainfall reported" : "Dry — no rainfall"}
						</span>
					)
				}
			>
				{!weather ? (
					<p className="px-3 pb-1 text-[13px] text-fg-2">Waiting for the trackside weather station…</p>
				) : (
					<Conditions weather={weather} />
				)}
			</Panel>

			<Panel title="Where this comes from" className="pb-3">
				<div className="flex flex-col gap-2 px-3 text-xs leading-normal text-fg-2">
					<p>Conditions are the official trackside weather station, updated about once a minute.</p>
					<p>
						The radar animates the last two hours plus a short forecast. It is regional, so rain shown near the circuit
						may not reach it.
					</p>
				</div>
			</Panel>
		</div>
	);
}

type Weather = NonNullable<ReturnType<typeof useDataStore.getState>["state"]>["WeatherData"];

function Conditions({ weather }: { weather: NonNullable<Weather> }) {
	const track = Math.round(parseFloat(weather.TrackTemp));
	const air = Math.round(parseFloat(weather.AirTemp));
	const humidity = Math.round(parseFloat(weather.Humidity));
	const pressure = parseFloat(weather.Pressure);
	const windSpeed = parseFloat(weather.WindSpeed);
	const windDeg = parseInt(weather.WindDirection) || 0;
	// Nearest of the eight points, so the label agrees with the arrow.
	const windDir = getWindDirection((Math.round(windDeg / 45) * 45) % 360);

	return (
		<div className="grid grid-cols-2 gap-2.5 px-3">
			<Tile label="Track">
				<span className="font-mono text-[32px] leading-none font-semibold text-slower tabular-nums">{track}°</span>
				<span className="text-[11px] text-fg-3">
					{track - air >= 0 ? "+" : ""}
					{track - air}° {track >= air ? "above" : "below"} air
				</span>
			</Tile>
			<Tile label="Air">
				<span className="font-mono text-[32px] leading-none font-semibold text-pit tabular-nums">{air}°</span>
				<span className="text-[11px] text-fg-3">Celsius</span>
			</Tile>
			<Tile label="Humidity">
				<span className="font-mono text-xl font-semibold tabular-nums">{humidity}%</span>
				<span className="h-1 rounded-sm bg-surface-3" aria-hidden>
					<span className="block h-1 rounded-sm bg-fg-2" style={{ width: `${humidity}%` }} />
				</span>
			</Tile>
			<Tile label="Pressure">
				<span className="font-mono text-xl font-semibold tabular-nums">
					{pressure.toFixed(1)} <span className="text-xs font-normal text-fg-3">mb</span>
				</span>
			</Tile>
			<div className="col-span-2 flex items-center gap-4 rounded-[10px] border border-border bg-surface-2/60 p-3.5">
				<Compass deg={windDeg} />
				<div className="flex flex-col gap-1">
					<span className="text-xs text-fg-2">Wind</span>
					<span className="font-mono text-xl font-semibold tabular-nums">
						{windSpeed.toFixed(1)} <span className="text-xs font-normal text-fg-3">m/s</span>
					</span>
					<span className="text-xs text-fg-2">From the {COMPASS[windDir] ?? windDir}</span>
				</div>
			</div>
		</div>
	);
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-2 rounded-[10px] border border-border bg-surface-2/60 p-3.5">
			<span className="text-xs text-fg-2">{label}</span>
			{children}
		</div>
	);
}

// The arrow points where the wind blows to; WindDirection is where it comes from.
function Compass({ deg }: { deg: number }) {
	return (
		<svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
			<circle cx="32" cy="32" r="28" className="fill-none stroke-border-strong" strokeWidth="1.5" />
			{(["N", "E", "S", "W"] as const).map((d, i) => (
				<text
					key={d}
					x={32 + 22 * Math.sin((i * Math.PI) / 2)}
					y={32 - 22 * Math.cos((i * Math.PI) / 2) + 3}
					textAnchor="middle"
					className="fill-fg-3 text-[8px]"
				>
					{d}
				</text>
			))}
			<g transform={`rotate(${deg + 180} 32 32)`}>
				<path
					d="M32 14 L32 46 M32 14 L27 22 M32 14 L37 22"
					className="fill-none stroke-fg-1"
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</g>
		</svg>
	);
}
