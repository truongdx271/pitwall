/**
 * True when a message moves the feed to another session (SessionInfo.Path changes). The
 * dashboard then drops everything it holds, because merging the new session onto the old
 * state keeps topics the new one hasn't sent yet (race control, radio, laps).
 * A reconnect within the same session (same path) is not a change: it keeps the buffers
 * the broadcast delay needs.
 */
export const isNewSession = (currentPath: string | null, incomingPath: string | undefined): boolean =>
	!!currentPath && !!incomingPath && incomingPath !== currentPath;
