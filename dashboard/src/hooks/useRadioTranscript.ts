import { useEffect, useState } from "react";

import { env } from "@/env";
import { retryDelayMs, transcriptUrl } from "@/lib/radioTranscript";

export type TranscriptState = { status: "loading" } | { status: "done"; text: string } | { status: "unavailable" };

// Survives remounts (tab switches, list reshuffles) so a clip is fetched once per page load.
const transcripts = new Map<string, string>();

export function useRadioTranscript(sessionPath: string | undefined, clipPath: string): TranscriptState {
	const key = sessionPath ? sessionPath + clipPath : null;

	// Only a final "unavailable" needs state; "done" lives in the module cache and
	// everything else is "loading". setState only runs in async callbacks, which
	// keeps react-hooks/set-state-in-effect happy.
	const [failedKey, setFailedKey] = useState<string | null>(null);
	const [, setVersion] = useState(0);

	useEffect(() => {
		if (!key || !sessionPath || transcripts.has(key)) return;

		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout> | undefined;

		const attempt = async (n: number) => {
			try {
				const res = await fetch(transcriptUrl(sessionPath, clipPath, env.NEXT_PUBLIC_API_URL), { signal: controller.signal });

				if (res.ok) {
					const { text } = (await res.json()) as { text: string };
					transcripts.set(key, text);
					setVersion((v) => v + 1);
					return;
				}

				const delay = retryDelayMs(res.status, res.headers.get("Retry-After"), n);
				if (delay === null) {
					setFailedKey(key);
					return;
				}

				timer = setTimeout(() => attempt(n + 1), delay);
			} catch {
				if (!controller.signal.aborted) setFailedKey(key);
			}
		};

		attempt(1);

		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [key, sessionPath, clipPath]);

	const text = key ? transcripts.get(key) : undefined;
	if (text !== undefined) return { status: "done", text };
	if (key === null || failedKey === key) return { status: "unavailable" };
	return { status: "loading" };
}
