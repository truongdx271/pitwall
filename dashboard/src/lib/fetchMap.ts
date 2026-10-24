import type { Map } from "@/types/map.type";

const OUTLINE_FALLBACKS = new Set(["153/2026", "12/2026"]);

async function loadMap(url: string): Promise<Map | null> {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
		if (!response.ok) return null;
		const map: Map = await response.json();
		if (
			!Array.isArray(map.x) ||
			!Array.isArray(map.y) ||
			map.x.length < 4 ||
			map.x.length !== map.y.length ||
			!map.x.every(Number.isFinite) ||
			!map.y.every(Number.isFinite) ||
			!Number.isFinite(map.rotation) ||
			!Array.isArray(map.corners) ||
			!Array.isArray(map.marshalSectors)
		)
			return null;
		return map;
	} catch {
		return null;
	}
}

// Lap fraction where the feed reports InPit: false, for provider layouts (which
// don't carry one). Measured from archive TimingData + Position.z; see public/maps/README.md.
const PIT_EXITS: Record<string, number> = { "61/2026": 0.052 };

// Pit lane side (of the driving direction, feed coordinates) where the "more room"
// guess in pitSlots picks the wrong one. Keyed by circuit: pit lanes don't move.
// Both reported reversed on the live map, 2026-10-24; see public/maps/README.md.
const PIT_SIDES: Record<number, NonNullable<Map["pitSide"]>> = { 9: "left", 61: "right" };

export const fetchMap = async (circuitKey: number, year = new Date().getFullYear()): Promise<Map | null> => {
	const map =
		(await loadMap(`https://api.multiviewer.app/api/v1/circuits/${circuitKey}/${year}`)) ??
		(OUTLINE_FALLBACKS.has(`${circuitKey}/${year}`) ? await loadMap(`/maps/${circuitKey}-${year}.json`) : null);
	if (!map) return null;
	return {
		...map,
		pitExit: map.pitExit ?? PIT_EXITS[`${circuitKey}/${year}`],
		pitSide: map.pitSide ?? PIT_SIDES[circuitKey],
	};
};
