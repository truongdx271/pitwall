import { utcMs } from "@/lib/utcMs";

// Race control status tags and incidents, parsed from the message text (SPEC §7). The feed
// has no structured field for these, so the rules follow the stewards' fixed wording.

export type RcStatus = "noted" | "investigation" | "penalty" | "nfa";

export const RC_STATUS_LABEL: Record<RcStatus, string> = {
	noted: "Incident · noted",
	investigation: "Under investigation",
	penalty: "Penalty",
	nfa: "No further action",
};

/** The steward status a message announces, or null for an ordinary message. */
export const rcStatus = (message: string): RcStatus | null => {
	const m = message.toUpperCase();
	// "REVIEWED NO FURTHER INVESTIGATION" also contains INVESTIGATION, so it goes first.
	if (/NO FURTHER (ACTION|INVESTIGATION)/.test(m)) return "nfa";
	if (/PENALTY|REPRIMAND|DISQUALIFIED|DRIVE[- ]THROUGH|STOP-AND-GO/.test(m)) return "penalty";
	if (/UNDER INVESTIGATION|WILL BE INVESTIGATED/.test(m)) return "investigation";
	if (/\bNOTED\b/.test(m)) return "noted";
	return null;
};

export type Incident = {
	/** Racing numbers involved, in message order. */
	cars: string[];
	/** The offence, sentence case ("Starting procedure infringement — out of position at safety car line"). */
	summary: string;
	status: RcStatus;
	utc: string;
};

const CAR = /(\d+) \(([A-Z]{3})\)/g;

/** Racing numbers named in an incident or penalty message. */
export const incidentCars = (message: string): string[] => Array.from(message.matchAll(CAR), (m) => m[1]);

/**
 * The offence: what follows " - " after the last car named, without the trailing "(16:25:37)".
 * Starting after the cars skips prefixes like "PENALTY SERVED - 5 SECOND TIME PENALTY FOR CAR …".
 */
export const incidentReason = (message: string): string => {
	const cars = Array.from(message.matchAll(CAR));
	const last = cars[cars.length - 1];
	const from = last?.index != null ? last.index + last[0].length : 0;
	const i = message.indexOf(" - ", from);
	const reason = i === -1 ? "" : message.slice(i + 3);
	return reason.replace(/\s*\(\d{1,2}:\d{2}:\d{2}\)\s*$/, "").trim();
};

const sentenceCase = (text: string) => {
	const lower = text.toLowerCase().replace(/ - /g, " — ");
	return lower.charAt(0).toUpperCase() + lower.slice(1);
};

/**
 * One entry per incident, newest first, with the latest status. Messages about the same cars
 * and offence (noted → under investigation → penalty) collapse into one.
 */
export const incidents = (messages: { Message: string; Utc: string }[]): Incident[] => {
	const list: (Incident & { reason: string })[] = [];
	const sorted = [...messages].sort((a, b) => utcMs(a.Utc) - utcMs(b.Utc));

	for (const msg of sorted) {
		const status = rcStatus(msg.Message);
		const cars = incidentCars(msg.Message);
		if (!status || cars.length === 0 || /TRACK LIMITS/i.test(msg.Message)) continue;

		const reason = incidentReason(msg.Message);
		// Same offence and the same cars, or a subset: a penalty names only the car it hits.
		const known = list.find((inc) => inc.reason === reason && cars.every((nr) => inc.cars.includes(nr)));
		if (known) {
			known.status = status;
			known.utc = msg.Utc;
		} else {
			list.push({ cars, reason, summary: sentenceCase(reason) || "Incident", status, utc: msg.Utc });
		}
	}

	return list
		.map(({ cars, summary, status, utc }) => ({ cars, summary, status, utc }))
		.sort((a, b) => utcMs(b.utc) - utcMs(a.utc));
};
