"use client";

import clsx from "clsx";

import { useState, useRef, useEffect } from "react";

import { useSettingsStore } from "@/stores/useSettingsStore";

type Props = {
	className?: string;
	saveDelay?: number;
};

export default function DelayInput({ className, saveDelay }: Props) {
	const currentDelay = useSettingsStore((s) => s.delay);
	const setDelay = useSettingsStore((s) => s.setDelay);
	const isPaused = useSettingsStore((s) => s.delayIsPaused);

	const [delayState, setDelayState] = useState<string>(currentDelay.toString());

	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Keep the input synced with the store without an effect (React's "adjust state
	// during render" pattern): while paused the input tracks the store live; on the
	// pause<->run transition it snaps to the current value.
	const [prev, setPrev] = useState({ isPaused, currentDelay });
	if (prev.isPaused !== isPaused || prev.currentDelay !== currentDelay) {
		const pausedChanged = prev.isPaused !== isPaused;
		setPrev({ isPaused, currentDelay });
		if (pausedChanged ? !isPaused : isPaused) {
			setDelayState(currentDelay.toString());
		}
	}

	const updateDelay = (updateInput: boolean = false) => {
		const delay = delayState ? Math.max(parseInt(delayState), 0) : 0;
		setDelay(delay);
		if (updateInput) setDelayState(delay.toString());
	};

	useEffect(() => {
		if (isPaused) return;
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(updateDelay, saveDelay || 0);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [delayState]);

	const handleChange = (v: string) => {
		setDelayState(v);
	};

	return (
		<input
			className={clsx(
				"w-12 [appearance:textfield] rounded-control border border-border-subtle bg-bg p-1 text-center font-mono text-fg-1 tabular-nums focus:border-border-strong focus:outline-none disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
				className,
			)}
			type="number"
			inputMode="numeric"
			min={0}
			placeholder="0s"
			value={delayState}
			onChange={(e) => handleChange(e.target.value)}
			onKeyDown={(e) => e.code == "Enter" && updateDelay(true)}
			onBlur={() => updateDelay(true)}
			disabled={isPaused}
		/>
	);
}
