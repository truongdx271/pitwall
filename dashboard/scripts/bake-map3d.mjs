#!/usr/bin/env node
// Bakes per-circuit data for the 3D map into public/maps/3d/<circuitKey>.json:
//   z:   track height in metres, one value per point of the circuit's outline
//   pit: pit lane path as [x, y, z], x/y in feed coordinates and z in metres
// Source: OpenF1 historical car locations. Free, but rate limited and refused during live
// sessions, so the result is checked in rather than fetched at runtime. See public/maps/README.md.
//
// Usage: node scripts/bake-map3d.mjs [circuitKey ...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const YEAR = 2026;
const HEIGHT_LAPS = 5;
const PIT_STOPS = 5;
const PIT_SAMPLES = 90;
const HEIGHT_SMOOTHING = 250; // sigma along the lap, decimetres
const OFF_TRACK = 30; // a pit sample is more than this far from the outline, decimetres
const MAX_LAP_OFFSET = 150; // reject outlines not in feed coordinates, decimetres
const REQUEST_GAP_MS = 2200; // OpenF1's free tier allows 30 requests a minute
const OUT_DIR = new URL("../public/maps/3d/", import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

async function get(path, params = {}) {
	const query = Object.entries(params)
		.map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
		.join("&");
	const url = `https://api.openf1.org/v1/${path}?${query}`;
	for (let attempt = 0; attempt < 5; attempt++) {
		await sleep(REQUEST_GAP_MS);
		try {
			const res = await fetch(url, { headers: { "User-Agent": "pitwall-bake" } });
			if (res.status === 404) return [];
			if (res.ok) return await res.json();
			console.error(`  ${res.status} ${url}`);
		} catch (e) {
			console.error(`  ${e.message}`);
		}
		await sleep(8000);
	}
	throw new Error(`OpenF1 kept failing: ${url}`);
}

async function loadOutline(key) {
	const res = await fetch(`https://api.multiviewer.app/api/v1/circuits/${key}/${YEAR}`, {
		headers: { "User-Agent": "pitwall-bake" },
	});
	if (res.ok) return res.json();
	const local = new URL(`../public/maps/${key}-${YEAR}.json`, import.meta.url);
	return existsSync(local) ? JSON.parse(readFileSync(local, "utf8")) : null;
}

function makeProjector({ x: X, y: Y }) {
	const n = X.length;
	const nearest = (px, py, around) => {
		let best = { off: Infinity, i: 0 };
		const count = around === null ? n : 46;
		for (let k = 0; k < count; k++) {
			const i = around === null ? k : (around - 6 + k + n) % n;
			const j = (i + 1) % n;
			const dx = X[j] - X[i];
			const dy = Y[j] - Y[i];
			const len = dx * dx + dy * dy || 1;
			const t = Math.max(0, Math.min(1, ((px - X[i]) * dx + (py - Y[i]) * dy) / len));
			const off = Math.hypot(px - X[i] - t * dx, py - Y[i] - t * dy);
			if (off < best.off) best = { off, i, t };
		}
		return best;
	};
	// Walks a lap in order so a crossover (Suzuka) never lands on the other level.
	return { nearest, n };
}

function smoothLoop(values, outline) {
	const { x: X, y: Y } = outline;
	const n = X.length;
	const cum = [0];
	for (let i = 0; i < n; i++) cum.push(cum[i] + Math.hypot(X[(i + 1) % n] - X[i], Y[(i + 1) % n] - Y[i]));
	const length = cum[n];
	return values.map((_, i) => {
		let weight = 0;
		let sum = 0;
		for (let j = 0; j < n; j++) {
			let d = Math.abs(cum[i] - cum[j]);
			d = Math.min(d, length - d);
			if (d > HEIGHT_SMOOTHING * 3) continue;
			const g = Math.exp((-d * d) / (2 * HEIGHT_SMOOTHING * HEIGHT_SMOOTHING));
			weight += g;
			sum += g * values[j];
		}
		return sum / weight;
	});
}

async function bakeHeights(session, outline, proj) {
	const laps = (await get("laps", { session_key: session.session_key })).filter(
		(l) => l.lap_duration && l.date_start && !l.is_pit_out_lap,
	);
	const best = new Map();
	for (const l of laps) {
		const seen = best.get(l.driver_number);
		if (!seen || l.lap_duration < seen.lap_duration) best.set(l.driver_number, l);
	}
	const fastest = [...best.values()].sort((a, b) => a.lap_duration - b.lap_duration).slice(0, HEIGHT_LAPS);

	const bins = outline.x.map(() => []);
	const offsets = [];
	let used = 0;
	for (const lap of fastest) {
		const start = new Date(lap.date_start);
		const end = new Date(start.getTime() + lap.lap_duration * 1000);
		const samples = await get("location", {
			session_key: session.session_key,
			driver_number: lap.driver_number,
			"date>": start.toISOString(),
			"date<": end.toISOString(),
		});
		if (samples.length < 100) continue;
		const perLap = outline.x.map(() => []);
		let at = null;
		const lapOffsets = [];
		for (const s of samples) {
			const hit = proj.nearest(s.x, s.y, at);
			at = hit.i;
			perLap[hit.i].push(s.z);
			lapOffsets.push(hit.off);
		}
		offsets.push(median(lapOffsets));
		if (median(lapOffsets) > MAX_LAP_OFFSET) continue;
		perLap.forEach((v, i) => v.length && bins[i].push(v.reduce((a, b) => a + b, 0) / v.length));
		used++;
	}
	if (!used) return { offset: offsets.length ? median(offsets) : null };

	const spreads = bins.filter((b) => b.length >= 3).map((b) => Math.sqrt(variance(b)));
	const raw = bins.map((b) => (b.length ? median(b) : null));
	for (let i = 0; i < raw.length; i++) {
		if (raw[i] !== null) continue;
		let a = i;
		let b = i;
		while (raw[(a + raw.length) % raw.length] === null) a--;
		while (bins[b % raw.length].length === 0) b++;
		raw[i] = (raw[(a + raw.length) % raw.length] + median(bins[b % raw.length])) / 2;
	}
	const z = smoothLoop(raw, outline).map((v) => Math.round(v) / 10);
	return { z, used, spread: spreads.length ? median(spreads) / 10 : null, offset: median(offsets) };
}

function variance(v) {
	const mean = v.reduce((a, b) => a + b, 0) / v.length;
	return v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length;
}

function resample(path, count) {
	const cum = [0];
	for (let i = 1; i < path.length; i++) {
		cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
	}
	const total = cum[cum.length - 1];
	let j = 0;
	return Array.from({ length: count }, (_, k) => {
		const d = (k / (count - 1)) * total;
		while (j < cum.length - 2 && cum[j + 1] < d) j++;
		const edge = cum[j + 1] - cum[j] || 1;
		const t = (d - cum[j]) / edge;
		return [path[j][0] + (path[j + 1][0] - path[j][0]) * t, path[j][1] + (path[j + 1][1] - path[j][1]) * t];
	});
}

async function bakePit(session, outline, proj, z) {
	const stops = (await get("pit", { session_key: session.session_key })).filter((s) => s.date && s.pit_duration);
	const typical = median(stops.map((s) => s.pit_duration));
	const chosen = [];
	const drivers = new Set();
	for (const s of [...stops].sort((a, b) => Math.abs(a.pit_duration - typical) - Math.abs(b.pit_duration - typical))) {
		if (drivers.has(s.driver_number)) continue;
		drivers.add(s.driver_number);
		chosen.push(s);
		if (chosen.length === PIT_STOPS) break;
	}

	const paths = [];
	for (const stop of chosen) {
		const at = new Date(stop.date).getTime();
		const samples = await get("location", {
			session_key: session.session_key,
			driver_number: stop.driver_number,
			"date>": new Date(at - 60_000).toISOString(),
			"date<": new Date(at + (stop.pit_duration + 60) * 1000).toISOString(),
		});
		// The longest off-track run in the window is the trip through the pit lane.
		let run = [];
		let longest = [];
		for (const s of samples) {
			if (proj.nearest(s.x, s.y, null).off > OFF_TRACK) {
				run.push([s.x, s.y]);
				if (run.length > longest.length) longest = run;
			} else run = [];
		}
		const moved = longest.filter(
			(p, i) => i === 0 || Math.hypot(p[0] - longest[i - 1][0], p[1] - longest[i - 1][1]) > 2,
		);
		if (moved.length >= 15) paths.push(resample(moved, PIT_SAMPLES));
	}
	if (!paths.length) return null;

	// Median across stops cancels each team's swerve into its own garage.
	const line = Array.from({ length: PIT_SAMPLES }, (_, i) => [
		median(paths.map((p) => p[i][0])),
		median(paths.map((p) => p[i][1])),
	]);
	const smoothed = line.map((p, i) => {
		if (i === 0 || i === line.length - 1) return p;
		const a = line[i - 1];
		const b = line[i + 1];
		return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
	});
	// The feed holds z constant in the pit lane, so height comes from the track beside it.
	const onTrack = (p) => {
		const { i, t } = proj.nearest(p[0], p[1], null);
		const next = (i + 1) % proj.n;
		return { x: outline.x[i] + (outline.x[next] - outline.x[i]) * t, y: outline.y[i] + (outline.y[next] - outline.y[i]) * t, h: z[i] + (z[next] - z[i]) * t };
	};
	const withHeight = smoothed.map((p) => [Math.round(p[0]), Math.round(p[1]), onTrack(p).h]);
	const first = onTrack(smoothed[0]);
	const last = onTrack(smoothed[smoothed.length - 1]);
	const full = [[first.x, first.y, first.h], ...withHeight, [last.x, last.y, last.h]].map((p) => [
		Math.round(p[0]),
		Math.round(p[1]),
		Math.round(p[2] * 10) / 10,
	]);
	const metres = full.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - full[i][0], p[1] - full[i][1]) / 10, 0);
	return { path: full, stops: paths.length, metres };
}

