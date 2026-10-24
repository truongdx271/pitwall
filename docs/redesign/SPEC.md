# Pitwall redesign: implementation spec

This is the build spec for the dashboard redesign. The pictures are in `screens/`. The exact
markup behind each picture, with every colour, size and sample row, is in `source/`. This
file says what the pictures can't: where each value comes from in the feed, what has to be
computed, which files change, and what is deliberately left out.

Read it alongside `PLAN.md`, which breaks the work into PRs.

## 0. Ground rules

- **Frontend only.** Everything happens in `dashboard/`. The Rust services (`realtime`, `api`,
  `signalr`, `simulator`, `shared`) are not touched.
- **The feed is the source of truth.** Every name, time, colour and count in the mockups is
  sample data. Never hardcode a driver, team, colour or session length from them.
- **Team colours** come from `DriverList[n].TeamColour` after `teamColours()` in
  `src/lib/color.ts`. Text on top of a team colour uses `textOn()`. Do not copy the `TEAM`
  maps from `source/*.dc.html`.
- **Dark only.** There is no light theme. The OLED mode setting and `OledModeProvider` go away.
- **Desktop first, mobile second.** The 1440 × 900 artboards are the reference. All 22 cars
  have to fit on the Live tab at 1440 × 900 with no page scroll. Phones (< 768 px) get their
  own layout (§11). Between 768 and 1279 px the desktop layout is used, and right-hand
  columns stack under the main content.
- **Don't invent data.** §12 lists what the feed doesn't carry. If a screen needs something
  that isn't in the feed or in an existing helper, stop and ask. Don't approximate it
  silently.
- **Numbers are mono.** Every time, gap, lap count and position is `font-mono tabular-nums`
  (Geist Mono). Labels, names and buttons are `font-sans` (Geist). The two fonts are already
  loaded in `src/app/layout.tsx`.
- Keep the existing data flow (`useDataEngine` → buffers → `useDataStore`, `useHistoryStore`)
  as it is. The redesign is presentation plus a few derived values, listed in §13.

## 1. Tokens

`tokens.css` is the full `@theme` block. Paste it into `src/styles/globals.css` and keep the
existing `@theme inline` font mapping. Then work through the components and replace
`zinc-*`, `violet-*`, `emerald-*`, `sky-*` and similar classes with the semantic tokens:

| Old (examples)                         | New                                           |
| -------------------------------------- | --------------------------------------------- |
| `bg-black`, `bg-zinc-950`              | `bg-bg`                                       |
| `bg-zinc-900` (zebra)                  | `bg-row-alt`                                  |
| `border-zinc-800`, `border-zinc-900`   | `border-border`                               |
| `text-zinc-300` / `-400` / `-500..700` | `text-fg-1` / `text-fg-2` / `text-fg-3`       |
| `text-violet-400`                      | `text-session-best`                           |
| `text-emerald-400`                     | `text-personal-best`                          |
| `text-amber-400`                       | `text-slower`                                 |
| `text-blue-400` (pit segment)          | `text-pit`                                    |
| `bg-violet-950/60` (fastest-lap row)   | `bg-fl-row`                                   |
| `bg-red-950/60` (danger zone)          | `bg-ko-row`                                   |
| `bg-red-500 text-black` (soft) etc.    | `bg-tyre-soft text-bg` etc.                   |

