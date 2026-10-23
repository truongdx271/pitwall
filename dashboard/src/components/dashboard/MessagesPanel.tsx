"use client";

import { useEffect, useRef, useState } from "react";
import { utc } from "moment";
import clsx from "clsx";

import type { Driver, Message, RadioCapture } from "@/types/state.type";

import { useDataStore } from "@/stores/useDataStore";
import { useRadioTranscript } from "@/hooks/useRadioTranscript";
import { useRaceControlChime } from "@/hooks/useRaceControlChime";
import { hasWords } from "@/lib/radioTranscript";
import { waveformBars } from "@/lib/waveform";

import Panel from "@/components/ui/Panel";
import DriverChip from "@/components/driver/DriverChip";

type Filter = "all" | "radio" | "rc";

type Item = { kind: "rc"; utc: string; msg: Message } | { kind: "radio"; utc: string; capture: RadioCapture };

const MAX_CLIPS = 20;

// Messages panel shared by the Live tab in every session (SPEC §3.4): race control and team
// radio, newest first, scrolling inside itself.
export default function MessagesPanel({ className }: { className?: string }) {
	const messages = useDataStore((s) => s.state?.RaceControlMessages?.Messages);
	const captures = useDataStore((s) => s.state?.TeamRadio?.Captures);
	const drivers = useDataStore((s) => s.state?.DriverList);
	const sessionPath = useDataStore((s) => s.state?.SessionInfo?.Path);
	const [filter, setFilter] = useState<Filter>("all");

	useRaceControlChime(messages);

	// Blue flags are noise here, as in the old race control list.
	const rc: Item[] = (messages ?? [])
		.filter((msg) => (msg.Flag ? msg.Flag.toLowerCase() !== "blue" : true))
		.map((msg) => ({ kind: "rc", utc: msg.Utc, msg }));
	const radio: Item[] = [...(captures ?? [])]
		.sort((a, b) => Date.parse(b.Utc) - Date.parse(a.Utc))
		.slice(0, MAX_CLIPS)
		.map((capture) => ({ kind: "radio", utc: capture.Utc, capture }));

	const items = (filter === "rc" ? rc : filter === "radio" ? radio : [...rc, ...radio]).sort(
		(a, b) => Date.parse(b.utc) - Date.parse(a.utc),
	);

	const filters: { id: Filter; label: string; count: number }[] = [
		{ id: "all", label: "All", count: rc.length + radio.length },
		{ id: "radio", label: "Radio", count: radio.length },
		{ id: "rc", label: "Race control", count: rc.length },
	];

	return (
		<Panel
			title="Messages"
			className={className}
			header={
				<div role="group" aria-label="Filter messages" className="ml-auto flex gap-0.5 rounded-control bg-bg p-0.5">
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
			}
		>
			<div className="min-h-0 flex-1 overflow-y-auto border-t border-border">
				{items.length === 0 && <EmptyMessages />}
				{items.map((item) =>
					item.kind === "rc" ? (
						<RaceControlItem key={`rc.${item.utc}.${item.msg.Message}`} msg={item.msg} />
					) : (
						<RadioItem
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

const clock = (iso: string) => utc(iso).local().format("HH:mm:ss");

function EmptyMessages() {
	return (
		<div className="flex flex-col items-start gap-2 p-6">
			<span className="text-[15px] font-semibold">Quiet so far</span>
			<p className="text-[13px] leading-normal text-fg-2">
				Team radio and race control notes will appear here as they happen.
			</p>
		</div>
	);
}

function RaceControlItem({ msg }: { msg: Message }) {
	return (
		<article className="flex gap-3 border-b border-border p-3">
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
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-center gap-2">
					<span className="text-xs font-medium">Race control</span>
					<time className="font-mono text-xs text-fg-3 tabular-nums">{clock(msg.Utc)}</time>
					{msg.Lap != null && (
						<span className="rounded-tag bg-surface-3 px-1.5 py-px font-mono text-[11px] text-fg-2 tabular-nums">
							L{msg.Lap}
						</span>
					)}
				</div>
				<p className="text-[13px] leading-normal text-fg-body">{msg.Message}</p>
			</div>
		</article>
	);
}

type RadioItemProps = {
	capture: RadioCapture;
	driver: Driver | undefined;
	sessionPath: string | undefined;
};

function RadioItem({ capture, driver, sessionPath }: RadioItemProps) {
	const transcript = useRadioTranscript(sessionPath, capture.Path);

	// Hide clips that turned out to have no words, as the old transcript list did.
	if (!driver || !sessionPath || transcript.status === "unavailable") return null;
	if (transcript.status === "done" && !hasWords(transcript.text)) return null;

	return (
		<RadioClip
			capture={capture}
			driver={driver}
			src={`https://livetiming.formula1.com/static/${sessionPath}${capture.Path}`}
			text={transcript.status === "done" ? transcript.text : null}
		/>
	);
}

type RadioClipProps = {
	capture: RadioCapture;
	driver: Driver;
	src: string;
	/** Transcript, or null while it's still being made. */
	text: string | null;
};

function RadioClip({ capture, driver, src, text }: RadioClipProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(0);
	const [failed, setFailed] = useState(false);

	// Stop the progress loop on unmount so we don't setState on a dead component.
	useEffect(() => {
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	const tick = () => {
		const el = audioRef.current;
		if (!el) return;
		setProgress(el.currentTime);
		rafRef.current = requestAnimationFrame(tick);
	};

	const stopTick = () => {
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = null;
	};

	const togglePlayback = async () => {
		const el = audioRef.current;
		if (!el || failed) return;
		if (playing) {
			el.pause();
			stopTick();
			setPlaying(false);
			return;
		}
		try {
			await el.play();
			setPlaying(true);
			tick();
		} catch {
			setFailed(true);
			setPlaying(false);
			stopTick();
		}
	};

	const bars = waveformBars(capture.Path);
	const played = duration > 0 ? Math.floor((progress / duration) * bars.length) : 0;

	return (
		<article className={clsx("flex gap-3 border-b border-border p-3", failed && "opacity-60")}>
			<button
				type="button"
				onClick={togglePlayback}
				disabled={failed}
				aria-label={failed ? "Radio unavailable" : playing ? "Pause team radio" : "Play team radio"}
				className="flex size-9 flex-none cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface-2 text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1 disabled:cursor-not-allowed"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
					{playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4v16l13-8z" />}
				</svg>
			</button>

			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex items-center gap-2">
					<DriverChip short={driver.Tla} teamColor={driver.TeamColour} size="sm" />
					<span className="text-xs font-medium">Team radio</span>
					<time className="font-mono text-xs text-fg-3 tabular-nums">{clock(capture.Utc)}</time>
					<span className="ml-auto text-[11px] text-fg-3">Auto-transcribed</span>
				</div>

				{/* Decorative: the feed carries no amplitude data. */}
				<svg viewBox="0 0 240 16" className="block h-4 w-full max-w-60" aria-hidden="true">
					{bars.map((h, i) => (
						<rect
							key={i}
							x={i * 5}
							y={8 - h * 7}
							width={2}
							height={h * 14}
							rx={1}
							className={i < played ? "fill-fg-1" : "fill-fg-3"}
						/>
					))}
				</svg>

				{text == null ? (
					<p className="text-xs text-fg-3">Transcribing…</p>
				) : (
					<p className="text-[13px] leading-normal text-fg-body">{text}</p>
				)}
			</div>

			<audio
				ref={audioRef}
				preload="metadata"
				src={src}
				onEnded={() => {
					setPlaying(false);
					setProgress(0);
					stopTick();
				}}
				onError={() => setFailed(true)}
				onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
			/>
		</article>
	);
}
