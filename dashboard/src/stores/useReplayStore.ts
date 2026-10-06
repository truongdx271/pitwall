import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Dev-only: controls the recorded-session replay (see components/dev/ReplayOverlay.tsx
// and app/api/dev/replay/route.server.ts). Only `mode`, `sessionId` and `speed` are persisted;
// everything else is runtime state.

export type ReplayMode = "live" | "replay";
export type ReplaySpeed = 1 | 2 | 5 | 10 | "max";

export const REPLAY_SPEEDS: ReplaySpeed[] = [1, 2, 5, 10, "max"];

type ReplayStore = {
	mode: ReplayMode;
	sessionId: string | null;
	speed: ReplaySpeed;

	playing: boolean;
	epoch: number;
	elapsedMs: number;
	durationMs: number | null;
	connected: boolean;

	setMode: (mode: ReplayMode) => void;
	setSession: (sessionId: string | null) => void;
	setSpeed: (speed: ReplaySpeed) => void;
	play: () => void;
	pause: () => void;
	restart: () => void;
	setClock: (elapsedMs: number) => void;
	setDuration: (durationMs: number | null) => void;
	setConnected: (connected: boolean) => void;
};

export const useReplayStore = create<ReplayStore>()(
	persist(
		(set) => ({
			mode: "live",
			sessionId: null,
			speed: 5,

			playing: true,
			epoch: 0,
			elapsedMs: 0,
			durationMs: null,
			connected: false,

			setMode: (mode) =>
				set((s) => ({
					mode,
					// entering replay: restart from the top of the current session
					epoch: mode === "replay" ? s.epoch + 1 : s.epoch,
					elapsedMs: mode === "replay" ? 0 : s.elapsedMs,
					playing: true,
				})),

			setSession: (sessionId) =>
				set((s) => ({
					sessionId,
					epoch: s.epoch + 1,
					elapsedMs: 0,
					durationMs: null,
					playing: true,
				})),

			setSpeed: (speed) => set({ speed }),

			play: () => set({ playing: true }),
			pause: () => set({ playing: false }),

			restart: () => set((s) => ({ epoch: s.epoch + 1, elapsedMs: 0, playing: true })),

			setClock: (elapsedMs) => set({ elapsedMs }),
			setDuration: (durationMs) => set({ durationMs }),
			setConnected: (connected) => set({ connected }),
		}),
		{
			name: "replay-storage",
			storage: createJSONStorage(() => localStorage),
			partialize: (s) => ({ mode: s.mode, sessionId: s.sessionId, speed: s.speed }),
		},
	),
);