`text-fg-3` (#7C838F) is the lowest-contrast colour allowed for text. Use the darker greys
only for borders and fills.

## 2. App shell

Screens: every desktop artboard shares the same top bar. `Main.png` shows it best.

### 2.1 Top bar (52 px, replaces the sidebar)

- Left: logo mark and "pitwall" (links to `/`), then **six tabs, each with an icon and a
  label**: Live, Map, Messages, Strategy, Weather, Standings. Draw the icons as inline SVGs on a
  24-unit grid with stroke-width 2, round caps and joins. Copy the paths from
  `source/Main.dc.html`. The selected tab gets `bg-surface-3` and `text-fg-1`.
- Right: the **Live chip**, then Schedule, then Help (an icon that opens the legend modal),
  then Settings (an icon).
  - The Live chip shows connection status and the delay: "● Live · Delay 0s". Clicking it
    opens a popover holding the delay control, which reuses `DelayInput` and `DelayTimer`.
    The chip has four states, shown in `States.png`: Live (green), Delayed Ns (blue),
    Reconnecting (amber), No session (grey).
- **Remove `Sidebar.tsx` and `SidenavButton.tsx`.** Delay moves to the Live chip.
  Settings, Schedule and Help move to the top bar. The f1-dash discord, coffee and sponsor
  links are dropped. The credit to f1-dash stays in the Home footer and in the README.
- Tabs: the current 10 tabs in `src/app/dashboard/page.tsx` merge into 6:

  | New tab    | Old tabs it absorbs                       |
  | ---------- | ----------------------------------------- |
  | Live       | Timing                                    |
  | Map        | Map                                       |
  | Messages   | Race Control, Radios, Violations          |
  | Strategy   | Tyres, Lap Times, Speed Traps             |
  | Weather    | Weather                                   |
  | Standings  | Standings                                 |

  Keep the active tab in the URL (`/dashboard?tab=map`) so links like "Open map" and the
  mobile bottom bar can target a tab. The Cloudflare build is a static export
  (`yarn cf:build`), so wrap the `useSearchParams` reader in `<Suspense>`.

### 2.2 Session strip (about 56 px, under the top bar)

From left to right:

- A country code chip (`SessionInfo.Meeting.Country.Code`), the meeting name, and a line with
  the session type, the circuit name and the **local clock** (the existing `SessionInfo` /
  `DelayTimer` logic).
- **Race:** "LAP 3 / 68" in mono, with a thin progress bar (`LapCount`).
  **Qualifying:** a Q-part chip ("Q1", or "SQ1" via `sessionPartPrefix`) and the time left
  from `ExtrapolatedClock`.
  **Practice:** the time left.
- Weather, inline: Track temperature, Air temperature, Humidity, Wind, and a "Dry" or "Rain"
  chip (`WeatherData`). This replaces `WeatherInfo` in the bar.
- On the right, the **track status pill** (`TrackStatus` via `getTrackStatusMessage`). The
  pill and banner colours are clear `flag-clear`, yellow `flag-yellow`, VSC and SC `flag-sc`,
  red `flag-red`, and chequered `fg-1` on `surface-3`.

### 2.3 Track status banner

When the status isn't clear, show a full-width banner under the strip: the message on the
left, "Lap N" on the right, with text in `bg` on the flag colour (`States.png`). The
`useSafetyCarColors` setting controls whether the banner is tinted under SC and VSC. When
it's off, show the banner neutral (`surface-3`).

### 2.4 Global states (`States.png`)

- **Syncing.** This replaces the current "Syncing..." wall in `dashboard/layout.tsx`. Show a
  card with a progress bar ("18 s buffered of 30 s") and two actions: "Go live instead"
  (sets delay to 0) and "Change delay" (opens the delay popover).
- **Reconnecting.** An amber card with "Showing data from N s ago" and a "Retry now" button.
  The `ConnectionStatus` logic drives it.
- **Empty states.** No session: show a countdown to the next session, the Q1/Q2/Q3 lengths,
  and an "Open schedule" button. Also design empty states for "no team radio yet" and "no
  track-limit violations" (`NoSession.tsx` and the panels).

## 3. Live tab: race timing (`Main.png`, `source/Main.dc.html`)

Layout: the classification panel on the left takes about two thirds (`flex: 1 1 840px`). The
right column (`flex: 1 1 500px`) stacks the **Track** panel on top of the **Messages** panel,
and Messages takes all the remaining height. All panels are `surface-1`, with a 1 px
`border` and `radius-panel`.

### 3.1 Classification table

Rows are 30 px high, with 6 px between columns and 10 px of side padding. Rows are zebra
striped with `row-alt`.

Grid (header and rows must use the same string):

```
normal: 24px 48px 40px 30px 72px 64px 76px 76px minmax(0, 1fr) 120px
pace:   24px 48px 40px 30px 72px 64px 76px 76px minmax(150px, 1fr) 280px
```

| Column      | Source                                                                                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P           | Row index after `sortPos`.                                                                                                                                                                                                                    |
| DRIVER      | `DriverTag`, restyled: a 48 px chip with the TLA, `radius-tag`, team colour background, `textOn` text, Geist 12/700.                                                                                                                          |
| +/−         | `GridPos − position` (`DriverInfo` logic): `▲n` in gain or `▼n` in loss. When `TimingStats.Lines[n].PersonalBestLapTime.Position === 1`, show **FL** in `session-best` instead.                                                               |
| <1S         | `DriverProximity`: a 4-bar meter that fills as the interval drops below 1 s.                                                                                                                                                                  |
| GAP         | `GapToLeader`. For P1 show "Leader" in `fg-3`.                                                                                                                                                                                                |
| INT         | `IntervalToPositionAhead.Value`.                                                                                                                                                                                                              |
| LAST        | `LastLapTime.Value`. Purple when `OverallFastest`, green when `PersonalFastest`, otherwise `slower` (yellow, as in the mockups); `fg-3` dash when empty.                                                                                                                                            |
| BEST        | `BestLapTime.Value`. Purple when the driver holds the fastest lap.                                                                                                                                                                            |
| S1 · S2 · S3 | One sub-grid of 3 equal columns. Each cell has the sector time on top (coloured like LAST) and a 3 px mini-sector bar under it with one block per `Segments[]` entry: 2048/2052 slower, 2049 personal best, 2051 session best, 2064 pit, 0 empty (`surface-3`). Use the real segment count; the mockup's 8 per sector is sample data. The bar is hidden when `showMiniSectors` is off. |
| TYRE        | `DriverTireStack`, restyled (§3.2).                                                                                                                                                                                                           |

Row states:

- Fastest-lap holder: `bg-fl-row`, with the row corners rounded at 6 px.
- Retired or stopped: opacity 0.45, and "RET" in the GAP column.
- Favourite drivers: the mockup doesn't style favourites in the table. Keep a quiet marker,
  a 2 px inset left bar in `fg-1`, and raise it in the PR.
- Keep the row-expand link to `/dashboard/driver/[nr]`, shown on hover.

The panel header reads "Classification", then a legend (Session best, Personal best, Slower,
Pit lane, each with a dot), then a **Pace view** toggle button on the right.

### 3.2 Tyre column: same rules as today's `DriverTireStack`

- Up to 3 stints, **newest on the left**. Each stint is a solid compound block reading
  "M 0" (compound letter, a space, then laps on the set via `stintLaps`): `radius-tag`, at
  least 36 px wide, Geist Mono 12/700, text in `bg`. Older stints are at 40% opacity.
- **Pace view** (the toggle in the panel header): each block gets its push-lap average from
  `stintAvgMs` next to it, in `fg-1`, or `—` in `fg-3` when there isn't one. In the race the
  header reads `TYRE · AVG`. Degradation is shown only in practice (§5).
- Unknown compound: a `surface-3` block showing "?".
- The tyre column is 120 px in normal mode and 280 px in pace mode, the same widths as
  qualifying and practice, so the columns line up across sessions.

### 3.3 Track panel (shared by Live race, quali and practice)

- Header: "Track", "Positions estimated from mini-sectors" in `fg-3`, and an "Open map ↗"
  link on the right that goes to `?tab=map`.
- Body: the existing `Map` component in compact mode. Cars stay as the current **TLA in a
  team-colour circle** (`CAR_RADIUS`, `textOn`). Followed drivers get a 2 px `fg-1` ring
  outside the circle, replacing `stroke-sky-400`. Keep the pit-row rendering
  (`garageOrder`, `PIT_SCALE`) exactly as it works today.
- Footer: "Pit lane", then the TLA chips of every driver with `InPit === true`. Retired cars
  show as a "Retired" label. On the right is a "Followed driver" legend (a ring icon).
- No corner numbers in the compact map.

### 3.4 Messages panel (shared by Live race, quali and practice)

- Header: "Messages" and a segmented filter: All N · Radio N · Race control N.
- Items, newest first:
  - **Race control:** a flag icon tile, "Race control", the time, and a lap chip "L3".
    The message text is in `fg-body`. This reuses the `RaceControlMessage` data.
  - **Team radio:** a play button, the driver chip, "Team radio", the time,
    "Auto-transcribed" on the right, a waveform, then the transcript (`useRadioTranscript`;
    hide clips without words via `hasWords`, as today).
- The panel scrolls inside itself. It takes all the space the Track panel leaves.

## 4. Live tab: qualifying (`Quali.png`, `source/Quali.dc.html`)

The same layout as the race: a table on the left, Track and Messages on the right, both built
from the shared components in §3.3 and §3.4.

Grid:

```
24px 48px 72px 80px 80px minmax(0, 1fr) 120px 92px
P    DRIVER GAP BEST LAST  S1·S2·S3     TYRE  STATUS
```

| Column       | Source                                                                                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GAP          | Gap to pole computed from best laps, as `QualiLeaderBoard` does now via `poleMs`. P1 shows "Fastest". A driver with no time shows "No time" in `fg-3`.                                                                                           |
| BEST / LAST  | As in the race.                                                                                                                                                                                                                                  |
| S1–S3        | **This changes from today:** the current-lap sector time is the large value on the left (coloured), and the personal-best sector (`TimingStats.BestSectors[i].Value`) is the small `fg-3` value on the right, with the mini-sector bar underneath. Today it's the other way round. The `showBestSectors` setting hides the PB value. |
| TYRE         | The same stack as the race. The header is `TYRE`.                                                                                                                                                                                               |
| STATUS       | Derived, see below. A 6 px dot plus a label in the status colour, Geist 12/500.                                                                                                                                                                  |

**Status derivation** (feed flags plus inference; the feed has no explicit "push lap"):

| Status   | Rule (evaluate in this order)                                                                                                     | Colour            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| In pit   | `InPit`                                                                                                                           | `pit`             |
| Out lap  | `PitOut`, or any current-lap segment has status 2064                                                                              | `fg-2`            |
| Push lap | Not one of the above, not `KnockedOut` or `Stopped`, and at least one completed current-lap sector has `PersonalFastest` (this is the filter in the unused `src/components/Qualifying.tsx`) | `personal-best` |
| On track | Anything else                                                                                                                     | `fg-3`            |

Put this in a pure function such as `lib/driverStatus.ts` and give it a vitest.

**Knockout zone. This fixes a real bug.** Today `inDangerZone` hardcodes `position > 15` in
Q1 and `> 10` in Q2. In 2026 there are 22 cars and the feed sends
`TimingData.NoEntries = [22, 16, 10]`, so Q1 eliminates P17–P22, not P16–P22. Derive the
cut-off from the feed:

```ts
const advancing = TimingData.NoEntries?.[SessionPart]; // part 1 → 16, part 2 → 10
const inKnockout = advancing != null && position > advancing;
```

Fall back to today's numbers only when `NoEntries` is missing. Draw a "KNOCKOUT" divider
line, in `loss` at 50% opacity with the label in the middle, between P[advancing] and
P[advancing + 1]. Knockout rows get `bg-ko-row` and a `loss` position number. Q3 has no
zone. Drivers who are already `KnockedOut` (out in an earlier part) are dimmed to 0.45.

Above the table there's a small note: "Bottom 6 are knocked out · sector cells show current /
personal best". Compute the number from `NoEntries`.

## 5. Live tab: practice (`Practice.png`, `source/Practice.dc.html`)

**There is no practice branch today.** `src/app/dashboard/page.tsx` only checks
`sessionName.toLowerCase().includes("qualifying")`, so practice renders the race table.
Branch on `SessionInfo.Type`:

- `"Practice"` → the new `PracticeLeaderBoard`
- `"Qualifying"`, or a name containing "qualifying" (this covers Sprint Qualifying) → quali
- everything else, including Sprint → race

Grid:

```
normal: 24px 48px 72px 80px 80px minmax(0, 1fr)    40px 120px 92px
pace:   24px 48px 72px 80px 80px minmax(150px, 1fr) 40px 280px 92px
        P    DRIVER GAP BEST LAST S1·S2·S3          LAPS TYRE STATUS
```

STATUS sits in the same place as in qualifying (the last 92 px column, left-aligned), so the
two tables line up.

- GAP: `TimeDiffToFastest` (or the gap computed from best laps, as in quali).
- LAPS: `NumberOfLaps`.
- TYRE: the same stack. In pace view the header is `TYRE · AVG · DEG` and each block shows
  its average and degradation. Degradation is in s/lap with a sign, e.g. "+0.12", in `loss`
  above +0.15 s/lap and `fg-3` otherwise.
- STATUS: In pit, Out lap and Push lap as in quali, plus **Long run** (`fg-1`), which wins
  over Push lap: the current stint has at least 5 consecutive valid laps (§13.2).

## 6. Map tab (`Map.png`, `MapQuali.png`, `MapPractice.png`)

Three columns at 1440: an order list (about 320 px), the map (flex), and a session-specific
side panel (about 400 px). The race variant has no side panel.

### 6.1 Shared

- The map is the same `Map` component at full size, with the TLA circles, followed-driver
  ring, pit row and pit-lane footer chips from §3.3.
- A "Corner numbers" checkbox in the map header is bound to the `showCornerNumbers` setting.
- Order list header: "Select to follow". **Clicking a row toggles that driver in
  `favoriteDrivers`.** A followed row gets a 1 px `fg-1` outline.

### 6.2 Race

Order list grid `22px 48px 38px minmax(0, 1fr) 80px`: P, DRIVER, +/−, GAP, LAST. **Keep the
+/− column.**

### 6.3 Qualifying: "On a push lap" panel

The order list (`22px 48px minmax(0, 1fr) 76px`: P, DRIVER, GAP, BEST) has the knockout
divider from §4.

The right panel has one row per driver whose status is Push lap:

- Driver chip, plus "P 7 · S1 done" and a progress bar of completed sectors out of 3.
- **Δ OWN PB** = Σ over completed current-lap sectors of (sector time − the driver's own best
  sector). Negative is green, positive yellow, and the session-best holder purple.
- **Δ P16** (the label uses the cut-off position from `NoEntries`) = Σ over the same sectors
  of (sector time − the best sector of the driver currently at the cut-off position). The
  driver who is at the cut-off shows "is P16".
- A **KO** tag when the driver currently sits in the knockout zone.
- Panel footer: "Deltas count completed sectors only, against the driver's best sectors and
  P16's best sectors. Not a lap prediction."
- Header: "On a push lap" with a count, and on the right "Cut-off 1:13.021 · P16" (the best
  lap of the driver at the cut-off). In Q3 the reference becomes P1 ("Δ POLE").
- If nobody is pushing: "No one on a push lap right now".

### 6.4 Practice: "Long runs" panel

The order list (`22px 48px minmax(0, 1fr) 36px`: P, DRIVER, BEST, LAPS).

One row per driver whose current stint qualifies as a long run (§13.2):

- Tyre block, laps in the run, the run's average lap with a bar (the fastest average is
  full width), **Δ best** (versus the fastest long-run average in the field), and **deg**
  in s/lap (`loss` above +0.08, `personal-best` below +0.03).
