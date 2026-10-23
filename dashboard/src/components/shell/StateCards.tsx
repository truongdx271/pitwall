"use client";

import { useEffect, useState, type RefObject } from "react";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useShellStore } from "@/stores/useShellStore";

import Icon from "./icons";

type SyncingProps = {
	/** Seconds of data the buffers hold. */
	buffered: number;
	/** The delay the viewer asked for, in seconds. */
	delay: number;
};

// Replaces the old "Syncing..." wall (States.png).
export function SyncingCard({ buffered, delay }: SyncingProps) {
	const setDelay = useSettingsStore((s) => s.setDelay);
	const setDelayOpen = useShellStore((s) => s.setDelayOpen);
	const pct = delay > 0 ? Math.min(100, (buffered / delay) * 100) : 100;

	return (
		<div className="flex flex-1 items-center justify-center p-4">
			<div
				role="status"
				className="flex w-full max-w-md flex-col gap-3.5 rounded-panel border border-border bg-surface-1 p-5"
			>
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-[10px] bg-surface-2 text-fg-1">
						<Icon name="refresh" size={20} />
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-[15px] font-semibold">Syncing to your delay</span>
						<span className="text-xs text-fg-2">Buffering so timing matches your TV</span>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<div
						className="h-1.5 rounded-full bg-surface-3"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={delay}
						aria-valuenow={Math.floor(buffered)}
					>
						<div className="h-1.5 rounded-full bg-fg-1" style={{ width: `${pct}%` }} />
					</div>
					<div className="flex justify-between font-mono text-xs text-fg-2 tabular-nums">
						<span>{Math.floor(buffered)} s buffered</span>
						<span>of {delay} s</span>
					</div>
				</div>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setDelay(0)}
						className="h-9 cursor-pointer rounded-control bg-fg-1 px-3.5 text-[13px] font-semibold text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-1"
					>
						Go live instead
					</button>
					<button
						type="button"
						onClick={() => setDelayOpen(true)}
						className="h-9 cursor-pointer rounded-control border border-border-strong px-3.5 text-[13px] font-medium text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
					>
						Change delay
					</button>
				</div>
			</div>
		</div>
	);
}

type ReconnectingProps = {
	lastMessageAt: RefObject<number | null>;
	retry: () => void;
};

// Shown while the live socket is down but we still have older data on screen.
export function ReconnectingCard({ lastMessageAt, retry }: ReconnectingProps) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	const last = lastMessageAt.current;
	const ago = last ? Math.max(0, Math.round((now - last) / 1000)) : null;

	return (
		<div
			role="alert"
			className="mx-3 mt-3 flex items-center gap-3 rounded-[10px] border border-flag-sc/40 bg-flag-sc/10 px-3.5 py-3"
		>
			<span aria-hidden className="size-2 rounded-full bg-flag-sc" />
			<div className="flex flex-1 flex-col gap-0.5">
				<span className="text-[13px] font-semibold text-flag-sc">Reconnecting…</span>
				{ago != null && <span className="text-xs text-fg-2">Showing data from {ago} s ago</span>}
			</div>
			<button
				type="button"
				onClick={retry}
				className="h-8 cursor-pointer rounded-control border border-border-strong px-3 text-xs text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1"
			>
				Retry now
			</button>
		</div>
	);
}
