// Pre-2026 cut-offs (20 cars), used only when the feed has no NoEntries.
const FALLBACK_CUTOFF: Record<number, number> = { 1: 15, 2: 10 };

/**
 * Last position that advances from the current qualifying part, or null when the
 * part has no knockout zone (Q3, or no part running).
 *
 * TimingData.NoEntries lists the cars in each part, e.g. [22, 16, 10]: the count for
 * the next part (index = SessionPart, 1-based) is how many advance from this one.
 */
export const knockoutCutoff = (noEntries: number[] | undefined, sessionPart: number | undefined): number | null => {
	if (!sessionPart) return null;

	if (noEntries?.some((n) => n > 0)) {
		const advancing = noEntries[sessionPart];
		return advancing != null && advancing > 0 ? advancing : null;
	}

	return FALLBACK_CUTOFF[sessionPart] ?? null;
};

export const inKnockoutZone = (
	position: number,
	noEntries: number[] | undefined,
	sessionPart: number | undefined,
): boolean => {
	const cutoff = knockoutCutoff(noEntries, sessionPart);
	return cutoff != null && position > cutoff;
};
