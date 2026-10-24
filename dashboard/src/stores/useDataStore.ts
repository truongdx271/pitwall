import { create } from "zustand";

import type { CarsData, Positions, State } from "@/types/state.type";

import { teamColours } from "@/lib/color";
import { timingAppStints } from "@/lib/stintFolding";
import { previousBestSectors, type BestSectors } from "@/lib/pushLap";

// main store

export type DataStore = {
	state: State | null;
	carsData: CarsData | null;
	positions: Positions | null;
	/** Per driver, the best sectors before their latest improvement (see previousBestSectors). */
	previousBests: BestSectors;

	setState: (state: Partial<State> | null) => void;
	setCarsData: (carsData: CarsData | null) => void;
	setPositions: (positions: Positions | null) => void;
};

export const useDataStore = create<DataStore>((set) => ({
	state: null,
	carsData: null,
	positions: null,
	previousBests: {},

	setState: (partialState: Partial<State> | null) =>
		set((prev) => {
			if (partialState?.DriverList)
				partialState = { ...partialState, DriverList: teamColours(partialState.DriverList) };
			if (partialState?.TimingAppData)
				partialState = { ...partialState, TimingAppData: timingAppStints(partialState.TimingAppData) };
			const previousBests = partialState
				? previousBestSectors(prev.state?.TimingStats, partialState.TimingStats, prev.previousBests)
				: {};
			return {
				previousBests,
				state: partialState
					? {
							...(prev.state ?? {}),
							// eslint-disable-next-line @typescript-eslint/no-unused-vars
							...Object.fromEntries(Object.entries(partialState).filter(([_, v]) => v !== undefined)),
						}
					: null,
			};
		}),
	setCarsData: (carsData: CarsData | null) => set({ carsData }),
	setPositions: (positions: Positions | null) => set({ positions }),
}));
