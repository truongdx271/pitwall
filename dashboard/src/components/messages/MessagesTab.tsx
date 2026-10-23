"use client";

import { useState } from "react";
import { utc } from "moment";
import clsx from "clsx";

import type { Driver, Message, RadioCapture } from "@/types/state.type";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useRadioTranscript } from "@/hooks/useRadioTranscript";
import { useRaceControlChime } from "@/hooks/useRaceControlChime";
import { hasWords } from "@/lib/radioTranscript";
import { incidentCars, incidents, rcStatus, RC_STATUS_LABEL, type RcStatus } from "@/lib/rcStatus";

import Panel from "@/components/ui/Panel";
import SelectMultiple from "@/components/ui/SelectMultiple";
import DriverChip from "@/components/driver/DriverChip";

import RadioClip from "./RadioClip";

type Filter = "all" | "radio" | "rc";

type Item = { kind: "rc"; utc: string; msg: Message } | { kind: "radio"; utc: string; capture: RadioCapture };

const RC_STATUS_TAG: Record<RcStatus, string> = {
	noted: "bg-surface-3 text-fg-2",
	investigation: "bg-slower/14 text-slower",
	penalty: "bg-loss/14 text-loss",
	nfa: "bg-personal-best/14 text-personal-best",
};

const clock = (iso: string) => utc(iso).local().format("HH:mm:ss");

// Messages tab (SPEC §7, Messages.png): the feed on the left, incidents and track limits on the right.
export default function MessagesTab() {
	return (
		<div className="flex h-full flex-wrap items-stretch gap-3 p-3 xl:flex-nowrap">
			<div className="flex min-h-[480px] min-w-0 flex-[999_1_640px] flex-col">
				<Feed />
			</div>
			<div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3 xl:max-w-[380px]">
				<IncidentsPanel />
				<TrackLimitsPanel />
			</div>
		</div>
	);
}

function Feed() {
	const messages = useDataStore((s) => s.state?.RaceControlMessages?.Messages);
	const captures = useDataStore((s) => s.state?.TeamRadio?.Captures);
	const drivers = useDataStore((s) => s.state?.DriverList);
	const sessionPath = useDataStore((s) => s.state?.SessionInfo?.Path);
	const chime = useSettingsStore((s) => s.raceControlChime);
	const setChime = useSettingsStore((s) => s.setRaceControlChime);
	const [filter, setFilter] = useState<Filter>("all");
	const [only, setOnly] = useState<string[]>([]);

	useRaceControlChime(messages);

	// The driver filter keeps race control messages that name one of the drivers.
	const byDriver = (nrs: string[]) => only.length === 0 || nrs.some((nr) => only.includes(nr));

	const rc: Item[] = (messages ?? [])
		.filter((msg) => (msg.Flag ? msg.Flag.toLowerCase() !== "blue" : true))
		.filter((msg) => byDriver(incidentCars(msg.Message).concat(msg.Message.match(/CAR (\d+)/)?.[1] ?? [])))
		.map((msg) => ({ kind: "rc", utc: msg.Utc, msg }));
	const radio: Item[] = (captures ?? [])
		.filter((c) => byDriver([c.RacingNumber]))
		.map((capture) => ({ kind: "radio", utc: capture.Utc, capture }));

	const items = (filter === "rc" ? rc : filter === "radio" ? radio : [...rc, ...radio]).sort(
		(a, b) => Date.parse(b.utc) - Date.parse(a.utc),
	);

	const filters: { id: Filter; label: string; count: number }[] = [
		{ id: "all", label: "All", count: rc.length + radio.length },
		{ id: "radio", label: "Radio", count: radio.length },
		{ id: "rc", label: "Race control", count: rc.length },
	];

	const options = drivers
		? Object.values(drivers).map((d) => ({ value: d.RacingNumber, label: `${d.Tla} · ${d.FullName}` }))
		: [];

	return (
		<Panel
			title="Feed"
			className="h-full"
			header={
				<>
					<div role="group" aria-label="Filter messages" className="flex gap-0.5 rounded-control bg-bg p-0.5">
						{filters.map((f) => (
							<button
								key={f.id}
								type="button"
								aria-pressed={filter === f.id}
								onClick={() => setFilter(f.id)}
								className={clsx(
									"flex h-[30px] cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fg-1",
									filter === f.id ? "bg-surface-3 text-fg-1" : "text-fg-2 hover:text-fg-1",
								)}
							>
								{f.label}
								<span className="font-mono text-fg-3 tabular-nums">{f.count}</span>
							</button>
						))}
					</div>
					<div className="w-48">
						<SelectMultiple placeholder="All drivers" options={options} selected={only} setSelected={setOnly} />
					</div>
					<label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-fg-2">
						<input
							type="checkbox"
							checked={chime}
							onChange={(e) => setChime(e.target.checked)}
							className="size-4 accent-fg-1"
						/>
						Chime on new race control message
					</label>
				</>
			}
		>
			<div className="min-h-0 flex-1 overflow-y-auto border-t border-border">
				{items.length === 0 && (
					<div className="flex flex-col items-start gap-2 p-6">
						<span className="text-[15px] font-semibold">Nothing yet</span>
						<p className="text-[13px] text-fg-2">Race control notes and team radio will appear here as they happen.</p>
					</div>
				)}
				{items.map((item) =>
					item.kind === "rc" ? (
						<RcFeedItem key={`rc.${item.utc}.${item.msg.Message}`} msg={item.msg} />
					) : (
						<RadioFeedItem
							key={`radio.${item.capture.Path}`}
							capture={item.capture}
							driver={drivers?.[item.capture.RacingNumber]}
							sessionPath={sessionPath}
						/>
					),
				)}
			</div>
		</Panel>
	);
}

