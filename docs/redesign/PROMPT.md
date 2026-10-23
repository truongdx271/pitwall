# Prompts for Claude Code

Paste these into Claude Code from the repo root.

## Kickoff (first session)

```
We're implementing the dashboard redesign in docs/redesign/.

Read docs/redesign/README.md, SPEC.md and PLAN.md first, and look at the PNGs in
docs/redesign/screens/ that relate to the PR you're on (you can open images). The exact
styles for each screen are in docs/redesign/source/<Screen>.dc.html. Use them for sizes,
spacing and colours, but never copy their sample data or team colours.

Start with PR 1 in PLAN.md. Work on a branch off main. Follow the "For every PR" checklist
in PLAN.md: lint, test, build, then run the f1-verify, f1-review and f1-pr-audit agents
(use origin/main as the base, not origin/develop), and take a 1440×900 screenshot of the
replay (/dashboard?dev=1) to compare with the reference PNG.

Rules:
- Frontend only (dashboard/). Don't touch the Rust services.
- If something in the spec needs data the feed doesn't have (SPEC §12), or the spec and
  the code disagree, stop and ask me rather than guessing.
- When the PR is ready, tick its boxes in PLAN.md, push, and open the PR against main
  with the screenshot in the description. Then stop and wait for my review before
  starting the next PR.
```

## Each following session

```
Continue the redesign: next unticked PR in docs/redesign/PLAN.md. Same rules as before
(SPEC.md, screens/, source/, checklist, stop after opening the PR).
```

## Fixing review comments

```
Address the review comments on PR #<n>. Keep the change inside that PR's scope, re-run
the checklist, and push to the same branch.
```

## Tips

- One PR per session keeps the context small. Start a fresh session for each PR.
- PR 1 (the knockout bug) and PR 2 (tokens) are low risk and a good test of how the agent
  follows the spec. Review them closely before letting it go further.
- PR 6 needs a practice recording. If the session can't reach livetiming.formula1.com,
  download it yourself (`python3 download_session.py --list`) and commit it first.
