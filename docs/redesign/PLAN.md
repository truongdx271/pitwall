# Pitwall redesign: build plan

Twelve small PRs, in order. Each one leaves the dashboard working, so it can ship on its own.
Tick the boxes as you go and note anything you deferred under the PR.

**For every PR:**

- Branch from `main` (`develop` is behind `main` in this repo). Use conventional commits.
- Format only the files you touched (`./node_modules/.bin/prettier --write <files>`), then
  run `yarn lint`, `yarn test` and `yarn build` in `dashboard/`.
- Run the repo's agents: `f1-verify` (the gate), `f1-review` (project traps), and
  `f1-pr-audit` before opening the PR. Those agents compare against `origin/develop`; use
  `origin/main` instead.
- Visual check: run `yarn dev`, open `/dashboard?dev=1`, pick the replay for the session
  type you changed, take a 1440 × 900 screenshot (390 × 844 for mobile work), and compare
  it with the matching file in `docs/redesign/screens/`. Put the screenshot in the PR
  description.
- Spec sections are in `SPEC.md`. If the spec and a PNG disagree, the spec wins on
  behaviour and data, and the PNG wins on look.

---

## PR 1 · Fix the qualifying knockout zone (SPEC §4)

A small bug fix, independent of the redesign.

- [x] Add a helper (e.g. `lib/knockout.ts`) that derives the cut-off from
      `TimingData.NoEntries[SessionPart]`, with today's 15/10 as a fallback.
- [x] Use it in `Driver.tsx`, `track-map/page.tsx` and the quali board in place of the
      hardcoded `inDangerZone`.
- [x] Vitest: `[22, 16, 10]` gives P17+ in Q1, P11+ in Q2 and nothing in Q3. A missing
      `NoEntries` falls back.

Notes: a part whose `NoEntries` entry is 0 also falls back (Australia 2026 sends `[0, 0, 0]`
before the real counts). The unused `Qualifying.tsx` still hardcodes 15/10 for its comparison
driver; it goes away in the final pass.

**Done when** the Canada 2026 quali replay shows P17–P22 in the danger zone during Q1.

## PR 2 · Tokens and primitives (SPEC §1)

- [x] Paste `tokens.css` into `src/styles/globals.css`.
- [x] Restyle the primitives in `components/ui/` to the tokens: `SegmentedControls`,
      `Toggle` (switch: green track when on), `Button`, `Modal`, `Select`, `SelectMultiple`,
      `Input`, `Slider`.
- [x] Add a `Panel` (surface-1, border, radius-panel, header slot), a `StatusDot`, and a
      `DriverChip` (restyled `DriverTag`: 48 px, team colour, `textOn`).
- [x] Restyle `DriverTireStack` to SPEC §3.2. The logic doesn't change.
- [x] Remove the OLED mode: the setting, the toggle, and `OledModeProvider`. The body
      background becomes `bg-bg`.

**Done when** every existing screen still renders, on the new colours, with no stray `zinc`
classes in the files you touched.

Notes: `DriverTag` now renders `DriverChip`; the gap is 4 px so the chip fits the old `7ch`
column until PR 4 rebuilds the grid. The switch's off track is `#2A3039` from
`Settings.dc.html` (not a token). `.prettierrc.yaml` points the Tailwind plugin at
`globals.css` so token classes sort like built-in ones.

## PR 3 · App shell (SPEC §2)

- [ ] `TopBar` with the 6 icon tabs, the Live chip and delay popover, Schedule, Help and
      Settings.
- [ ] Tab state in `?tab=` (inside `<Suspense>`). Merge the 10 tabs into 6. Until their PRs
      land, Messages and Strategy can render the old components stacked.
- [ ] `SessionStrip` with lap or clock and inline weather, plus the track status pill and the
      `TrackStatusBanner`.
- [ ] Delete `Sidebar.tsx` and `SidenavButton.tsx`, and move their contents.
- [ ] Syncing, Reconnecting and No session states (`States.png`).

**Done when** it matches the top two bands of `Main.png`, and the banner shows for each
track status during the race replay.

## PR 4 · Live: race table and shared side panels (SPEC §3)

- [ ] The classification table with the exact grid strings. The header and rows share one
      constant.
