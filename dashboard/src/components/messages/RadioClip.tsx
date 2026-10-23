"use client";

import { useEffect, useRef, useState } from "react";
import { utc } from "moment";
import clsx from "clsx";

import type { Driver, RadioCapture } from "@/types/state.type";
import type { TranscriptState } from "@/hooks/useRadioTranscript";
import { waveformBars } from "@/lib/waveform";

import DriverChip from "@/components/driver/DriverChip";

type Props = {
	capture: RadioCapture;
	driver: Driver;
	src: string;
	transcript: TranscriptState;
	/**
	 * panel: the Live tab's Messages panel. feed: the Messages tab, with the time in a gutter,
	 * the clip length, and a "Show transcript" button for clips not transcribed yet.
	 */
	variant?: "panel" | "feed";
	onShowTranscript?: () => void;
	/** Shown in place of the transcript, e.g. "Transcript unavailable". */
	note?: string;
};

const clock = (iso: string) => utc(iso).local().format("HH:mm:ss");

const length = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// One team radio clip: play/pause, a decorative waveform (the feed has no amplitude data,
// SPEC §7), and the transcript.
export default function RadioClip({
	capture,
	driver,
	src,
	transcript,
	variant = "panel",
	onShowTranscript,
	note,
}: Props) {
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

	const feed = variant === "feed";
	const bars = waveformBars(capture.Path);
	const played = duration > 0 ? Math.floor((progress / duration) * bars.length) : 0;

	return (
		<article
			className={clsx(
				"flex gap-3 border-b border-border p-3",
				failed && "opacity-60",
				playing && feed && "bg-surface-2",
			)}
		>
			{feed && (
				<time className="w-[72px] shrink-0 pt-2 font-mono text-xs text-fg-3 tabular-nums">{clock(capture.Utc)}</time>
			)}

			<button
				type="button"
				onClick={togglePlayback}
				disabled={failed}
				aria-label={failed ? "Radio unavailable" : playing ? "Pause team radio" : "Play team radio"}
				className={clsx(
					"flex size-9 flex-none cursor-pointer items-center justify-center rounded-full border focus-visible:outline-2 focus-visible:outline-fg-1 disabled:cursor-not-allowed",
					playing ? "border-fg-1 bg-fg-1 text-bg" : "border-border-strong bg-surface-2 text-fg-1",
				)}
			>
				<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
					{playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4v16l13-8z" />}
				</svg>
			</button>

			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex items-center gap-2">
					<DriverChip short={driver.Tla} teamColor={driver.TeamColour} size="sm" />
					<span className="text-xs font-medium">Team radio</span>
					{feed ? (
						<>
							<Waveform bars={bars} played={played} />
							<span className="font-mono text-xs text-fg-2 tabular-nums">
								{duration > 0 ? length(duration) : "–:––"}
							</span>
						</>
					) : (
						<>
							<time className="font-mono text-xs text-fg-3 tabular-nums">{clock(capture.Utc)}</time>
							<span className="ml-auto text-[11px] text-fg-3">Auto-transcribed</span>
						</>
					)}
				</div>

				{!feed && <Waveform bars={bars} played={played} />}

				{note ? (
					<p className="text-xs text-fg-3">{note}</p>
				) : (
					<Transcript transcript={transcript} feed={feed} onShow={onShowTranscript} />
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
				// Streamed clips can report an infinite duration; keep 0 (unknown) then.
				onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
			/>
		</article>
	);
}

// Decorative: bar heights come from a hash of the clip path.
function Waveform({ bars, played }: { bars: number[]; played: number }) {
	return (
		<svg viewBox="0 0 240 16" className="block h-4 w-full max-w-60 shrink" aria-hidden="true">
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
	);
}

function Transcript({ transcript, feed, onShow }: { transcript: TranscriptState; feed: boolean; onShow?: () => void }) {
	if (transcript.status === "idle") {
		return (
			<button
				type="button"
				onClick={onShow}
				className="h-[30px] cursor-pointer self-start rounded-md border border-border-subtle px-2.5 text-xs text-fg-2 hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
			>
				Show transcript
			</button>
		);
	}
	if (transcript.status === "loading") return <p className="text-xs text-fg-3">Transcribing…</p>;
	if (transcript.status !== "done") return null;

	return (
		<>
			<p className="text-[13px] leading-normal text-fg-body">{transcript.text}</p>
			{feed && <span className="text-[11px] text-fg-3">Auto-transcribed — may contain mistakes</span>}
		</>
	);
}