- Footer: "Laps slower than 107% of the driver's best are left out. Fuel loads aren't
  published, so compare with care."

## 7. Messages tab (`Messages.png`, `source/Messages.dc.html`)

Two columns.

**Feed (left).** The header has "Feed", a segmented control (All · Radio · Race control
with counts), an "All drivers" filter (`SelectMultiple`), and on the right the "Chime on new
race control message" checkbox, bound to `raceControlChime`. Each item has the time in a mono
gutter on the left, then:

- Race control: the flag tile, "Race control", a lap chip, a status tag ("Incident ·
  noted", "Under investigation", "Penalty", "No further action", parsed from the message
  text), and the message.
- Team radio: play/pause, the driver chip, "Team radio", a waveform and the duration, then
  the transcript and "Auto-transcribed — may contain mistakes". A clip without a transcript
  yet shows a "Show transcript" button that triggers the fetch.
  - The **waveform is decorative**, because the feed carries no amplitude data. Draw about
    48 bars with heights from a hash of the clip path, so each clip always looks the same.
    The bars already played are in `fg-1` and the rest in `fg-3`. The duration comes from
    the audio element's `loadedmetadata`.

**Right column:**

- **Incidents:** race-control messages that mention cars in an incident, each with the
  involved driver chips, a short summary and the status tag. A legend shows the status
  colours (Noted grey, Under investigation `slower`, Penalty `loss`, No further action
  green).
