/**
 * Epoch ms for a feed timestamp. The feed mixes formats: TeamRadio sends "…:36.720675Z" but
 * RaceControlMessages sends "2026-10-23T17:21:33" with no zone, which Date.parse reads as
 * browser-local time. Both are UTC, so a string without a zone gets one.
 */
export const utcMs = (value: string): number => {
	const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
	return Date.parse(hasZone ? value : `${value}Z`);
};
