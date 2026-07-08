# 📐 PROTRACTOR

**How well do you *really* know your angles?**

A fast, flashy angle-guessing game. Each round you're given a number — say **270°** — and all you get is two arrows around a shared vertex. No ticks, no numbers, no protractor. Drag the **yellow** arrow until the angle between it and the **green** arrow *feels* right, before the timer runs out.

## How it works

- **5 rounds**, timer depends on difficulty (see modes below)
- The target angle is measured **counter-clockwise** from the green arrow to your yellow arrow (so reflex angles like 270° are in play)
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

- **Difficulty modes** — pick on the menu; a robotic voice announces the mode on switch:
  - **EASY** — the green arrow is pinned to the +x axis (a fixed frame of reference); same timer.
  - **HARD** — the classic game: the dial spins to a random orientation every round.
  - **ULTRA** — Hard, but with a shorter timer.
- **Rebalanced scoring** — exactly `10.00` for a perfect guess, exponential decay, and exactly `0` once you're ≥ 90° off. Tunable via `SCORE_ZERO_DEG` / `SCORE_DECAY`.
- **Pause on tab/app switch** — the countdown freezes when the tab is backgrounded (`visibilitychange`) and resumes where it left off, with a `PAUSED` overlay. No more losing a round to a notification.
- **Readable timer** — the seconds readout moved out from under the ring into its own pill below the dial.
- **Gentler drag ticks** — the drag "tick" is now a soft low tone, fired on a wider notch (10°) with a time throttle so fast drags don't machine-gun.
- **Mobile glow fix** — the dial face is clipped (`border-radius:50%; overflow:hidden`) so the arrow glow can't bleed over the UI above it.
- **Neon reskin** — neon green (fixed arrow) + neon yellow (your arrow), gold target kept for contrast.

### Tunable constants (`src/logic.js`)

```js
export const MODES = {
  easy:  { id:'easy',  label:'EASY',  time: 7, fixedBase: true,  voice:'/voice/easy.mp3'  },
  hard:  { id:'hard',  label:'HARD',  time: 7, fixedBase: false, voice:'/voice/hard.mp3'  },
  ultra: { id:'ultra', label:'ULTRA', time: 5, fixedBase: false, voice:'/voice/ultra.mp3' },
}
export const DEFAULT_MODE = 'hard'

export const COLORS = { green:'#39FF14', yellow:'#F2FF1A', gold:'#ffd166', /* … */ }

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

## Phase 2 — Multiplayer challenge + leaderboard (planned)

Goal: after a game, share a URL that challenges a friend to the **exact same angles**,
and rank scores on a leaderboard. Designed to run entirely on Vercel.

### Shareable challenge via a seeded URL (no DB needed to replay)

- Add a small seeded PRNG (e.g. `mulberry32`) to `logic.js`. `newTargets(seed)` and the
  per-round base orientations derive **deterministically** from the seed, so the same
  seed always reproduces the same 5 angles and dial orientations.
- The results screen gets a **"Challenge a friend"** button that copies a link like
  `https://<app>/?c=<seed>&m=hard`. Opening that link replays the identical sequence in
  the same mode. The challenge itself needs **no backend** — the seed is the whole game.

### Leaderboard via Vercel serverless + Upstash Redis

Add serverless functions under `/api` and an [Upstash Redis](https://upstash.com)
store (Vercel Marketplace KV). Client uses the `@upstash/redis` REST client
(env `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).

- `POST /api/score` — body `{ seed, mode, name, total }` → `ZADD lb:<seed>:<mode> <total> <name>`.
- `GET /api/leaderboard?seed=&mode=` — `ZREVRANGE lb:<seed>:<mode> 0 N WITHSCORES` → top N.
- Optional global board keyed `lb:global:<mode>`.

```
  Finish game ──► POST /api/score ──► Upstash Redis (sorted set per seed+mode)
       │                                      ▲
       └──► "Challenge a friend" (?c=seed) ───┘  friend replays same seed, submits, ranks
                                      │
              GET /api/leaderboard?seed=&mode=  ──► render top scores
```

- **Data model:** one sorted set per `seed:mode` (per-challenge board) plus optional
  per-mode global boards. Names are members, totals are scores; ties broken by insert order.
- **Anti-cheat:** casual only at first (scores are client-submitted). A later hardening
  step can sign the results payload with an HMAC and verify server-side before `ZADD`.
- **Vercel config:** `vercel.json` gains the Node `/api` functions; add `@upstash/redis`
  to dependencies; set the two Upstash env vars in the Vercel project.

Phase 2 is **not implemented yet** — this section is the build plan.
