"use client";

import { useEffect, useRef } from "react";

import { useDataStore } from "@/stores/useDataStore";
import type { DataStore } from "@/stores/useDataStore";
import { useHistoryStore, parseTimeMs } from "@/stores/useHistoryStore";

export const useHistoryEngine = () => {
	const bootstrappedRef = useRef(false);
	const prevLapsRef = useRef<Record<string, number>>({});
	const prevLapRef = useRef<number>(0);

	useEffect(() => {
		const processState = (state: DataStore) => {
			// A cleared store (new data source or new session) means a new lap history: forget
			// what the previous session recorded, or its lap counts would hide the new laps.
			if (!state.state) {
				bootstrappedRef.current = false;
				prevLapsRef.current = {};
				prevLapRef.current = 0;
				return;
			}

			// Bootstrap from server-side LapHistory on first load
			if (!bootstrappedRef.current && state.state?.LapHistory) {
				const history = state.state.LapHistory;
				for (const [nr, entries] of Object.entries(history)) {
					for (const entry of entries) {
						useHistoryStore.getState().recordLapTime(nr, entry.lap, {
							time: entry.time,
							ms: parseTimeMs(entry.time),
							overallFastest: entry.overallFastest,
							personalFastest: entry.personalFastest,
						});
					}
					// Track the highest lap seen so we don't re-record it
					const maxLap = Math.max(...entries.map((e) => e.lap), 0);
					if (maxLap > 0) prevLapsRef.current[nr] = maxLap;
				}
				bootstrappedRef.current = true;
			}

			const timing = state.state?.TimingData?.Lines;
			const currentLap = state.state?.LapCount?.CurrentLap ?? 0;

			if (!timing) return;

			// Record new lap times as they arrive
			for (const [nr, driver] of Object.entries(timing)) {
				const driverLaps = driver.NumberOfLaps ?? 0;
				const prevLaps = prevLapsRef.current[nr] ?? 0;

				if (driverLaps > prevLaps && driverLaps > 0) {
					const time = driver.LastLapTime?.Value;
					if (time && time !== "" && !time.includes("LAP")) {
						useHistoryStore.getState().recordLapTime(nr, driverLaps, {
							time,
							ms: parseTimeMs(time),
							overallFastest: driver.LastLapTime?.OverallFastest ?? false,
							personalFastest: driver.LastLapTime?.PersonalFastest ?? false,
						});
					}
					prevLapsRef.current[nr] = driverLaps;
				}
			}

			// Snapshot positions when the lap counter advances
			if (currentLap > prevLapRef.current && currentLap > 0) {
				const posMap: Record<string, number> = {};
				for (const [nr, driver] of Object.entries(timing)) {
					const pos = parseInt(driver.Position ?? "0");
					if (pos > 0) posMap[nr] = pos;
				}
				if (Object.keys(posMap).length > 0) {
					useHistoryStore.getState().recordPositions(currentLap, posMap);
				}
				prevLapRef.current = currentLap;
			}
		};

		// Run immediately in case the initial SSE state arrived before this effect ran
		processState(useDataStore.getState());

		const unsubscribe = useDataStore.subscribe(processState);

		return unsubscribe;
	}, []);
};
