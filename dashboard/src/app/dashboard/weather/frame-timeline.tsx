"use client";

import { useEffect, useState } from "react";
import { utc } from "moment";
import clsx from "clsx";

export type RadarFrame = { id: number; time: number; forecast: boolean };

type Props = {
	frames: RadarFrame[];
	setFrame: (id: number) => void;
};

const clock = (unix: number) =>
	utc(unix * 1000)
		.local()
		.format("HH:mm");

// Radar timeline (SPEC §9): one segment per frame, past solid and forecast dashed, starting on
// the latest past frame ("now"). Play steps through the frames and loops.
export default function FrameTimeline({ frames, setFrame }: Props) {
	const now = Math.max(
		0,
		frames.findLastIndex((f) => !f.forecast),
	);
	const [index, setIndex] = useState(now);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		setFrame(frames[index]?.id ?? 0);
	}, [index, frames, setFrame]);

	useEffect(() => {
		if (!playing) return;
		const id = setInterval(() => setIndex((i) => (i + 1) % frames.length), 600);
		return () => clearInterval(id);
	}, [playing, frames.length]);

	return (
		<div className="flex items-center gap-4 rounded-[10px] border border-border bg-surface-1/95 px-3 py-2.5">
			<button
				type="button"
				onClick={() => setPlaying((p) => !p)}
				aria-label={playing ? "Pause radar" : "Play radar"}
				className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-fg-1 text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-1"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
					{playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4v16l13-8z" />}
				</svg>
			</button>

			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex gap-1">
					{frames.map((f, i) => (
						<button
							key={f.id}
							type="button"
							onClick={() => {
								setPlaying(false);
								setIndex(i);
							}}
							aria-label={`${f.forecast ? "Forecast" : "Radar"} ${clock(f.time)}`}
							aria-pressed={i === index}
							className={clsx(
								"h-2 flex-1 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-fg-1",
								i === index
									? "outline-2 outline-offset-2 outline-fg-1"
									: f.forecast
										? "bg-[repeating-linear-gradient(90deg,var(--color-pit)_0_2px,transparent_2px_4px)]"
										: "bg-border-strong",
								i === index && (f.forecast ? "bg-pit" : "bg-fg-1"),
							)}
						/>
					))}
				</div>
				<div className="flex gap-1 font-mono text-[11px] text-fg-3 tabular-nums">
					{frames.map((f, i) => (
						<span
							key={f.id}
							className={clsx("flex-1 truncate", i === index ? "font-semibold text-fg-1" : f.forecast && "text-pit")}
						>
							{i % 2 === 0 || i === index ? clock(f.time) : ""}
						</span>
					))}
				</div>
			</div>

			<div className="flex shrink-0 flex-col gap-1 text-[11px] text-fg-2">
				<span className="flex items-center gap-1.5">
					<span aria-hidden className="h-1.5 w-3 rounded-sm bg-border-strong" /> Past
				</span>
				<span className="flex items-center gap-1.5">
					<span
						aria-hidden
						className="h-1.5 w-3 rounded-sm bg-[repeating-linear-gradient(90deg,var(--color-pit)_0_2px,transparent_2px_4px)]"
					/>
					Forecast
				</span>
			</div>
		</div>
	);
}