- **Track limits:** the `TrackViolations` counting logic, with one row per driver showing 4
  segments (deleted laps filled: 1–2 in `slower`, 3 in `loss`), and on the right "2 of 3",
  or "Black & white flag" in `loss` at 3.

## 8. Strategy tab (`Strategy.png`)

Three sections that replace three old tabs. The logic of the existing pages stays the same;
only the presentation changes.

- **Tyre strategy** (left, about 60%): one row per driver, P / DRIVER / STINTS BY LAP / NOW ·
  STOPS. Stint bars use the compound colours on a lap axis, with a white "now" marker.
  "Laps so far" / "Full race" is a segmented control that changes the axis range. Reuses
  `tyre-strategy/page.tsx` logic.
- **Lap times** (right, top): compare up to 5 drivers (chips plus an "Edit" button that opens
  `SelectMultiple`). A table of LAP × driver with times coloured purple, green or default.
  Reuses `lap-times/page.tsx` and `useHistoryStore`.
- **Speed traps** (right, bottom): I1 · I2 · FL · ST, top 5 each, with a bar per row and units
  from `speedUnit`. An empty trap says "No readings yet this session". A "Full table" link
  opens the full ranking. Reuses `speed-traps/page.tsx`.

## 9. Weather tab (`Weather.png`)

