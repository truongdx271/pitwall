"use client";

import { useEffect, useRef, useState } from "react";

import type { CarData, CarsData, Position, Positions, State } from "@/types/state.type";
import type { MessageInitial, MessageUpdate } from "@/types/message.type";

import { inflateSafe } from "@/lib/inflate";
import { utcToLocalMs } from "@/lib/utcToLocalMs";
import { isNewSession } from "@/lib/sessionGuard";

import { useSettingsStore } from "@/stores/useSettingsStore";

import { useBuffer } from "@/hooks/useBuffer";
import { useStatefulBuffer } from "@/hooks/useStatefulBuffer";

const UPDATE_MS = 200;

type Props = {
	updateState: (state: State) => void;
	updatePosition: (pos: Positions) => void;
	updateCarData: (car: CarsData) => void;
};

type Options = {
	/**
	 * Called when the feed moves to another session, after the buffers are cleared. `via`
	 * says whether a fresh initial state came with it or only an update (then the caller
	 * should reconnect to get the new session's full state).
	 */
	onSessionChange?: (via: "initial" | "update") => void;
};

export const useDataEngine = (
	{ updateState, updatePosition, updateCarData }: Props,
	{ onSessionChange }: Options = {},
) => {
	const buffers = {
		ExtrapolatedClock: useStatefulBuffer(),
		TopThree: useStatefulBuffer(),
		TimingStats: useStatefulBuffer(),
		TimingAppData: useStatefulBuffer(),
		WeatherData: useStatefulBuffer(),
		TrackStatus: useStatefulBuffer(),
		SessionStatus: useStatefulBuffer(),
		DriverList: useStatefulBuffer(),
		RaceControlMessages: useStatefulBuffer(),
		SessionInfo: useStatefulBuffer(),
		SessionData: useStatefulBuffer(),
		LapCount: useStatefulBuffer(),
		TimingData: useStatefulBuffer(),
		TeamRadio: useStatefulBuffer(),
		ChampionshipPrediction: useStatefulBuffer(),
	};

	const carBuffer = useBuffer<CarsData>();
	const posBuffer = useBuffer<Positions>();

	const [maxDelay, setMaxDelay] = useState<number>(0);

	const delayRef = useRef<number>(0);

	useEffect(() => {
		delayRef.current = useSettingsStore.getState().delay;
		return useSettingsStore.subscribe(
			(state) => state.delay,
			(delay) => (delayRef.current = delay),
		);
	}, []);

	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	// Path of the session the buffers hold; a different one means start over.
	const sessionPathRef = useRef<string | null>(null);

	const resetAll = () => {
		Object.values(buffers).forEach((buffer) => buffer.reset());
		carBuffer.clear();
		posBuffer.clear();
	};

	const trackSession = (path: string | undefined, via: "initial" | "update") => {
		if (isNewSession(sessionPathRef.current, path)) {
			resetAll();
			onSessionChange?.(via);
		}
		if (path) sessionPathRef.current = path;
	};

	const handleInitial = ({ CarDataZ: carZ, PositionZ: posZ, ...initial }: MessageInitial) => {
		trackSession(initial.SessionInfo?.Path, "initial");
		updateState(initial);

		Object.keys(buffers).forEach((key) => {
			const data = initial[key as keyof typeof initial];
			const buffer = buffers[key as keyof typeof buffers];
			if (data) buffer.push(data);
		});

		const carData = carZ ? inflateSafe<CarData>(carZ) : null;
		if (carData?.Entries?.length) {
			updateCarData(carData.Entries[0].Cars);
			for (const entry of carData.Entries) carBuffer.pushTimed(entry.Cars, utcToLocalMs(entry.Utc));
		}

		const position = posZ ? inflateSafe<Position>(posZ) : null;
		if (position?.Position?.length) {
			updatePosition(position.Position[0].Entries);
			for (const entry of position.Position) posBuffer.pushTimed(entry.Entries, utcToLocalMs(entry.Timestamp));
		}
	};

	const handleUpdate = ({ CarDataZ: carZ, PositionZ: posZ, ...update }: MessageUpdate) => {
		trackSession(update.SessionInfo?.Path, "update");
		Object.keys(buffers).forEach((key) => {
			const data = update[key as keyof typeof update];
			const buffer = buffers[key as keyof typeof buffers];
			if (data) buffer.push(data);
		});

		const carData = carZ ? inflateSafe<CarData>(carZ) : null;
		if (carData?.Entries?.length) {
			for (const entry of carData.Entries) carBuffer.pushTimed(entry.Cars, utcToLocalMs(entry.Utc));
		}

		const position = posZ ? inflateSafe<Position>(posZ) : null;
		if (position?.Position?.length) {
			for (const entry of position.Position) posBuffer.pushTimed(entry.Entries, utcToLocalMs(entry.Timestamp));
		}
	};

	const handleCurrentState = () => {
		const delay = delayRef.current;

		if (delay === 0) {
			const newStateFrame: Record<string, State[keyof State]> = {};

			Object.keys(buffers).forEach((key) => {
				const buffer = buffers[key as keyof typeof buffers];
				const latest = buffer.latest() as State[keyof State];
				if (latest) newStateFrame[key] = latest;
			});

			updateState(newStateFrame);

			const carFrame = carBuffer.latest();
			if (carFrame) updateCarData(carFrame);

			const posFrame = posBuffer.latest();
			if (posFrame) updatePosition(posFrame);
		} else {
			const delayedTimestamp = Date.now() - delay * 1000;
			const newStateFrame: Record<string, State[keyof State]> = {};

			Object.keys(buffers).forEach((key) => {
				const buffer = buffers[key as keyof typeof buffers];
				const delayed = buffer.delayed(delayedTimestamp) as State[keyof State];

				if (delayed) newStateFrame[key] = delayed;

				setTimeout(() => buffer.cleanup(delayedTimestamp), 0);
			});

			updateState(newStateFrame);

			const carFrame = carBuffer.delayed(delayedTimestamp);
			if (carFrame) {
				updateCarData(carFrame);
				setTimeout(() => carBuffer.cleanup(delayedTimestamp), 0);
			}

			const posFrame = posBuffer.delayed(delayedTimestamp);
			if (posFrame) {
				updatePosition(posFrame);
				setTimeout(() => posBuffer.cleanup(delayedTimestamp), 0);
			}
		}

		const maxDelay = Math.min(
			...Object.values(buffers)
				.map((buffer) => buffer.maxDelay())
				.filter((delay) => delay > 0),
			// carBuffer.maxDelay(),
			// posBuffer.maxDelay(),
		);

		setMaxDelay(maxDelay);
	};

	useEffect(() => {
		intervalRef.current = setInterval(handleCurrentState, UPDATE_MS);
		return () => (intervalRef.current ? clearInterval(intervalRef.current) : void 0);
		// TODO investigate if this might have performance issues
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return {
		handleUpdate,
		handleInitial,
		maxDelay,
	};
};