- [ ] Mini-sector bars use the real segment count.
- [ ] Pace view toggle (TYRE · AVG).
- [ ] `TrackPanel` (compact map, pit-lane footer, followed ring) and `MessagesPanel`
      (filter, RC items, radio items). Both are shared components.
- [ ] Layout: table on the left, Track and Messages on the right. Messages fills the
      remaining height.

**Done when** the race replay at 1440 × 900 shows all 22 rows with no scroll and matches
`Main.png`.

## PR 5 · Live: qualifying (SPEC §4)

- [ ] `lib/driverStatus.ts` with vitest (In pit / Out lap / Push lap / On track).
- [ ] The quali table on the new grid, with sector cells showing current big and PB small.
- [ ] The KNOCKOUT divider, KO rows and the note above the table.
- [ ] Reuse `TrackPanel` and `MessagesPanel` unchanged.

**Done when** it matches `Quali.png` on the quali replay, and STATUS changes as cars leave
the pits and start a lap.

## PR 6 · Live: practice (SPEC §5, §13.2)

- [ ] Add a practice recording to `dev-sessions/manifest.json` (SPEC §13).
- [ ] Route by `SessionInfo.Type` in `dashboard/page.tsx`.
- [ ] `lib/longRun.ts` with vitest (107% filter, at least 5 consecutive laps, average,
      least-squares degradation).
- [ ] `PracticeLeaderBoard`: LAPS column, pace view TYRE · AVG · DEG, STATUS including Long
      run. STATUS lines up with quali.

**Done when** it matches `Practice.png` on the practice replay.

## PR 7 · Map tab (SPEC §6)

- [ ] Three-column layout. Clicking a row toggles `favoriteDrivers`. The corner-numbers
      checkbox is bound to the setting.
- [ ] Race order list with +/−.
- [ ] Quali "On a push lap" panel (Δ OWN PB, Δ cut-off, KO tag, footer note), with vitest
      for the delta sums.
- [ ] Practice "Long runs" panel.

**Done when** it matches `Map.png`, `MapQuali.png` and `MapPractice.png` on the three
replays.

## PR 8 · Messages tab (SPEC §7)

- [ ] Feed with the segment filter, driver filter and chime checkbox.
- [ ] Radio items: play/pause, hashed decorative waveform, duration, transcript or "Show
      transcript".
- [ ] RC status tags parsed from the text (vitest on real message strings from the replays).
- [ ] Incidents and Track limits panels.

**Done when** it matches `Messages.png`.

## PR 9 · Strategy tab (SPEC §8)

- [ ] Tyre strategy chart with the Laps so far / Full race axis.
- [ ] Lap times compare (5 drivers).
- [ ] Speed traps top 5, with an empty state.

**Done when** it matches `Strategy.png`.

## PR 10 · Weather and Standings (SPEC §9, §10)

- [ ] Weather: map panel, timeline, Conditions card.
- [ ] Standings: Live projection / Before this race, fill-style rows, GAP and +RACE.

**Done when** it matches `Weather.png` and `Standings.png`.

## PR 11 · Home, Schedule, Help, Settings (SPEC §14)

- [ ] The four pages restyled.
- [ ] One Help content source, used by both `/help` and the top-bar modal. Delete
      `RaceHelpModal` and `QualiHelpModal`.

**Done when** they match `Home.png`, `Schedule.png`, `Help.png` and `Settings.png`.

## PR 12 · Mobile (SPEC §11)

- [ ] Mobile header, status row and bottom bar. The More sheet.
- [ ] Mobile tables for race, quali, practice and standings. Tapping a row opens the driver
      detail.
- [ ] Mobile Map, Messages and Strategy (with sub-tabs).
- [ ] Touch targets of at least 44 px.

**Done when** it matches the eight `*Mobile.png` screens at 390 × 844.

## After PR 12 · Final pass

- [ ] Accessibility (SPEC §16): keyboard, focus rings, aria-labels, colour plus text.
- [ ] No horizontal scroll on the Live tab at 1280 px.
- [ ] Remove dead code: the unused `Qualifying.tsx` and `QualifyingDriver.tsx` once their
      logic has moved, plus the old tab pages if they're fully absorbed.
