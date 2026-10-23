export type LiveChipState = "live" | "delayed" | "reconnecting" | "nosession";

type Input = {
	connected: boolean;
	/** True once the feed has sent a SessionInfo. */
	hasSession: boolean;
	/** Broadcast delay in seconds. */
	delay: number;
};

// The four states of the top-bar chip (States.png): Live, Delayed Ns, Reconnecting, No session.
export const liveChipState = ({ connected, hasSession, delay }: Input): LiveChipState => {
	if (!connected) return "reconnecting";
	if (!hasSession) return "nosession";
	return delay > 0 ? "delayed" : "live";
};
