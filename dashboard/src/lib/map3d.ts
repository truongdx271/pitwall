import type { Map as CircuitMap } from "@/types/map.type";

// Baked per circuit by scripts/bake-map3d.mjs; see public/maps/README.md.
export type Map3dData = {
	// Height in metres for each point of the outline the file was baked against.
	points: number;
	z: number[];
	// Pit lane as [x, y, z]: feed coordinates, height in metres.
	pit: [number, number, number][] | null;
};

const isNumbers = (value: unknown): value is number[] => Array.isArray(value) && value.every(Number.isFinite);

// Null when there is no file, or it doesn't fit: the map then draws flat, without a pit lane.
export async function fetchMap3d(circuitKey: number, outlinePoints: number): Promise<Map3dData | null> {
	try {
		const response = await fetch(`/maps/3d/${circuitKey}.json`, { signal: AbortSignal.timeout(10_000) });
		if (!response.ok) return null;
		const data: Map3dData = await response.json();
		if (!isNumbers(data.z) || data.z.length !== outlinePoints) return null;
		const pit = Array.isArray(data.pit) && data.pit.every((p) => isNumbers(p) && p.length === 3) ? data.pit : null;
		return { points: data.points, z: data.z, pit };
	} catch {
		return null;
	}
}

const MIN_EXAGGERATION = 1;
export const MAX_EXAGGERATION = 6;
// Starting height: a tenth of the track's span, so Monza is readable and Spa isn't a cliff.
const TARGET_RELIEF = 0.1;

export function defaultExaggeration(heightRange: number, span: number): number {
	if (heightRange <= 0 || span <= 0) return MIN_EXAGGERATION;
	const wanted = (span * TARGET_RELIEF) / heightRange;
	return Math.min(MAX_EXAGGERATION, Math.max(MIN_EXAGGERATION, Math.round(wanted * 2) / 2));
}

// Track position of each marshal sector's start as a lap fraction, in sector order.
// Outlines with no marshal sectors become one sector 0, as in createSectors.
export function sectorStarts(map: Pick<CircuitMap, "x" | "y" | "marshalSectors">): number[] {
	if (map.marshalSectors.length === 0) return [0];
	const cumulative = [0];
	for (let i = 1; i < map.x.length; i++) {
		cumulative.push(cumulative[i - 1] + Math.hypot(map.x[i] - map.x[i - 1], map.y[i] - map.y[i - 1]));
	}
	const last = map.x.length - 1;
	const length = cumulative[last] + Math.hypot(map.x[0] - map.x[last], map.y[0] - map.y[last]);
	return map.marshalSectors.map(({ trackPosition: { x, y } }) => {
		let nearest = 0;
		let best = Infinity;
		map.x.forEach((px, i) => {
			const d = Math.hypot(px - x, map.y[i] - y);
			if (d < best) {
				best = d;
				nearest = i;
			}
		});
		return cumulative[nearest] / length;
	});
}

export type LabelBox = { x: number; y: number };

const LABEL_WIDTH = 36;
const LABEL_HEIGHT = 17;
const MAX_LIFTS = 8;

// Screen position of each car's chip, given its anchor just above the car. Earlier entries keep
// their spot; a chip that would cover one moves up until it is clear.
export function stackLabels(anchors: LabelBox[]): LabelBox[] {
	const placed: LabelBox[] = [];
	for (const anchor of anchors) {
		const box = { ...anchor };
		for (let i = 0; i < MAX_LIFTS; i++) {
			const hit = placed.find((o) => Math.abs(o.x - box.x) < LABEL_WIDTH && Math.abs(o.y - box.y) < LABEL_HEIGHT);
			if (!hit) break;
			box.y = hit.y - LABEL_HEIGHT;
		}
		placed.push(box);
	}
	return placed;
}
