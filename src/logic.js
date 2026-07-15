// Core game logic for PROTRACTOR

export const ROUNDS = 5
export const ROUND_TIME = 7 // default seconds to lock in a guess (per-mode override below)

// ---- Tunable config (change these and redeploy) -------------------------

// Difficulty modes. `time` = seconds per round, `fixedBase` pins the blue
// arrow to the +x axis (easy frame of reference), `voice` = mode-announce clip.
//
// Voices are robotic TTS generated with Higgsfield. They currently point at the
// hosted Higgsfield CDN URLs so they work without bundling. To self-host for
// permanence: run `public/voice/fetch-voices.sh`, then swap each `voice` below
// to the local path (e.g. '/voice/hard.mp3'). playVoice() no-ops if a clip 404s.
const VOICE = {
  easy:  'https://d8j0ntlcm91z4.cloudfront.net/user_3F1iM9NDiZ6dIAOm62nzuSCpb0y/hf_20260708_103046_d0997864-bf25-4045-8b97-9af51c864d1f.mp3',
  hard:  'https://d8j0ntlcm91z4.cloudfront.net/user_3F1iM9NDiZ6dIAOm62nzuSCpb0y/hf_20260708_103049_a98c21a8-02eb-4707-8673-6d98bfb04f4e.mp3',
  ultra: 'https://d8j0ntlcm91z4.cloudfront.net/user_3F1iM9NDiZ6dIAOm62nzuSCpb0y/hf_20260708_103126_d6b6c3d4-2f95-4f2b-be6d-1bcf83e5d414.mp3',
}
export const MODES = {
  easy:  { id: 'easy',  label: 'EASY',  time: 7, fixedBase: true,  voice: VOICE.easy  },
  hard:  { id: 'hard',  label: 'HARD',  time: 7, fixedBase: false, voice: VOICE.hard  }, // the classic game
  ultra: { id: 'ultra', label: 'ULTRA', time: 5, fixedBase: false, voice: VOICE.ultra }, // hard + less time
}
export const DEFAULT_MODE = 'hard'

// Dial / effect colors — a colorblind-safe palette. Blue vs orange stays
// distinguishable under protanopia, deuteranopia and tritanopia (the old
// green vs yellow pair collapsed for red-green CVD), and the reveal target
// is white, which no CVD type confuses with either arrow. The arrows also
// differ by shape (hollow vs solid head), so color is never the only cue.
export const COLORS = {
  fixed:  '#3DA9FF', // fixed reference arrow (azure blue)
  you:    '#FF9F1C', // your movable arrow (vivid orange)
  target: '#FFFFFF', // reveal target (white)
  gold:   '#ffd166', // decorative only: ranks, confetti
  violet: '#a78bfa', // decorative only: aurora, confetti
}

// Scoring curve.
export const SCORE_MAX = 10
export const SCORE_ZERO_DEG = 90 // error at/after which the round scores 0
export const SCORE_DECAY = 20    // exponential steepness (deg)

// ------------------------------------------------------------------------

// ---- Seeded games (multiplayer challenges) ------------------------------
// Every game is derived from a 32-bit seed: same seed + mode → the exact
// same 5 targets, dial orientations and start positions. Sharing
// `?c=<seed>&m=<mode>` lets a friend replay the identical game — no backend.

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}

export const encodeSeed = (seed) => (seed >>> 0).toString(36)

export function decodeSeed(str) {
  if (!/^[0-9a-z]{1,7}$/.test(str || '')) return null
  const n = parseInt(str, 36)
  return n <= 0xffffffff ? n >>> 0 : null
}

// mulberry32 — tiny deterministic PRNG, returns floats in [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Deterministic plan for a whole game. Targets avoid trivial extremes
// (10..350 keeps reflex angles in play); base spin and the arrow's start
// position come from the same stream so replays are exact.
export function gamePlan(seed, modeId) {
  const rng = mulberry32(seed)
  const { fixedBase } = MODES[modeId]
  return Array.from({ length: ROUNDS }, () => {
    const target = 10 + Math.floor(rng() * 341)
    const spin = rng() * 360
    const start = 25 + rng() * 310
    return { target, base: fixedBase ? 0 : spin, start }
  })
}

// Shortest circular distance between two angles, in degrees (0..180).
export function angularError(target, guess) {
  const d = Math.abs(((guess - target) % 360 + 360) % 360)
  return Math.min(d, 360 - d)
}

// Score a round: exactly 10.00 for a perfect guess, decaying exponentially
// with the error and hitting exactly 0 at SCORE_ZERO_DEG (90°) and beyond.
//   0°  -> 10.00     10° -> 6.02     20° -> 3.61
//   45° -> 0.96      90°+ -> 0.00
export function roundScore(target, guess) {
  const err = angularError(target, guess)
  if (err <= 0.5) return SCORE_MAX
  if (err >= SCORE_ZERO_DEG) return 0
  const floor = Math.exp(-SCORE_ZERO_DEG / SCORE_DECAY)
  const s = SCORE_MAX * (Math.exp(-err / SCORE_DECAY) - floor) / (1 - floor)
  return Math.round(s * 100) / 100
}

export function rankFor(total) {
  if (total >= 46) return { title: 'PROTRACTOR PRODIGY', blurb: 'Are you secretly a compass?' }
  if (total >= 38) return { title: 'ANGLE ASSASSIN', blurb: 'Deadly precision. Euclid is proud.' }
  if (total >= 28) return { title: 'DEGREE DEALER', blurb: 'You clearly know your way around a circle.' }
  if (total >= 18) return { title: 'GEOMETRY GAMBLER', blurb: 'Half instinct, half chaos. We respect it.' }
  if (total >= 8) return { title: 'WOBBLY COMPASS', blurb: 'North is... somewhere over there?' }
  return { title: 'BLINDFOLDED BUILDER', blurb: 'Angles fear you. So do architects.' }
}

// Flavor line for a single round, based on its score.
export function roundVerdict(score) {
  if (score >= 9.5) return 'DEAD ON!'
  if (score >= 8) return 'RAZOR SHARP'
  if (score >= 6) return 'SO CLOSE'
  if (score >= 4) return 'NOT BAD'
  if (score >= 2) return 'DRIFTING...'
  return 'WAY OFF'
}
