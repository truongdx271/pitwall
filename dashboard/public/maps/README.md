# Circuit outline fallbacks

`153-2026.json` is a measured Madring racing line derived from public F1 timing
positions for George Russell (#63), FP1 lap 20 (1:34.077), on 2026-09-11.
Source archive: https://livetiming.formula1.com/static/2026/2026-09-13_Spanish_Grand_Prix/2026-09-11_Practice_1/

The layout provider returned 404 for circuit 153/year 2026 on 2026-09-11.
The fallback uses the feed's original X/Y coordinate system so current driver
positions align with the outline. It is approximate (sampled racing line),
not a surveyed centreline. No corner numbers or marshal-sector boundaries
are invented. The regular provider takes precedence as soon as it has a map.

Reproduction: select the fastest `LastLapTime.Value` in `TimingData.jsonStream`
(car 63 at stream time `01:00:42.477`), subtract its 94.077-second duration,
and decode the base64/raw-deflate payloads in `Position.z.jsonStream`.
Keep car 63's nonzero X/Y samples whose outer stream timestamps are between
`00:59:08.400` and `01:00:42.477`, in chronological order. Append the first
sample to close the line (the sampled endpoints differ by about 7 metres).
