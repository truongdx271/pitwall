"use client";

import { useEffect, useRef, useState } from "react";

import maplibregl, { Map, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { fetchCityCoords, fetchCoords } from "@/lib/geocode";
import { getRainviewer } from "@/lib/rainviewer";

import { useDataStore } from "@/stores/useDataStore";

import PlayControls from "@/components/ui/PlayControls";

import Timeline from "./map-timeline";

export function WeatherMap() {
	// Primitives only — the Meeting object gets a fresh reference on every state
	// update. `key` on the inner component gives us a clean one-shot map per circuit.
	const circuitKey = useDataStore((s) => s.state?.SessionInfo?.Meeting?.Circuit?.Key);
	const countryName = useDataStore((s) => s.state?.SessionInfo?.Meeting?.Country?.Name);
	const location = useDataStore((s) => s.state?.SessionInfo?.Meeting?.Location);

	if (!circuitKey || !countryName || !location) {
		return (
			<div className="flex h-full w-full items-center justify-center font-mono text-sm text-zinc-700">
				no session — no location for the rain radar
			</div>
		);
	}

	return <RadarMap key={circuitKey} query={`${countryName}, ${location}`} city={location} />;
}

function RadarMap({ query, city }: { query: string; city: string }) {
	const [ready, setReady] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [frames, setFrames] = useState<{ id: number; time: number }[]>([]);

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<Map | null>(null);
	const currentFrameRef = useRef<number>(0);

	useEffect(() => {
		const container = mapContainerRef.current;
		if (!container) return;

		let cancelled = false;

		const addRainviewerLayers = async (map: Map) => {
			const rainviewer = await getRainviewer();
			if (cancelled || !rainviewer) return;

			const pathFrames = [...rainviewer.radar.past, ...rainviewer.radar.nowcast];
			pathFrames.forEach((frame, i) => {
				const id = `rainviewer-frame-${i}`;
				if (map.getLayer(id)) return;
				map.addLayer({
					id,
					type: "raster",
					source: {
						type: "raster",
						tiles: [`${rainviewer.host}${frame.path}/256/{z}/{x}/{y}/8/1_0.webp`],
						tileSize: 512,
						maxzoom: 6,
						minzoom: 0,
						volatile: false,
					},
					paint: {
						"raster-opacity": 0,
						"raster-fade-duration": 200,
						"raster-resampling": "nearest",
					},
				});
			});

			setFrames(pathFrames.map((frame, i) => ({ time: frame.time, id: i })));
		};

		(async () => {
			// nominatim asks for <=1 req/s, so try in sequence
			const coords =
				(await fetchCoords(`${query} circuit`)) ??
				(await fetchCoords(`${query} autodrome`)) ??
				(await fetchCoords(query)) ??
				(await fetchCityCoords(city));

			if (cancelled || !container) return;

			const map = new maplibregl.Map({
				container,
				style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
				center: coords ? [coords.lon, coords.lat] : [10, 40],
				zoom: coords ? 9 : 2,
				attributionControl: { compact: true },
				canvasContextAttributes: { antialias: true },
			});
			mapRef.current = map;

			map.on("load", async () => {
				if (cancelled) return;
				setReady(true);
				if (coords) new Marker().setLngLat([coords.lon, coords.lat]).addTo(map);
				await addRainviewerLayers(map);
			});
		})();

		return () => {
			cancelled = true;
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, [query, city]);

	const setFrame = (idx: number) => {
		const map = mapRef.current;
		if (!map) return;
		const prev = `rainviewer-frame-${currentFrameRef.current}`;
		const next = `rainviewer-frame-${idx}`;
		if (map.getLayer(prev)) map.setPaintProperty(prev, "raster-opacity", 0);
		if (map.getLayer(next)) map.setPaintProperty(next, "raster-opacity", 0.8);
		currentFrameRef.current = idx;
	};

	return (
		<div className="relative h-full w-full">
			<div ref={mapContainerRef} className="absolute h-full w-full" />

			{ready && frames.length > 0 && (
				<div className="absolute right-0 bottom-0 left-0 z-20 m-2 flex gap-4 rounded-lg bg-black/80 p-4 backdrop-blur-xs md:right-auto md:w-lg">
					<PlayControls playing={playing} onClick={() => setPlaying((v) => !v)} />
					<Timeline frames={frames} setFrame={setFrame} playing={playing} />
				</div>
			)}

			{!ready && <div className="h-full w-full animate-pulse rounded-lg bg-zinc-800" />}
		</div>
	);
}
