"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { sessionPartPrefix } from "@/lib/sessionPart";
import { circuitLocalTime, sessionRemaining } from "@/lib/sessionClock";
import { latestSessionStatus, trackStatusView, type TrackStatusKind } from "@/lib/trackStatus";

import Icon from "./icons";

// Pill colours (SPEC §2.2). Clear is a tint, the rest are solid flag colours.
export const STATUS_PILL: Record<TrackStatusKind, string> = {
	clear: "bg-flag-clear/14 text-flag-clear",
	yellow: "bg-flag-yellow text-bg",
	sc: "bg-flag-sc text-bg",
	vsc: "bg-flag-sc text-bg",
	red: "bg-flag-red text-bg",
	chequered: "bg-surface-3 text-fg-1",
};

const useNow = () => {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);
	return now;
};

// ~56px band under the top bar (SPEC §2.2): meeting, lap or clock, weather, track status.
export default function SessionStrip() {
	const session = useDataStore((s) => s.state?.SessionInfo);
	const statusCode = useDataStore((s) => s.state?.TrackStatus?.Status);
	const sessionStatus = useDataStore((s) =>
		latestSessionStatus(s.state?.SessionData?.StatusSeries, s.state?.SessionStatus?.Status),
	);

	const status = trackStatusView(statusCode, sessionStatus);
	const isQuali = session?.Type === "Qualifying" || !!session?.Name.toLowerCase().includes("qualifying");
	const isRace = !isQuali && session?.Type === "Race";

	return (
		<section
			aria-label="Session"
			className="flex flex-wrap items-center gap-x-7 gap-y-2 border-b border-border px-4 py-2.5"
		>
			<div className="flex min-w-0 items-center gap-3">
				<span className="rounded-tag bg-surface-3 px-1.5 py-1 font-mono text-xs font-semibold text-fg-2">
					{session?.Meeting.Country.Code?.toUpperCase() ?? "---"}
				</span>
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-base font-semibold tracking-[-0.01em]">
						{session?.Meeting.Name ?? "Waiting for session…"}
					</span>
					{session && (
						<span className="truncate text-xs text-fg-2">
							{session.Name} · {session.Meeting.Circuit.ShortName}
							<LocalTime gmtOffset={session.GmtOffset} />
						</span>
					)}
				</div>
			</div>

			{session && (isRace ? <RaceProgress /> : <SessionTime isQuali={isQuali} />)}

			<WeatherInline />

			{status && (
				<div
					role="status"
					className={clsx(
						"ml-auto inline-flex h-[38px] items-center gap-2 rounded-control px-4 text-sm font-semibold",
						STATUS_PILL[status.kind],
					)}
				>
					<Icon name="flag" strokeWidth={2.2} />
					<span>{status.label}</span>
				</div>
			)}
		</section>
	);
}

function RaceProgress() {
	const lapCount = useDataStore((s) => s.state?.LapCount);
	if (!lapCount) return null;

	const pct = lapCount.TotalLaps > 0 ? Math.min(100, (lapCount.CurrentLap / lapCount.TotalLaps) * 100) : 0;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-baseline gap-1.5">
				<span className="text-[11px] font-medium tracking-[0.06em] text-fg-3">LAP</span>
				<span className="font-mono text-2xl leading-none font-semibold tabular-nums">{lapCount.CurrentLap}</span>
				<span className="font-mono text-sm text-fg-3 tabular-nums">/ {lapCount.TotalLaps}</span>
			</div>
			<div className="h-1 w-[140px] rounded-sm bg-surface-3" aria-hidden>
				<div className="h-1 rounded-sm bg-fg-1" style={{ width: `${pct}%` }} />
			</div>
		</div>
	);
}

// The two ticking values live in their own components so only they re-render every second.
function LocalTime({ gmtOffset }: { gmtOffset: string }) {
	const delay = useSettingsStore((s) => s.delay);
	const localTime = circuitLocalTime(useNow(), gmtOffset, delay);
	if (!localTime) return null;

	return (
		<>
			{" · "}
			<span className="font-mono text-fg-1 tabular-nums">{localTime}</span> local
		</>
	);
}

function SessionTime({ isQuali }: { isQuali: boolean }) {
	const now = useNow();
	const clock = useDataStore((s) => s.state?.ExtrapolatedClock);
	const part = useDataStore((s) => s.state?.TimingData?.SessionPart);
	const sessionName = useDataStore((s) => s.state?.SessionInfo?.Name ?? "");
	const delay = useSettingsStore((s) => s.delay);

	const remaining = sessionRemaining(clock, now, delay);
	const prefix = sessionPartPrefix(sessionName) || "Q";

	return (
		<div className="flex items-center gap-3.5">
			{isQuali && (
				<div
					role="group"
					aria-label="Qualifying part"
					className="flex gap-0.5 rounded-control border border-border bg-surface-1 p-0.5"
				>
					{[1, 2, 3].map((p) => (
						<span
							key={p}
							aria-current={p === part ? "step" : undefined}
							className={clsx(
								"flex h-7 items-center rounded-md px-3 text-[13px]",
								p === part ? "bg-fg-1 font-semibold text-bg" : "font-medium text-fg-3",
							)}
						>
							{prefix}
							{p}
						</span>
					))}
				</div>
			)}
			<div className="flex flex-col gap-0.5">
				<span className="font-mono text-2xl leading-none font-semibold tabular-nums">{remaining ?? "--:--"}</span>
				<span className="text-[11px] font-medium tracking-[0.06em] text-fg-3">REMAINING</span>
			</div>
		</div>
	);
}

function WeatherInline() {
	const weather = useDataStore((s) => s.state?.WeatherData);
	if (!weather) return null;

	const rain = weather.Rainfall === "1";

	return (
		<div className="flex flex-wrap items-center gap-5 text-xs text-fg-3">
			<WeatherValue icon="thermometer" label="Track" value={`${Math.round(parseFloat(weather.TrackTemp))}°`} />
			<WeatherValue label="Air" value={`${Math.round(parseFloat(weather.AirTemp))}°`} />
			<WeatherValue icon="droplet" label="Humidity" value={`${Math.round(parseFloat(weather.Humidity))}%`} />
			<WeatherValue icon="wind" label="Wind" value={`${parseFloat(weather.WindSpeed).toFixed(1)} m/s`} />
			<span
				className={clsx(
					"flex h-6 items-center rounded-md px-2",
					rain ? "bg-pit/15 font-semibold text-pit" : "bg-surface-2 text-fg-2",
				)}
			>
				{rain ? "Rain" : "Dry"}
			</span>
		</div>
	);
}

function WeatherValue({
	icon,
	label,
	value,
}: {
	icon?: "thermometer" | "droplet" | "wind";
	label: string;
	value: string;
}) {
	return (
		<span className="flex items-center gap-1.5">
			{icon && <Icon name={icon} size={14} />}
			{label}
			<span className="font-mono text-[13px] text-fg-1 tabular-nums">{value}</span>
		</span>
	);
}
