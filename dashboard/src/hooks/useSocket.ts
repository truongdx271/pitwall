import { useCallback, useEffect, useRef, useState } from "react";

import type { MessageInitial, MessageUpdate } from "@/types/message.type";

import { env } from "@/env";
import { parseMessage } from "@/lib/parseMessage";

type Props = {
	handleInitial: (data: MessageInitial) => void;
	handleUpdate: (data: MessageUpdate) => void;
};

type Options = {
	// when false the socket stays closed (used by the dev replay mode to avoid a
	// second connection fighting over the same handlers)
	enabled?: boolean;
};

export const useSocket = ({ handleInitial, handleUpdate }: Props, { enabled = true }: Options = {}) => {
	const [connected, setConnected] = useState<boolean>(false);
	// Bumped by retry() to tear the EventSource down and open a fresh one.
	const [attempt, setAttempt] = useState(0);
	// When the last message arrived (ms epoch); read by the Reconnecting card.
	const lastMessageAt = useRef<number | null>(null);

	const handlersRef = useRef({ handleInitial, handleUpdate });
	useEffect(() => {
		handlersRef.current = { handleInitial, handleUpdate };
	});

	useEffect(() => {
		if (!enabled) return;

		const sse = new EventSource(`${env.NEXT_PUBLIC_LIVE_URL}/api/realtime`);

		sse.onerror = () => setConnected(false);
		sse.onopen = () => setConnected(true);

		sse.addEventListener("initial", (message) => {
			lastMessageAt.current = Date.now();
			handlersRef.current.handleInitial(parseMessage(message.data));
		});

		sse.addEventListener("update", (message) => {
			lastMessageAt.current = Date.now();
			handlersRef.current.handleUpdate(parseMessage(message.data));
		});

		return () => sse.close();
	}, [enabled, attempt]);

	const retry = useCallback(() => setAttempt((n) => n + 1), []);

	return { connected: enabled ? connected : false, lastMessageAt, retry };
};
