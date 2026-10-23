import { useEffect } from "react";

import { env } from "@/env";
import { retryDelayMs, transcriptUrl } from "@/lib/radioTranscript";
import { useTranscriptStore } from "@/stores/useTranscriptStore";

export type TranscriptState =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "done"; text: string }
	| { status: "unavailable" };

/**
 * `enabled: false` waits for the viewer (the Messages feed's "Show transcript"): nothing is
 * fetched, and the clip reads "idle" unless an earlier view already cached its text.
 */
export function useRadioTranscript(
	sessionPath: string | undefined,
	clipPath: string,
	{ enabled = true }: { enabled?: boolean } = {},
): TranscriptState {
	const key = sessionPath ? sessionPath + clipPath : null;

	// Text and failures live in a shared store; store writes only run in async callbacks.
	const text = useTranscriptStore((s) => (key ? s.texts[key] : undefined));
	const failed = useTranscriptStore((s) => (key ? !!s.failed[key] : false));

	useEffect(() => {
		if (!enabled || !key || !sessionPath || useTranscriptStore.getState().texts[key] !== undefined) return;

		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout> | undefined;

		const attempt = async (n: number) => {
			try {
				const res = await fetch(transcriptUrl(sessionPath, clipPath, env.NEXT_PUBLIC_API_URL), {
					signal: controller.signal,
				});

				if (res.ok) {
					const { text } = (await res.json()) as { text: string };
					useTranscriptStore.getState().setText(key, text);
					return;
				}

				const delay = retryDelayMs(res.status, res.headers.get("Retry-After"), n);
				if (delay === null) {
					useTranscriptStore.getState().setFailed(key);
					return;
				}

				timer = setTimeout(() => attempt(n + 1), delay);
			} catch {
				if (!controller.signal.aborted) useTranscriptStore.getState().setFailed(key);
			}
		};

		attempt(1);

		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [enabled, key, sessionPath, clipPath]);

	if (text !== undefined) return { status: "done", text };
	if (key === null || failed) return { status: "unavailable" };
	return enabled ? { status: "loading" } : { status: "idle" };
}
