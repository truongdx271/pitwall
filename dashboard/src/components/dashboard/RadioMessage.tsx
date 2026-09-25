"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { utc } from "moment";
import clsx from "clsx";

import type { Driver, RadioCapture } from "@/types/state.type";
import { useSettingsStore } from "@/stores/useSettingsStore";

import DriverTag from "@/components/driver/DriverTag";

type Props = {
	driver: Driver;
	capture: RadioCapture;
	basePath: string;
};

const BAR_LEN = 20;

const fmtClock = (s: number) => {
	if (!isFinite(s) || s < 0) return "0:00";
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function RadioMessage({ driver, capture, basePath }: Props) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const rafRef = useRef<number | null>(null);

	const [playing, setPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [progress, setProgress] = useState(0);
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

	const onEnded = () => {
		setPlaying(false);
		setProgress(0);
		stopTick();
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

	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(driver.RacingNumber));
	const localTime = utc(capture.Utc).local().format("HH:mm:ss");

	const pct = duration > 0 ? Math.min(1, progress / duration) : 0;
	const barFilled = Math.round(pct * BAR_LEN);

	return (
		<motion.li
			animate={{ opacity: 1 }}
			initial={{ opacity: 0 }}
			className={clsx("flex items-center gap-[1ch] border-b border-zinc-900 px-2 py-1 font-mono text-sm", {
				"bg-sky-950/40": favoriteDriver,
				"opacity-40": failed,
			})}
		>
			<time className="shrink-0 text-[11px] text-zinc-600 tabular-nums">{localTime}</time>
			<DriverTag teamColor={driver.TeamColour} short={driver.Tla} />

			<button
				onClick={togglePlayback}
				disabled={failed}
				className={clsx("shrink-0 transition-colors", {
					"cursor-not-allowed text-zinc-700": failed,
					"text-zinc-400 hover:text-zinc-100": !failed,
				})}
				aria-label={failed ? "Radio unavailable" : playing ? "Pause" : "Play"}
			>
				{failed ? "×" : playing ? "■" : "▶"}
			</button>

			{failed ? (
				<span className="text-[11px] text-zinc-700 select-none">radio no disponible</span>
			) : (
				<>
					<span className="text-[11px] text-zinc-600 tabular-nums select-none">
						<span className="text-sky-400">{"█".repeat(barFilled)}</span>
						{"░".repeat(BAR_LEN - barFilled)}
					</span>
					<span className="shrink-0 text-[11px] text-zinc-700 tabular-nums">
						{playing || progress > 0 ? `${fmtClock(progress)} / ` : ""}
						{duration > 0 ? fmtClock(duration) : "--:--"}
					</span>
				</>
			)}

			<audio
				preload="metadata"
				src={`${basePath}${capture.Path}`}
				ref={audioRef}
				onEnded={onEnded}
				onError={() => setFailed(true)}
				onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
			/>
		</motion.li>
	);
}