async function main() {
	mkdirSync(OUT_DIR, { recursive: true });
	const now = Date.now();
	const wanted = process.argv.slice(2).map(Number);
	const sessions = [...(await get("sessions", { year: YEAR })), ...(await get("sessions", { year: YEAR - 1 }))].filter(
		(s) => new Date(s.date_end).getTime() < now,
	);
	const keys = wanted.length
		? wanted
		: [...new Set(sessions.filter((s) => s.date_start.startsWith(String(YEAR))).map((s) => s.circuit_key))];
	const allKeys = wanted.length ? keys : [...new Set([...keys, ...(await get("sessions", { year: YEAR })).map((s) => s.circuit_key)])];

	for (const key of allKeys) {
		const outline = await loadOutline(key);
		const here = sessions.filter((s) => s.circuit_key === key).sort((a, b) => b.date_start.localeCompare(a.date_start));
		const quali = here.find((s) => s.session_name === "Qualifying");
		const race = here.find((s) => s.session_name === "Race");
		if (!outline || !quali) {
			console.log(`${key}: skipped (outline ${!!outline}, qualifying ${!!quali})`);
			continue;
		}
		const proj = makeProjector(outline);
		const heights = await bakeHeights(quali, outline, proj);
		if (!heights.z) {
			console.log(`${key} ${quali.circuit_short_name}: outline not in feed coordinates (lap offset ${heights.offset})`);
			continue;
		}
		const pit = race ? await bakePit(race, outline, proj, heights.z) : null;
		const range = Math.max(...heights.z) - Math.min(...heights.z);
		writeFileSync(
			new URL(`${key}.json`, OUT_DIR),
			JSON.stringify({
				circuitKey: key,
				name: quali.circuit_short_name,
				source: `OpenF1 ${quali.year} ${quali.country_name}`,
				points: outline.x.length,
				z: heights.z,
				pit: pit?.path ?? null,
			}),
		);
		console.log(
			`${key} ${quali.circuit_short_name} ${quali.year}: height ${range.toFixed(1)} m, ${heights.used} laps, spread ${heights.spread?.toFixed(2)} m, offset ${(heights.offset / 10).toFixed(2)} m; pit ${pit ? `${pit.metres.toFixed(0)} m from ${pit.stops} stops` : "none"}`,
		);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
