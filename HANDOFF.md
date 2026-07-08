# Handoff — PROTRACTOR

Status snapshot for picking this project back up.

## What this is

A full rebuild of the "protractor" repo into a polished angle-guessing
game. Each round names a target angle (e.g. 270°); the player is shown
only two unmarked arrows around a shared vertex and must drag one until
the gap between them *feels* right — no ticks, no numbers, no frame of
reference. 5 rounds, 7 seconds each, scored 0–10.00 per round by how
close the guess is.

## Current state

- **Stack**: Vite + React 19 (not Next.js — the original app was
  scrapped entirely). GSAP for animation, Web Audio API for all sound
  (no audio files).
- **Game code**: merged into `main` via PR #3.
- **Deploy fix**: PR #4 (`claude/protractor-game-3tlnu0` → `main`),
  open at the time of writing — adds `vercel.json` pinning
  `"framework": "vite"`. See "Vercel deploy issue" below for why this
  was needed.
- Working tree is clean; the feature branch is rebased on top of the
  current `main` and pushed.

## Key files

| File | Purpose |
|---|---|
| `src/App.jsx` | Game state machine: menu → intro → play → reveal → results |
| `src/logic.js` | Pure scoring logic — target generation, angular error, `roundScore`, rank titles |
| `src/audio.js` | Synthesized SFX via Web Audio (`sfx.click()`, `sfx.reveal(score)`, `sfx.fanfare()`, etc.) |
| `src/components/AngleDial.jsx` | The core SVG dial: drag-to-guess, timer ring, reveal arcs |
| `src/components/Aurora.jsx`, `ShinyText.jsx`, `ClickSpark.jsx`, `CountUp.jsx`, `Confetti.jsx` | reactbits.dev-inspired visual flourishes, GSAP-driven |
| `vercel.json` | Pins Vercel's framework preset to Vite (see below) |

## Scoring logic (src/logic.js)

- `angularError(target, guess)` — shortest circular distance, 0–180°.
- `roundScore(target, guess)` = `10 · e^(−error/22)`, rounded to 2
  decimals; error ≤ 1° scores a flat 10.00.
- Final rank (`rankFor(total)`) buckets the 0–50 total into six named
  ranks from "Blindfolded Builder" to "Protractor Prodigy".

## Vercel deploy issue (resolved in PR #4)

The Vercel project was originally created against the old Next.js app.
Its **Framework Preset is still "Next.js"** in the dashboard. After the
Vite rewrite replaced `package.json` (no `next` dependency), deploys
failed with:

> No Next.js version detected...

`vercel.json` with `"framework": "vite"` overrides the dashboard
preset and should fix this once merged — **but only if**:

- **Root Directory** (Vercel → Settings → General) is empty / `./`
  (a subdirectory setting would mean `vercel.json` at repo root is
  never read).
- The redeploy doesn't reuse a **cached** failed build — uncheck "Use
  existing Build Cache" on the first redeploy after merging.

If it still fails after merge + those checks, the fallback is to
manually change the Framework Preset dropdown in the Vercel dashboard
from "Next.js" to "Vite" — that has the same effect and removes any
ambiguity about whether `vercel.json` is being read.

## Verification already done

- `npm run build` produces a clean production bundle (`dist/`).
- Full Playwright run through all 5 rounds (drag-to-guess + timeout
  path), confirmed scoring math, reveal arcs, results screen, and
  "Play Again" reset — desktop (1280×800) and mobile (390×780)
  viewports, no console errors.

## Open threads / next steps

- **PR #4** (vercel.json fix) needs merging into `main` for production
  to actually pick up the game. Not subscribed to PR activity
  currently — re-subscribe with `subscribe_pr_activity` if you want
  CI/review events pushed into a session automatically.
- No automated tests beyond the manual Playwright smoke run above; if
  this project grows, consider adding a lightweight test for
  `roundScore`/`angularError` in `src/logic.js` since that's the one
  place a regression would be easy to miss silently.
