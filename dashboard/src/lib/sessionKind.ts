export type SessionKind = "practice" | "qualifying" | "race";

/**
 * Which layout a session gets (SPEC §5): Practice, then Qualifying (or a name containing it,
 * which covers Sprint Qualifying), then everything else, Sprint included, as a race. The
 * name is a fallback for when Type is missing.
 */
export const sessionKind = (info: { Type?: string; Name?: string } | undefined): SessionKind => {
	const name = info?.Name?.toLowerCase() ?? "";
	if (info?.Type === "Practice" || (!info?.Type && name.startsWith("practice"))) return "practice";
	if (info?.Type === "Qualifying" || name.includes("qualifying")) return "qualifying";
	return "race";
};
