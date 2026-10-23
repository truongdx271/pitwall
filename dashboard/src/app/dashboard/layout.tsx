"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { useDataEngine } from "@/hooks/useDataEngine";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useStores } from "@/hooks/useStores";
import { useSocket } from "@/hooks/useSocket";
import { useReplaySocket } from "@/hooks/useReplaySocket";
import { useHistoryEngine } from "@/hooks/useHistoryEngine";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDataStore } from "@/stores/useDataStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useReplayStore } from "@/stores/useReplayStore";

import { latestSessionStatus } from "@/lib/trackStatus";

import ReplayOverlay from "@/components/dev/ReplayOverlay";
import TopBar from "@/components/shell/TopBar";
import SessionStrip from "@/components/shell/SessionStrip";
import TrackStatusBanner from "@/components/shell/TrackStatusBanner";
import { ReconnectingCard, SyncingCard } from "@/components/shell/StateCards";

type Props = {
	children: ReactNode;
};

export default function DashboardLayout({ children }: Props) {
	const stores = useStores();
	const { handleInitial, handleUpdate, maxDelay } = useDataEngine(stores);

	// Dev replay: when a recorded session is selected, swap the live SSE for the
	// /api/dev/replay stream. Only one of the two is ever connected.
	const replayMode = useReplayStore((state) => state.mode);
	const replaySessionId = useReplayStore((state) => state.sessionId);
	const replayEpoch = useReplayStore((state) => state.epoch);
	const replayActive = replayMode === "replay" && !!replaySessionId;

	const live = useSocket({ handleInitial, handleUpdate }, { enabled: !replayActive });
	const dev = useReplaySocket({ handleInitial, handleUpdate }, { enabled: replayActive });
	const connected = replayActive ? dev.connected : live.connected;

	useHistoryEngine();

	// Clear accumulated state whenever the data source changes (live <-> replay,
	// session switch, restart) so nothing leaks between sessions.
	useEffect(() => {
		useDataStore.getState().setState(null);
		useDataStore.getState().setCarsData(null);
		useDataStore.getState().setPositions(null);
		useHistoryStore.getState().reset();
	}, [replayActive, replaySessionId, replayEpoch]);

	// The delay buffer shows a "Syncing..." wall while it fills; force it off during
	// replay and restore the user's value afterwards.
	const prevDelayRef = useRef<number | null>(null);
	useEffect(() => {
		const settings = useSettingsStore.getState();
		if (replayActive) {
			if (prevDelayRef.current === null && settings.delay > 0) {
				prevDelayRef.current = settings.delay;
				settings.setDelay(0);
			}
		} else if (prevDelayRef.current !== null) {
			settings.setDelay(prevDelayRef.current);
			prevDelayRef.current = null;
		}
	}, [replayActive]);

	const delay = useSettingsStore((state) => state.delay);
	const syncing = delay > maxDelay;

	useWakeLock();

	const ended = useDataStore(
		({ state }) => latestSessionStatus(state?.SessionData?.StatusSeries, state?.SessionStatus?.Status) === "Ends",
	);

	// Live socket down with data on screen: say how stale it is. Replay has no retry.
	const reconnecting = !replayActive && !live.connected && live.lastMessageAt.current != null;

	return (
		<div className="flex h-screen w-full flex-col">
			<ReplayOverlay />
			<TopBar connected={connected} />

			{syncing && !ended ? (
				<SyncingCard buffered={maxDelay} delay={delay} />
			) : (
				<>
					<SessionStrip />
					<TrackStatusBanner />
					{reconnecting && <ReconnectingCard lastMessageAt={live.lastMessageAt} retry={live.retry} />}
					<div className="no-scrollbar w-full flex-1 overflow-auto">{children}</div>
				</>
			)}
		</div>
	);
}
