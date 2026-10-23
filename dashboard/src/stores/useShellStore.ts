import { create } from "zustand";

// UI state shared across the app shell: the delay popover can be opened from the
// Live chip and from the Syncing card.
type ShellStore = {
	delayOpen: boolean;
	setDelayOpen: (delayOpen: boolean) => void;
};

export const useShellStore = create<ShellStore>()((set) => ({
	delayOpen: false,
	setDelayOpen: (delayOpen) => set({ delayOpen }),
}));
