import { buildParams } from "@/lib/params";

import type { Coords, Place } from "@/types/geocode.type";

// Network errors (e.g. nominatim blocked by the ISP) resolve to null so the
// caller can fall back instead of never rendering the map.
export const fetchCoords = async (query: string): Promise<Coords | null> => {
	const params = buildParams({
		q: query,
		format: "jsonv2",
	});

	const url = `https://nominatim.openstreetmap.org/search${params}`;

	try {
		const response = await fetch(url);
		if (!response.ok) return null;

		const data: Place[] = await response.json();
		if (data.length === 0) return null;

		const sorted = data.sort((a, b) => b.importance - a.importance);

		const { lon, lat } = sorted[0];
		return { lon: parseFloat(lon), lat: parseFloat(lat) };
	} catch {
		return null;
	}
};

// City-level fallback via open-meteo — only matches place names, not circuits.
export const fetchCityCoords = async (name: string): Promise<Coords | null> => {
	const params = buildParams({ name, count: 1 });

	const url = `https://geocoding-api.open-meteo.com/v1/search${params}`;

	try {
		const response = await fetch(url);
		if (!response.ok) return null;

		const data: { results?: { latitude: number; longitude: number }[] } = await response.json();
		const first = data.results?.[0];
		if (!first) return null;

		return { lon: first.longitude, lat: first.latitude };
	} catch {
		return null;
	}
};
