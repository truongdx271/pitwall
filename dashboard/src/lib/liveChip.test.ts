import { describe, expect, it } from "vitest";
import { liveChipState } from "./liveChip";

describe("liveChipState", () => {
	it("is reconnecting whenever the socket is down", () => {
		expect(liveChipState({ connected: false, hasSession: true, delay: 0 })).toBe("reconnecting");
		expect(liveChipState({ connected: false, hasSession: false, delay: 30 })).toBe("reconnecting");
	});

	it("is no session when connected without session info", () => {
		expect(liveChipState({ connected: true, hasSession: false, delay: 0 })).toBe("nosession");
	});

	it("is live or delayed depending on the delay", () => {
		expect(liveChipState({ connected: true, hasSession: true, delay: 0 })).toBe("live");
		expect(liveChipState({ connected: true, hasSession: true, delay: 30 })).toBe("delayed");
	});
});
