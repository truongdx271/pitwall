// Helpers for F1 team colours, which the feed sends as 6-digit hex without "#".

export function isLight(hex: string): boolean {
	if (!hex || hex.length < 6) return false;
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// The feed sends Cadillac a grey (909090) that is hard to tell from Haas (9C9FA2).
// Shown as yellow (black text, via textOn) by the user's choice.
export const CADILLAC_YELLOW = "E6B800";

const TEAM_COLOUR_OVERRIDES: Record<string, string> = { Cadillac: CADILLAC_YELLOW };

// Readable text colour on top of a team colour.
export function textOn(hex: string | undefined): "#000" | "#fff" {
	return hex && isLight(hex) ? "#000" : "#fff";
}

// Applies TEAM_COLOUR_OVERRIDES to a DriverList; returns the same object when nothing changes.
export function teamColours<T extends { TeamName: string; TeamColour: string }>(
	list: Record<string, T>,
): Record<string, T> {
	let out: Record<string, T> | null = null;
	for (const [nr, driver] of Object.entries(list)) {
		const colour = TEAM_COLOUR_OVERRIDES[driver.TeamName];
		if (colour && driver.TeamColour !== colour) {
			out ??= { ...list };
			out[nr] = { ...driver, TeamColour: colour };
		}
	}
	return out ?? list;
}
