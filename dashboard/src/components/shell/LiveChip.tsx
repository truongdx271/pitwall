"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useShellStore } from "@/stores/useShellStore";
import { liveChipState, type LiveChipState } from "@/lib/liveChip";

import DelayInput from "@/components/DelayInput";
import DelayTimer from "@/components/DelayTimer";

type Props = {
	connected: boolean;
	hasSession: boolean;
};

const DOT: Record<LiveChipState, string> = {
	live: "bg-personal-best",
	delayed: "bg-pit",
	reconnecting: "bg-flag-sc",
	nosession: "bg-fg-3",
};

const LABEL: Record<LiveChipState, string> = {
	live: "Live",
	delayed: "Delayed",
	reconnecting: "Reconnecting",
	nosession: "No session",
};

// The top-bar connection chip ("● Live · Delay 0s"). Clicking it opens the delay popover.
export default function LiveChip({ connected, hasSession }: Props) {
	const delay = useSettingsStore((s) => s.delay);
	const open = useShellStore((s) => s.delayOpen);
	const setOpen = useShellStore((s) => s.setDelayOpen);
	const ref = useRef<HTMLDivElement>(null);

	const state = liveChipState({ connected, hasSession, delay });

	// Close on outside click and on Escape.
	useEffect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	}, [open, setOpen]);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				aria-expanded={open}
				aria-haspopup="dialog"
				onClick={() => setOpen(!open)}
				className={clsx(
					"flex h-9 cursor-pointer items-center gap-2 rounded-control border border-border-subtle bg-surface-1 px-3 text-[13px] focus-visible:outline-2 focus-visible:outline-fg-1",
					state === "nosession" ? "text-fg-2" : "text-fg-1",
				)}
			>
				<span aria-hidden className={clsx("size-2 rounded-full", DOT[state])} />
				<span className="font-semibold">{LABEL[state]}</span>
				{state !== "reconnecting" && state !== "nosession" && (
					<>
						<span className="text-fg-3">·</span>
						<span className="text-fg-2">
							Delay <span className="font-mono tabular-nums">{delay}s</span>
						</span>
					</>
				)}
			</button>

			{open && <DelayPopover />}
		</div>
	);
}

function DelayPopover() {
	const delay = useSettingsStore((s) => s.delay);
	const setDelay = useSettingsStore((s) => s.setDelay);
	const paused = useSettingsStore((s) => s.delayIsPaused);

	const nudge = (by: number) => setDelay(Math.max(0, delay + by));

	return (
		<div
			role="dialog"
			aria-label="Broadcast delay"
			className="absolute top-11 right-0 z-50 flex w-80 flex-col gap-3.5 rounded-panel border border-border bg-surface-1 p-5 shadow-xl"
		>
			<span className="text-[15px] font-semibold">Broadcast delay</span>

			<div className="flex items-center gap-2.5">
				<DelayTimer />
				<DelayInput saveDelay={500} className="h-11 flex-1 text-lg" />
				<span className="text-[13px] text-fg-2">seconds</span>
			</div>

			<div className="flex flex-wrap gap-1.5">
				<QuickButton onClick={() => setDelay(0)} disabled={paused}>
					Live · 0 s
				</QuickButton>
				<QuickButton mono onClick={() => nudge(-5)} disabled={paused}>
					−5
				</QuickButton>
				<QuickButton mono onClick={() => nudge(5)} disabled={paused}>
					+5
				</QuickButton>
			</div>

			<p className="text-xs leading-normal text-fg-2">
				Tip: watch the lap counter on TV tick over, then nudge until Pitwall changes at the same moment.
			</p>
		</div>
	);
}

type QuickButtonProps = {
	children: string;
	onClick: () => void;
	disabled?: boolean;
	mono?: boolean;
};

function QuickButton({ children, onClick, disabled, mono }: QuickButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={clsx(
				"h-8 cursor-pointer rounded-control border border-border-subtle px-3 text-xs text-fg-2 transition-colors hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-1 disabled:cursor-not-allowed disabled:opacity-50",
				mono && "font-mono",
			)}
		>
			{children}
		</button>
	);
}
