import { useEffect, useRef } from "react";

import type { Message } from "@/types/state.type";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Plays the chime when a new race control message arrives (raceControlChime setting).
// The first batch only seeds the list, so loading a session doesn't ring.
export function useRaceControlChime(messages: Message[] | undefined) {
	const raceControlChime = useSettingsStore((state) => state.raceControlChime);
	const raceControlChimeVolume = useSettingsStore((state) => state.raceControlChimeVolume);

	const chimeRef = useRef<HTMLAudioElement | null>(null);
	const pastMessageTimestamps = useRef<string[] | null>(null);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const chime = new Audio("/sounds/chime.mp3");
			chime.volume = raceControlChimeVolume / 100;
			chimeRef.current = chime;
			return () => {
				chimeRef.current = null;
			};
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (messages === undefined || messages === null) return;
		if (!pastMessageTimestamps.current) {
			pastMessageTimestamps.current = messages.map((msg) => msg.Utc);
			return;
		}
		const newMessages = messages.filter((msg) => !pastMessageTimestamps.current?.includes(msg.Utc));
		if (newMessages.length > 0 && raceControlChime) {
			chimeRef.current?.play();
		}
		pastMessageTimestamps.current = messages.map((msg) => msg.Utc);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages]);
}
