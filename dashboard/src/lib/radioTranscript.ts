// Helpers for fetching team radio transcripts via /api/radio/transcript
// (proxied to the Rust api, which transcribes each clip once with Groq Whisper).

export const MAX_ATTEMPTS = 4;

const DEFAULT_RETRY_S = 10;

export function transcriptUrl(sessionPath: string, clipPath: string): string {
	return `/api/radio/transcript?path=${encodeURIComponent(sessionPath + clipPath)}`;
}

// Only 503 (Groq rate limit) is worth retrying; everything else is final.
export function retryDelayMs(status: number, retryAfter: string | null, attempt: number): number | null {
	if (status !== 503 || attempt >= MAX_ATTEMPTS) return null;

	const secs = Number(retryAfter);
	return (Number.isFinite(secs) && secs > 0 ? secs : DEFAULT_RETRY_S) * 1000;
}
