"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useDataEngine } from "@/hooks/useDataEngine";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useStores } from "@/hooks/useStores";
import { useSocket } from "@/hooks/useSocket";
import { useReplaySocket } from "@/hooks/useReplaySocket";
import { useHistoryEngine } from "@/hooks/useHistoryEngine";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useDataStore } from "@/stores/useDataStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useReplayStore } from "@/stores/useReplayStore";

import ReplayOverlay from "@/components/dev/ReplayOverlay";
import Sidebar from "@/components/Sidebar";
import SidenavButton from "@/components/SidenavButton";
import SessionInfo from "@/components/SessionInfo";
import WeatherInfo from "@/components/WeatherInfo";
import TrackInfo from "@/components/TrackInfo";
import DelayInput from "@/components/DelayInput";
import DelayTimer from "@/components/DelayTimer";
import ConnectionStatus from "@/components/ConnectionStatus";

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

	const ended = useDataStore(({ state }) => state?.SessionStatus?.Status === "Ends");

	return (
		<div className="flex h-screen w-full">
			<ReplayOverlay />
			<Sidebar key="sidebar" connected={connected} />

			{/* App content frame: a fixed max width, left-aligned, so dense views fill it
			   and sparse ones don't sprawl across an ultrawide monitor. */}
			<motion.div layout="size" className="flex h-full w-full max-w-[1600px] flex-1 flex-col gap-0">
				<DesktopStaticBar show={!syncing || ended} />
				<MobileStaticBar show={!syncing || ended} connected={connected} />

				<div className={!syncing || ended ? "no-scrollbar w-full flex-1 overflow-auto" : "hidden"}>
					<MobileDynamicBar />
					{children}
				</div>

				<div className={syncing && !ended ? "flex h-full flex-1 flex-col items-center justify-center gap-2" : "hidden"}>
					<h1 className="my-20 text-center text-5xl font-bold">Syncing...</h1>
					<p>Please wait for {delay - maxDelay} seconds.</p>
					<p>Or make your delay smaller.</p>
				</div>
			</motion.div>
		</div>
	);
}

function MobileDynamicBar() {
	return (
		<div className="flex flex-col divide-y divide-zinc-800 border-b border-zinc-800 md:hidden">
			<div className="p-2">
				<SessionInfo />
			</div>
			<div className="p-2">
				<WeatherInfo />
			</div>
		</div>
	);
}

function MobileStaticBar({ show, connected }: { show: boolean; connected: boolean }) {
	const open = useSidebarStore((state) => state.open);

	return (
		<div className="flex w-full items-center justify-between overflow-hidden border-b border-zinc-800 bg-black px-2 py-1 font-mono text-sm md:hidden">
			<div className="flex items-center gap-[1.5ch]">
				<SidenavButton key="mobile" onClick={() => open()} />
				<ConnectionStatus connected={connected} />
				<DelayInput saveDelay={500} />
				<DelayTimer />
			</div>

			{show && <TrackInfo />}
		</div>
	);
}

function DesktopStaticBar({ show }: { show: boolean }) {
	const pinned = useSidebarStore((state) => state.pinned);
	const pin = useSidebarStore((state) => state.pin);

	return (
		<div className="hidden w-full items-center justify-between overflow-hidden border-b border-zinc-800 bg-black px-2 py-1 md:flex">
			<div className="flex items-center gap-[1.5ch] font-mono text-sm">
				<AnimatePresence>
					{!pinned && <SidenavButton key="desktop" className="shrink-0" onClick={() => pin()} />}
				</AnimatePresence>

				<motion.div key="session-info" layout="position">
					<SessionInfo />
				</motion.div>
			</div>

			<div className="flex items-center gap-[2ch] font-mono text-sm">
				{show && (
					<>
						<span className="text-zinc-700">│</span>
						<WeatherInfo />
						<span className="text-zinc-700">│</span>
						<TrackInfo />
					</>
				)}
			</div>
		</div>
	);
}
