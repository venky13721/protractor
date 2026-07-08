// Core game logic for PROTRACTOR

export const ROUNDS = 5
export const ROUND_TIME = 7 // default seconds to lock in a guess (per-mode override below)

// ---- Tunable config (change these and redeploy) -------------------------

// Difficulty modes. `time` = seconds per round, `fixedBase` pins the green
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

// Dial / effect colors. Fixed arrow = green, your movable arrow = yellow.
export const COLORS = {
  green:  '#39FF14', // fixed arrow (was cyan)
  yellow: '#F2FF1A', // your arrow (was pink)
  gold:   '#ffd166', // reveal target
  violet: '#a78bfa',
  blue:   '#60a5fa',
}

// Scoring curve.
export const SCORE_MAX = 10
export const SCORE_ZERO_DEG = 90 // error at/after which the round scores 0
export const SCORE_DECAY = 20    // exponential steepness (deg)

// ------------------------------------------------------------------------

// Random target angle for a round. Avoid trivial extremes (0/360)
// and keep the whole circle in play so reflex angles show up too.
export function randomTarget() {
  return 10 + Math.floor(Math.random() * 341) // 10..350
}

export function newTargets() {
  return Array.from({ length: ROUNDS }, randomTarget)
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
