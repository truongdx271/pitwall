# Dev replay

Reproduce a recorded F1 session against the dashboard when there's no live one —
between race weekends, offline, on a plane. Dev-only; the endpoint 404s in a
production build unless `DEV_REPLAY=1` (used on the homelab staging deploy).

## Use it

1. `yarn dev`, open `http://localhost:3000/dashboard`. In a dev build the panel is
   **on by default**; the overlay's **hide** button (or `?dev=0`) turns it off,
   `?dev=1` turns it back on. In a production build it's off unless `?dev=1`.
2. The **DEV REPLAY** panel appears bottom-right:
   - **replay / live** toggle — swap the live backend for a recording.
   - **Practice / Qualifying / Race** — pick a recording (also flips to replay).
   - **▶ / ❚❚** pause & resume (resumes from where it stopped).
   - **⟲** restart from the top.
   - **1× 2× 5× 10× max** — playback speed (real timestamps × speed; idle gaps are
     capped so you're never waiting).
   - `elapsed / total` clock.

Switching source or session clears the dashboard state so nothing leaks between
sessions. The delay buffer ("Syncing…") is forced off while replaying.

## How it works

`src/app/api/dev/replay/route.ts` streams a recording over SSE in the exact shape
`useSocket` / `useDataEngine` already consume (`initial` + `update` events).
`src/hooks/useReplaySocket.ts` is a drop-in mirror of `useSocket`; the dashboard
layout picks one or the other based on `useReplayStore`.

`skipMs` fast-forwards past the dead lead-in (formation lap / pre-Q1) by folding
updates into the initial state, so a replay opens near the action. An explicit
`?t=<seconds>` overrides it (used internally to resume after a pause).

Car telemetry and the moving track map replay too — `CarData.z` / `Position.z` are
forwarded and `parseMessage()` normalises the topic names (`*.z` -> `*Z`).

## manifest.json

```jsonc
{
	"sessions": [
		{
			"id": "race", // matches the overlay + ?session=
			"label": "Race",
			"file": "canada-2026-race.jsonl", // relative to DEV_REPLAY_DIR (default: repo root)
			"format": "signalr-raw", // raw F1 dump | "sse" (from record-live.mjs)
			"skipMs": 3770000, // optional: jump past the lead-in
			"patch": { "SessionInfo": { "Name": "Practice 1", "Type": "Practice" } },
		},
	],
}
```

After editing, also update `SESSIONS` in `src/components/dev/ReplayOverlay.tsx`.

## Recording a new session

The Rust `simulator` is broken (SignalR Core migration). Record straight from a
running backend instead — during an actual live session:

```bash
node scripts/record-live.mjs https://f1-dev-live.home.ignaciohaffner.com ../madrid-2026-practice.jsonl
```

That writes a `format: "sse"` file — add it to `manifest.json` and it replays with
no translation. This is how you'd add a real **Practice** recording.
