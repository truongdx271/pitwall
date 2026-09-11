import type { Map } from "@/types/map.type";

const OUTLINE_FALLBACKS = new Set(["153/2026"]);

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

export const fetchMap = async (circuitKey: number, year = new Date().getFullYear()): Promise<Map | null> => {
	const map = await loadMap(`https://api.multiviewer.app/api/v1/circuits/${circuitKey}/${year}`);
	if (map) return map;
	if (OUTLINE_FALLBACKS.has(`${circuitKey}/${year}`)) return loadMap(`/maps/${circuitKey}-${year}.json`);
	return null;
};