function RcFeedItem({ msg }: { msg: Message }) {
	const status = rcStatus(msg.Message);

	return (
		<article className="flex gap-3 border-b border-border p-3">
			<time className="w-[72px] shrink-0 pt-2 font-mono text-xs text-fg-3 tabular-nums">{clock(msg.Utc)}</time>
			<div className="flex size-9 flex-none items-center justify-center rounded-control bg-slower/12 text-slower">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M5 22V4M5 4h13l-2.5 4.5L18 13H5" />
				</svg>
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-[13px] font-medium">Race control</span>
					{msg.Lap != null && (
						<span className="rounded-tag bg-surface-3 px-1.5 py-px font-mono text-[11px] text-fg-2 tabular-nums">
							L{msg.Lap}
						</span>
					)}
					{status && (
						<span className={clsx("rounded-tag px-1.5 py-px text-[11px] font-semibold", RC_STATUS_TAG[status])}>
							{RC_STATUS_LABEL[status]}
						</span>
					)}
				</div>
				<p className="text-sm leading-normal text-fg-body">{msg.Message}</p>
			</div>
		</article>
	);
}

type RadioFeedItemProps = {
	capture: RadioCapture;
	driver: Driver | undefined;
	sessionPath: string | undefined;
};

function RadioFeedItem({ capture, driver, sessionPath }: RadioFeedItemProps) {
	// The feed fetches a transcript when asked; ones already fetched elsewhere show straight away.
	const [wanted, setWanted] = useState(false);
	const transcript = useRadioTranscript(sessionPath, capture.Path, { enabled: wanted });

	if (!driver || !sessionPath) return null;
	// Hide failed or wordless clips, unless the viewer asked for this one: then say why.
	const wordless = transcript.status === "done" && !hasWords(transcript.text);
	if (!wanted && (transcript.status === "unavailable" || wordless)) return null;

	return (
		<RadioClip
			note={
				transcript.status === "unavailable" ? "Transcript unavailable" : wordless ? "No words in this clip" : undefined
			}
			variant="feed"
			capture={capture}
			driver={driver}
			src={`https://livetiming.formula1.com/static/${sessionPath}${capture.Path}`}
			transcript={transcript}
			onShowTranscript={() => setWanted(true)}
		/>
	);
}

