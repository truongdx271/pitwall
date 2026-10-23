# Pitwall redesign handoff

Everything an implementer (human or Claude Code) needs to build the new dashboard UI.

| File / folder | What it is                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------- |
| `SPEC.md`     | The build spec: layout, columns, where each value comes from, derived logic, what's out of scope. |
| `PLAN.md`     | Twelve PRs in order, each with checkboxes and a "done when".                                 |
| `PROMPT.md`   | Prompts to paste into Claude Code.                                                           |
| `tokens.css`  | The `@theme` block for `dashboard/src/styles/globals.css`.                                   |
| `screens/`    | A PNG of every artboard (desktop 1440 × 900 or taller, mobile 390 × 844 at 2×).             |
| `source/`     | The design source of each artboard (`*.dc.html`) and the canvas layout (`canvas.json`).     |

## Screens

| Area        | Desktop                                                     | Mobile                                     |
| ----------- | ----------------------------------------------------------- | ------------------------------------------ |
| Live        | `Main.png` (race), `Quali.png`, `Practice.png`              | `Mobile.png`, `QualiMobile.png`, `PracticeMobile.png` |
| Map         | `Map.png` (race), `MapQuali.png`, `MapPractice.png`         | `MapMobile.png`                            |
| Messages    | `Messages.png`                                              | `MessagesMobile.png`                       |
| Strategy    | `Strategy.png`                                              | `StrategyMobile.png`                       |
| Weather     | `Weather.png`                                               | in the More sheet                          |
| Standings   | `Standings.png`                                             | `StandingsMobile.png`                      |
| Other pages | `Home.png`, `Schedule.png`, `Help.png`, `Settings.png`      | More sheet: `MoreMobile.png`               |
| System      | `States.png` (flags, sync, empty states), `Tokens.png`      |                                            |
| Parked      | `MapCallouts.png`: **don't build**                          |                                            |

## About `source/`

The `.dc.html` files are the design tool's format. They load a `support.js` runtime that
isn't in the repo, so they won't render if you open them directly. Read them as text: the
markup carries the exact inline styles, and the `renderVals()` script at the bottom holds
the sample data and the small formulas behind it (status mapping, delta sums, bar widths).
The sample values are made up. Take sizes and colours from these files, never data.

The live, clickable canvas is the Design artifact in Truong's claude.ai account. It's private
unless he shares it.

## Decisions already made

- Hybrid style: mono numbers, sans chrome. Dark only. Desktop first, mobile secondary.
- 6 tabs with icons: Live, Map, Messages, Strategy, Weather, Standings.
- The tyre column keeps today's `DriverTireStack` rules (3 stints, newest left, older ones
  dimmed, pace view).
- Map cars stay as TLA-in-a-circle. Grouped callouts are parked.
- Push laps and long runs live only in the Map tab. The Live tab's side column is Track
  plus Messages in every session.
- Standings use the "fill" row style with a GAP column.
- The Status column lines up between qualifying and practice.
