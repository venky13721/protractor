# PROTRACTOR — Phase 1 Handoff

Living progress log for the Phase 1 game improvements. Updated after every step.
Branch: `claude/game-improvements-multiplayer-jgvox8`. Plan approved by owner.

_Phase 2 (multiplayer) is documentation-only in this pass; not implemented._

## Skills installed (session, user-level `~/.claude/skills/`)
- **ponytail** (+ audit/review/debt/gain/help) — lazy-senior-dev, minimal code.
- **superpowers** (using-superpowers, writing/executing-plans, TDD, verification, etc.).
- **caveman** (+ commit/compress/review/stats/help/cavecrew) — terse output mode.
- Note: always-on caveman/ponytail **hooks were NOT wired into settings.json** — they
  rewrite every response (caveman-speak) and would corrupt this handoff + the work.
  Skills are installed and invocable on demand.

## Status legend: ⬜ todo · 🟡 in progress · ✅ done

| # | Step | Status | Notes |
|---|------|--------|-------|
| 0 | Install 3 skills | ✅ | 27 skills copied to ~/.claude/skills, registered. |
| 1 | logic.js: MODES + scoring + COLORS | ✅ | MODES(easy/hard/ultra), DEFAULT_MODE, COLORS, scoring exact-10→0@90°. |
| 2 | audio.js: softer tick + playVoice | ✅ | ratchet→150Hz triangle low-vol; added playVoice(url). |
| 3 | AngleDial.jsx: colors + tick throttle + glow clip | ✅ | green/yellow via COLORS; NOTCH=10°+45ms throttle. Glow clip handled in CSS (step 5). |
| 4 | App.jsx: modes + pause + timer readout + copy | ✅ | mode state+pills+selectMode(voice); visibilitychange pause+overlay; readout moved below dial; per-mode time; copy→green/yellow. |
| 5 | index.css: readout + PAUSED + neon reskin | ✅ | neon vars+glow literals; readout pill below dial; PAUSED overlay; mode pills; dial-wrap circle-clip fixes glow bleed. |
| 6 | Confetti + ClickSpark colors | ✅ | both point at COLORS (green/yellow/gold/violet/blue). |
| 7 | Higgsfield: 3 mode voices | ✅ | Generated 3 clips (Sterling voice). CDN download blocked by egress policy → MODES point at hosted URLs; fetch-voices.sh provided to self-host. |
| 8 | README (Phase 1 + Phase 2) | ✅ | Rewrote: updated gameplay, tunable consts, Phase 2 seeded-URL + Upstash arch. |
| 9 | Verify + commit + push + merge | ✅ | build ✓; scoring endpoints ✓ (0→10, 45→0.95, ≥90→0). PR #5 merged to main. |

## Decisions locked
- Colors: fixed arrow = neon green `#39FF14`, you = neon yellow `#F2FF1A`, target stays gold.
- Voices: Higgsfield only.
- Multiplayer: seeded URL + Upstash Redis (Phase 2, doc only).

## Log
- Installed ponytail / superpowers / caveman skills to ~/.claude/skills (27 dirs). Hooks intentionally not enabled.
- Created task list + this handoff. Starting step 1.
- Step 1 ✅ logic.js: added MODES/DEFAULT_MODE/COLORS/SCORE_* consts; roundScore now exact-10 at 0° and exactly 0 at ≥90°. Higgsfield MCP needs per-call approval (deferred to step 7).
- Starting step 2 (audio.js).
- Step 2 ✅ audio.js: gentler drag tick (150Hz triangle, vol 0.02); new playVoice(url) via HTMLAudioElement, mute-aware, cancels in-flight.
- Step 3 ✅ AngleDial.jsx: arrows/arc/ring recolored via COLORS (green fixed, yellow you, gold target); ticks sparser (10° notch + 45ms throttle). Mobile glow clip deferred to CSS step 5.
- Starting step 4 (App.jsx).
- Step 4 ✅ App.jsx: `mode`/`paused` state; menu mode pills → selectMode() plays voice; beginRound honors fixedBase + per-mode time; countdown pauses on visibilitychange (shifts start by away-time) with PAUSED overlay; time readout moved out of dial-wrap to its own row; howto copy now green/yellow.
- Starting step 5 (index.css: readout reposition, PAUSED overlay, mode pills, neon reskin, glow clip).
- Step 5 ✅ index.css: --cyan=#39FF14, --pink=#F2FF1A; recolored aurora/button/text-shadow rgba literals; time-readout now a pill below the dial; added .pause-overlay, .mode-select/.mode-pill; .dial-wrap gets border-radius:50%+overflow:hidden to contain arrow glow (mobile bug fix).
- Step 6 ✅ Confetti imports COLORS; ClickSpark spark → green. Grep confirms no old cyan/pink literals remain in src.
- Starting step 7 (Higgsfield mode voices → public/voice/{easy,hard,ultra}.mp3).
- Step 7 ✅ (with caveat): generated EASY/HARD/ULTRA clips via Higgsfield seed_audio, voice "Sterling" (deep male). Cost 0.1cr each. NOTE: pitch/speech rate params must be integers (used defaults). Could NOT download the mp3s — the CDN host (d8j0ntlcm91z4.cloudfront.net) is blocked by org egress policy (403, must not route around). Workaround: MODES[].voice point at the hosted CDN URLs (work in a real browser on deploy), plus public/voice/fetch-voices.sh for the owner to self-host + a README note to flip to local paths.
- Step 8 ✅ README updated (voice section reflects hosted-URL approach).
- Starting step 9: build + browser verify + commit + push.
- Step 9 ✅ `npm run build` clean (vite, 40 modules). Verified roundScore endpoints via node: 0°→10.00, 1°→9.51, 10°→6.02, 20°→3.61, 45°→0.95, ≥90°→0. Committed c48fad7, pushed branch, opened PR #5, merged to main (6342cae). Browser smoke test skipped per owner ("just merge, I'll test").
- DONE. Phase 1 shipped. Phase 2 is documented in README (not built).

## Owner follow-ups
- Test the deployed build. Voices load from Higgsfield CDN URLs; run `bash public/voice/fetch-voices.sh` then switch MODES[].voice to `/voice/*.mp3` to self-host.
- Tune knobs in `src/logic.js` if desired: MODES times, SCORE_DECAY/SCORE_ZERO_DEG, COLORS.
- Say the word to start Phase 2 (multiplayer) — plan is in README.
