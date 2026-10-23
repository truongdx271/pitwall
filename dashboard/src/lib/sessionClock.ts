import type { ExtrapolatedClock } from "@/types/state.type";

const pad = (n: number) => String(n).padStart(2, "0");

// "01:02:03" (or "-04:00:00") → ms.
const parseHms = (value: string): number | null => {
	const m = /^(-?)(\d+):(\d{2}):(\d{2})/.exec(value.trim());
	if (!m) return null;
	const ms = (Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4])) * 1000;
	return m[1] === "-" ? -ms : ms;
};

/**
 * Time left in the session, as the strip shows it: "08:42" under an hour, "1:02:03" above.
 * While the clock extrapolates, it counts down from the last update; the broadcast delay
 * shifts it back so it matches what the viewer sees.
 */
export const sessionRemaining = (
	clock: ExtrapolatedClock | undefined,
	nowMs: number,
	delaySec: number,
): string | null => {
	if (!clock?.Remaining) return null;
	let ms = parseHms(clock.Remaining);
	if (ms == null) return null;

	if (clock.Extrapolating) ms -= nowMs - Date.parse(clock.Utc) - delaySec * 1000;
	ms = Math.max(0, ms);

	const total = Math.floor(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/** Wall-clock time at the circuit (SessionInfo.GmtOffset), shifted back by the delay. */
export const circuitLocalTime = (nowMs: number, gmtOffset: string | undefined, delaySec: number): string | null => {
	const offset = gmtOffset ? parseHms(gmtOffset) : null;
	if (offset == null) return null;

	const local = new Date(nowMs - delaySec * 1000 + offset);
	return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
};
