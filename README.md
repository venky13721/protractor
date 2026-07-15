# 📐 PROTRACTOR

**How well do you *really* know your angles?**

A fast, flashy angle-guessing game. Each round you're given a number — say **270°** — and all you get is two arrows around a shared vertex. No ticks, no numbers, no protractor. Drag the **orange** arrow until the angle between it and the **blue** arrow *feels* right, before the timer runs out.

## How it works

- **5 rounds**, timer depends on difficulty (see modes below)
- The target angle is measured **counter-clockwise** from the blue arrow to your orange arrow (so reflex angles like 270° are in play)
- Each round scores up to **10.00** points; an exact guess is a perfect 10.00 and the score decays exponentially, reaching **0 at 90° off** (see scoring below)
- Get a final rank, from **Blindfolded Builder** all the way to **Protractor Prodigy**

## Tech

- [React 19](https://react.dev) + [Vite](https://vite.dev)
- [GSAP](https://gsap.com) for screen transitions, arc reveals, count-ups, aurora drift and confetti physics
- Components inspired by [reactbits.dev](https://reactbits.dev): Aurora background, Shiny Text, Click Spark, Count Up
- Sound effects synthesized live with the **Web Audio API**; difficulty voices are short audio clips in `public/voice/`

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

## Deploy to Vercel

The repo ships a `vercel.json` that pins the framework to **Vite** (build command `npm run build`, output `dist`). Import the repo on [vercel.com](https://vercel.com) and deploy.

---

# Roadmap

## Phase 1 — Gameplay & UX (shipped)

Everything in Phase 1 is client-side. The tunable knobs live at the top of
[`src/logic.js`](src/logic.js) so you can change them and redeploy.

- **Menu toggles** — two compact segmented controls: **PLAYERS** (SINGLE skips the
  leaderboard flow and ends on Play Again; MULTI adds the name → leaderboard → challenge
  flow, and is auto-selected when opening a challenge link) and **DIFFICULTY**.
- **Difficulty modes** — a robotic voice announces the mode on switch:
  - **EASY** — the blue arrow is pinned to the +x axis (a fixed frame of reference); same timer.
  - **HARD** — the classic game: the dial spins to a random orientation every round.
  - **ULTRA** — Hard, but with a shorter timer.
- **Rebalanced scoring** — exactly `10.00` for a perfect guess, exponential decay, and exactly `0` once you're ≥ 90° off. Tunable via `SCORE_ZERO_DEG` / `SCORE_DECAY`.
- **Pause on tab/app switch** — the countdown freezes when the tab is backgrounded (`visibilitychange`) and resumes where it left off, with a `PAUSED` overlay. No more losing a round to a notification.
- **Readable timer** — the seconds readout moved out from under the ring into its own pill below the dial.
- **Gentler drag ticks** — the drag "tick" is now a soft low tone, fired on a wider notch (10°) with a time throttle so fast drags don't machine-gun.
- **Mobile glow fix** — the dial face is clipped (`border-radius:50%; overflow:hidden`) so the arrow glow can't bleed over the UI above it.
- **Colorblind-safe palette** — azure blue (fixed arrow) vs vivid orange (your arrow), a pair
  that stays distinguishable under protanopia, deuteranopia and tritanopia; the reveal target
  is white. The arrows also differ by shape (hollow vs solid head), so color is never the
  only cue. Gold survives as a decorative accent (ranks, confetti).
- **Live menu demo** — the landing page plays a small self-running demo dial (names an
  angle, sweeps, reveals) instead of a pre-rendered GIF, so it always matches the current
  palette.

### Tunable constants (`src/logic.js`)

```js
export const MODES = {
  easy:  { id:'easy',  label:'EASY',  time: 7, fixedBase: true,  voice:'/voice/easy.mp3'  },
  hard:  { id:'hard',  label:'HARD',  time: 7, fixedBase: false, voice:'/voice/hard.mp3'  },
  ultra: { id:'ultra', label:'ULTRA', time: 5, fixedBase: false, voice:'/voice/ultra.mp3' },
}
export const DEFAULT_MODE = 'hard'

export const COLORS = { fixed:'#3DA9FF', you:'#FF9F1C', target:'#FFFFFF', /* … */ }

export const SCORE_MAX = 10      // perfect-round score
export const SCORE_ZERO_DEG = 90 // error (deg) at/after which a round scores 0
export const SCORE_DECAY = 20    // exponential steepness
```

Change `time`, `fixedBase`, colors, or the scoring constants and redeploy — no other edits needed.

### Mode voices

The mode-announce clips are robotic TTS generated with Higgsfield (deep male voice,
"Sterling"). `MODES[].voice` in `src/logic.js` currently points at the hosted Higgsfield
CDN URLs so they work out of the box. To self-host them for permanence, run
`bash public/voice/fetch-voices.sh` (downloads `easy/hard/ultra.mp3` into `public/voice/`)
and switch each `voice` to its local path (e.g. `/voice/hard.mp3`). `playVoice()` in
`src/audio.js` fails silently if a clip can't load, so the game always runs regardless.

## Phase 2 — Multiplayer challenge + leaderboard (shipped)

After a game you can share a URL that challenges a friend to the **exact same
angles**, and everyone's scores rank on a per-challenge leaderboard screen.
Runs entirely on Vercel.

### Shareable challenge via a seeded URL (no DB needed to replay)

- Every game derives from a 32-bit seed through a `mulberry32` PRNG in
  [`src/logic.js`](src/logic.js): `gamePlan(seed, mode)` deterministically produces all
  5 targets, dial orientations and arrow start positions.
- The leaderboard screen has a **"⚔️ Challenge a friend"** button that copies a link
  like `https://<app>/?c=<seed>&m=hard`. Opening it shows a challenge banner on the
  menu and replays the identical game in the same mode. The challenge itself needs
  **no backend** — the seed is the whole game.
- Switching difficulty on the menu abandons the challenge (seeds are mode-specific).

### Leaderboard via Vercel serverless + Upstash Redis

Serverless functions live under [`/api`](api/) and talk to
[Upstash Redis](https://upstash.com) over its REST API with plain `fetch` — zero npm
dependencies.

- `POST /api/score` — body `{ seed, mode, name, total }` → `ZADD GT lb:<seed>:<mode>`
  (best score per name wins), returns the top 25 + your rank.
- `GET /api/leaderboard?seed=&mode=` — top 25 for one challenge board.
- Boards auto-expire after 90 days of inactivity.

```
  Finish game ──► enter name ──► POST /api/score ──► Upstash Redis (sorted set per seed+mode)
       │                                                     ▲
       └──► "Challenge a friend" (?c=seed&m=mode) ───────────┘  friend replays same seed, submits, ranks
                                            │
                    GET /api/leaderboard?seed=&mode=  ──► leaderboard screen (top 25, medals, your rank)
```

**Setup (one-time):** add an Upstash Redis/KV resource to the Vercel project (Vercel
Marketplace → Upstash). The functions accept either env-var naming the integration
uses — classic `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` or Marketplace KV
`KV_REST_API_URL`/`KV_REST_API_TOKEN` — no extra dependencies. Redeploy once after
connecting so the functions pick the vars up.

**Graceful fallback:** without the env vars (or when running `vite dev`/`vite preview`,
which don't serve `/api`), the leaderboard falls back to a per-device board in
`localStorage` and labels itself "this device only", so the game is never blocked on
the backend.

**Anti-cheat:** casual — scores are client-submitted but server-validated (seed format,
mode whitelist, 0–50 score clamp, name length). A later hardening step could sign the
results payload with an HMAC and verify before `ZADD`.
