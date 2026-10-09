import { create } from "zustand";

import type { CarsData, Positions, State } from "@/types/state.type";

import { teamColours } from "@/lib/color";

// main store

export type DataStore = {
	state: State | null;
	carsData: CarsData | null;
	positions: Positions | null;

	setState: (state: Partial<State> | null) => void;
	setCarsData: (carsData: CarsData | null) => void;
	setPositions: (positions: Positions | null) => void;
};

export const useDataStore = create<DataStore>((set) => ({
	state: null,
	carsData: null,
	positions: null,

	setState: (partialState: Partial<State> | null) =>
		set((prev) => {
			if (partialState?.DriverList)
				partialState = { ...partialState, DriverList: teamColours(partialState.DriverList) };
			return {
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
