// Core game logic for PROTRACTOR

export const ROUNDS = 5
export const ROUND_TIME = 7 // seconds to lock in a guess

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

// Score a round: 10.00 for a (near) perfect guess, decaying
// exponentially with the error. Two decimal places.
//   0°  -> 10.00      5° -> 7.97
//   10° -> 6.35      20° -> 4.03
//   45° -> 1.29      90° -> 0.17
export function roundScore(target, guess) {
  const err = angularError(target, guess)
  if (err <= 1) return 10
  const s = 10 * Math.exp(-err / 22)
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