function IncidentsPanel() {
	const messages = useDataStore((s) => s.state?.RaceControlMessages?.Messages);
	const drivers = useDataStore((s) => s.state?.DriverList);
	const list = incidents(messages ?? []);

	return (
		<Panel
			title="Incidents"
			header={
				<>
					<span className="rounded-tag bg-surface-3 px-1.5 py-px font-mono text-[11px] text-fg-2">{list.length}</span>
					<span className="ml-auto text-xs text-fg-3">From race control</span>
				</>
			}
		>
			<div className="max-h-[360px] overflow-y-auto border-t border-border">
				{list.length === 0 && <p className="px-3 py-4 text-[13px] text-fg-2">No incidents so far</p>}
				{list.map((inc) => (
					<div
						key={`${inc.utc}.${inc.cars.join(",")}.${inc.summary}`}
						className="flex items-center gap-3 border-b border-border px-3 py-2.5"
					>
						<span className="flex shrink-0 flex-wrap gap-1">
							{inc.cars.map((nr) => {
								const d = drivers?.[nr];
								return d ? <DriverChip key={nr} short={d.Tla} teamColor={d.TeamColour} size="sm" /> : null;
							})}
						</span>
						<span className="min-w-0 flex-1 text-xs leading-snug text-fg-body">{inc.summary}</span>
						<span
							className={clsx("shrink-0 rounded-tag px-1.5 py-px text-[11px] font-semibold", RC_STATUS_TAG[inc.status])}
						>
							{inc.status === "noted" ? "Noted" : RC_STATUS_LABEL[inc.status]}
						</span>
					</div>
				))}
			</div>
			<ul className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2.5 text-[11px] text-fg-3">
				{(
					[
						["Noted", "bg-fg-3"],
						["Under investigation", "bg-slower"],
						["Penalty", "bg-loss"],
						["No further action", "bg-personal-best"],
					] as const
				).map(([label, dot]) => (
					<li key={label} className="flex items-center gap-1.5">
						<span aria-hidden className={clsx("size-1.5 rounded-full", dot)} />
						{label}
					</li>
				))}
			</ul>
		</Panel>
	);
}

// Track limits: the existing TrackViolations count (race control "TRACK LIMITS" notes per car).
function TrackLimitsPanel() {
	const messages = useDataStore((s) => s.state?.RaceControlMessages?.Messages);
	const drivers = useDataStore((s) => s.state?.DriverList);

	const counts: Record<string, number> = {};
	for (const msg of messages ?? []) {
		if (msg.Category !== "Other" || !msg.Message.includes("TRACK LIMITS")) continue;
		const nr = msg.Message.match(/CAR (\d+)/)?.[1];
		if (nr) counts[nr] = (counts[nr] ?? 0) + 1;
	}
	const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
	const total = rows.reduce((sum, [, n]) => sum + n, 0);

	return (
		<Panel
			title="Track limits"
			className="flex-1"
			header={
				<>
					<span className="rounded-tag bg-surface-3 px-1.5 py-px font-mono text-[11px] text-fg-2">{total}</span>
					<span className="ml-auto text-xs text-fg-3">Deleted laps per driver</span>
				</>
			}
		>
			<div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-3 py-1.5">
				{rows.length === 0 && (
					<div className="flex flex-col gap-1 py-3">
						<span className="text-[13px] font-semibold">No track-limit violations</span>
						<span className="text-xs text-fg-2">
							Deleted laps will be counted per driver here, with the one that brings the black-and-white flag
							highlighted.
						</span>
					</div>
				)}
				{rows.map(([nr, n]) => {
					const d = drivers?.[nr];
					if (!d) return null;
					return (
						<div key={nr} className="flex h-11 items-center gap-3">
							<DriverChip short={d.Tla} teamColor={d.TeamColour} />
							<span className="flex flex-1 gap-1.5" aria-label={`${n} deleted laps`}>
								{[0, 1, 2, 3].map((k) => (
									<span
										key={k}
										className={clsx(
											"h-1.5 flex-1 rounded-sm",
											k < n ? (n >= 3 ? "bg-loss" : "bg-slower") : "bg-surface-3",
										)}
									/>
								))}
							</span>
							<span className={clsx("w-32 text-right text-xs", n >= 3 ? "text-loss" : "text-fg-2")}>
								{n >= 3 ? "Black & white flag" : `${n} of 3`}
							</span>
						</div>
					);
				})}
			</div>
		</Panel>
	);
}
