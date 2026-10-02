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

## Kuala Lumpur (circuit 12, 2026)

`12-2026.json` covers the 2026 Bahrain Grand Prix held at Sepang. The layout
provider returned 404 for circuit 12 (every year) on 2026-10-02, and the F1
timing archive for FP1 was still generating, so this outline comes from
bacinger/f1-circuits `my-1999.geojson` (MIT): lon/lat projected to metres
around the centroid, y flipped for SVG, densified to ~10 m and scaled to
decimetres. Length 5545 m, clockwise, starting on the main straight.
It is NOT in F1 timing coordinates, so it is only suitable while car dots
are placed by lap progress. Replace it with a measured lap from
`Position.z.jsonStream` (as for Madring) once the archive is published.
Index 0 (the finish line) sits ~620 m before T1, 62% of the way from T1 to
T15 as on the TV graphic. Corners 1-15 are curvature peaks of the outline,
numbered and signed (L/R) to match the TV graphic; T3 is the middle of the long
880-1180 m right-hander and T13 the strongest right kink before T14 (checked
against a second live-timing map, 2026-10-02). Label angles point away from
the turn centre and rotate until they clear the track.
