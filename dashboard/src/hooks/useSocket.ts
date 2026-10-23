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
	// True once this connection has delivered data; the Reconnecting card needs stale data to show.
	const [hasData, setHasData] = useState(false);
	// When the last message arrived (ms epoch); read by the Reconnecting card's timer.
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

		const received = () => {
			if (lastMessageAt.current == null) setHasData(true);
			lastMessageAt.current = Date.now();
		};

		sse.addEventListener("initial", (message) => {
			received();
			handlersRef.current.handleInitial(parseMessage(message.data));
		});

		sse.addEventListener("update", (message) => {
			received();
			handlersRef.current.handleUpdate(parseMessage(message.data));
		});

		return () => {
			sse.close();
			setConnected(false);
		};
	}, [enabled, attempt]);

	// Switching the source (live <-> replay) clears the screen, so forget the old data.
	// A retry keeps it: the stale data is still showing.
	useEffect(() => {
		if (!enabled) return;
		return () => {
			lastMessageAt.current = null;
			setHasData(false);
		};
	}, [enabled]);

	const retry = useCallback(() => setAttempt((n) => n + 1), []);

	return { connected: enabled ? connected : false, hasData: enabled && hasData, lastMessageAt, retry };
};