The existing RainViewer map (`weather/map.tsx`, `map-timeline.tsx`) goes in a large panel,
with a 13-frame timeline below it (past frames solid, forecast frames dashed, "now" marked).
On the right is a **Conditions** card (track and air temperature, humidity, pressure, wind
speed and direction, rainfall), then a data note saying where the radar comes from and that
it's an estimate.

## 10. Standings tab (`Standings.png`): "fill" style

Keep the existing logic in `standings/page.tsx` and `lib/standings.ts`.

- A segmented control: **Live projection** (`predictStandings` or the feed's
  `ChampionshipPrediction`) / **Before this race** (the base standings).
- Drivers table and Constructors table. Each row's **background is the bar**:

  ```css
  background:
    linear-gradient(90deg,
      rgb(<team> / .16) 0 <base%>,
      rgb(<team> / .38) <base%> <total%>,
      transparent <total%> 100%),
    <row bg: surface-1 or row-alt>;
  ```

  `base%` is the points before the race as a share of the leader's projected points, and
  `total%` is the projected points as a share of the same. There's no separate bar element.
- Columns: P, a position change since before the race (▲/▼), the driver chip and full name
  (team name for constructors), PTS, **GAP** (to the leader: "Leader", "−25"), and **+RACE**
  (points gained in this session, in `gain`).
- In "Before this race" mode the darker segment is gone and +RACE is hidden.

## 11. Mobile (< 768 px)

Screens: `Mobile.png` (race), `QualiMobile.png`, `PracticeMobile.png`, `MapMobile.png`,
`MessagesMobile.png`, `StrategyMobile.png`, `StandingsMobile.png`, `MoreMobile.png`. Read the
teal sticky note in the canvas for the rules. In short:

- Header (48 px): logo, meeting name, session and clock on a second line, and the Live chip.
- Status row (44 px): lap or clock, track status pill. It's always visible.
- **Bottom bar** (60 px, `bg-nav`): Live · Map · Messages · Strategy · More. Same icons as
  desktop.
- **More** opens a bottom sheet: Weather (one-line summary), Standings ("ANT leads on 131 if
  it ends now"), Schedule, Settings, Help, the broadcast-delay stepper, and a footer.
- Tables keep only the columns that fit 390 px. Rows are 26 px, zebra `row-alt-mobile`.
  Grids:
  - Race: `20px 40px 30px minmax(0, 1fr) 70px 62px` (P, DRIVER, +/−, GAP, LAST, TYRE)
  - Quali: `20px 40px minmax(0, 1fr) 70px 54px` (P, DRIVER, GAP, BEST, STATUS), plus a
    "N on push laps · Cut-off" strip that links to the Map tab
  - Practice: `20px 40px minmax(0, 1fr) 28px 44px 62px`, with a Timing / Long runs segment
  - Standings: `20px 12px minmax(0, 1fr) 44px 36px 34px`
- Tapping a row opens the driver detail (sectors, stints).
- Strategy on mobile has three sub-tabs (Tyres / Lap times / Speed traps).
- Touch targets are at least 44 px.

## 12. Data the feed doesn't have (don't build these)

- **Garage / "in garage" status.** Only `InPit` and `PitOut` exist. `lib/garageOrder.ts`
  only orders the pit row on the map.
- **Lap-time predictions or projected positions** for push laps. The push-lap deltas in §6.3
  are sums over completed sectors only, and the UI says so.
- **True car positions.** The map is estimated from mini-sectors (`useTrackAnimation`).
  Every map surface says "estimated".
- **Fuel loads.** Long-run comparisons carry the note in §6.4.
- **Radio waveforms.** They're decorative (§7).
- **Car telemetry** (speed, throttle, gear) depends on CarData. Keep the existing
  `carMetrics` toggle with the hint "Needs an F1 TV feed". Don't design new surfaces for it.

## 13. New derived logic (each gets unit tests)

1. **Driver status** (`In pit` / `Out lap` / `Push lap` / `Long run` / `On track`) per §4 and
   §5. It's a pure function of `TimingDataDriver`, the stints and the lap history.
2. **Long-run detection (practice).** In the current stint, a lap is *valid* when it isn't
   the stint's first lap (out lap), isn't an in lap, and its time is ≤ 107% of the driver's
   best lap this session. This filter is needed because `classifyLap` in `lib/stints.ts`
   counts cool-down laps as push laps. A long run is at least 5 consecutive valid laps.
   Average and degradation are computed over the valid laps only. Prefer a least-squares
   slope for degradation over the current (last − first)/(n − 1).
3. **Knockout cut-off** from `NoEntries` (§4).
4. **Push-lap deltas** (§6.3).
5. **Session type** routing (§5).

Fixtures: use the recorded sessions in the repo root (`canada-2026-qualifying.jsonl`,
`australia-2026-qualifying.jsonl`, `canada-2026-race.jsonl`). Dev replay (`/dashboard?dev=1`)
reads them through `dashboard/dev-sessions/manifest.json`. There is **no practice
recording**: the overlay lists "Practice" as `available: false` in
`components/dev/ReplayOverlay.tsx`. Before working on §5 and §6.4:

1. Download one: run `python3 download_session.py --list`, then for example
   `python3 download_session.py "2026/<meeting>/<date>_Practice_2/" <name>-2026-fp2.jsonl`.
   The script fetches from livetiming.formula1.com, so it needs network access.
2. Add it to `manifest.json` as `{ "id": "practice", "format": "signalr-raw", ... }`, and
   flip `available` to `true` in `ReplayOverlay.tsx`.
3. If the download isn't possible, the manifest supports a `patch` that fakes the session
   type over a qualifying recording. That is enough for layout work but not for long-run
   logic, so say so in the PR.

## 14. Pages outside the dashboard

- **Home** (`app/(nav)/page.tsx`, `Home.png`): a hero with a "weekend status" pill (next
  session countdown from the schedule), a live preview card (static sample is fine), 4
  feature cards, a "Good to know" strip, and a footer with the credit "Fork of f1-dash", the
  version and the F1 trademark notice.
- **Schedule** (`Schedule.png`): a responsive grid of rounds,
  `repeat(auto-fill, minmax(min(100%, 460px), 1fr))`, with the next round highlighted. Each
  card's link reads "Open dashboard".
- **Help** (`Help.png`): a left "On this page" nav, plus sections for the timing table
  columns, colours, tyres, track status, syncing with TV, and "What the data can't do". The
  same content backs the Help modal in the top bar, replacing `RaceHelpModal` and
  `QualiHelpModal`.
- **Settings** (`Settings.png`): switch rows with a label and a hint. The toggles are car
  metrics, corner numbers, table headers, best sectors, mini-sectors and safety car colours,
  plus the race control chime with its volume. Then favourite drivers as a grid of TLA
  chips, units (km/h / mph segmented), and the delay stepper. **Remove the OLED toggle.**
  Note: `useSafetyCarColors` and `showBestSectors` exist in the store, but nothing reads them
  today. This redesign wires them up (§2.3 and §4).

## 15. Out of scope

- The **grouped-callout map** (`MapCallouts.png`) is parked. The implementation notes are on
  the blue sticky note in the canvas. Don't build it.
- Light theme, and new telemetry views.
- Restyling `/dashboard/driver/[nr]` beyond swapping in tokens.

## 16. Done means

- `yarn build`, `yarn lint` and `yarn test` pass (CI runs the same).
- Each screen matches its PNG at 1440 × 900 (desktop) or 390 × 844 (mobile), with real data
  from a replay (`/dashboard?dev=1`).
- The Live tab shows all 22 cars at 1440 × 900 without scrolling, for race, quali and
  practice.
- Header and row grids use the same string (no drifting columns), and STATUS lines up between
  quali and practice.
- Keyboard: tabs, toggles and rows are reachable with Tab and have visible focus rings. Every
  icon-only button has an `aria-label`. Colour is never the only signal (statuses have text,
  flags have words).
