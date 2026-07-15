// Leaderboard client. Talks to the /api serverless functions (Upstash Redis
// behind them); if they're unreachable or unconfigured — e.g. `vite dev`
// without Vercel, or no Upstash env vars yet — it falls back to a
// per-device board in localStorage so the screen always works.

import { encodeSeed } from './logic.js'

export const MAX_NAME = 16
export const BOARD_SIZE = 25

export const cleanName = (name) =>
  (name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)

const localKey = (seed, mode) => `protractor-lb:${encodeSeed(seed)}:${mode}`

function readLocal(seed, mode) {
  try {
    return JSON.parse(localStorage.getItem(localKey(seed, mode))) || []
  } catch {
    return []
  }
}

// Local fallback mirrors the server rules: one entry per name, best score wins.
function submitLocal(seed, mode, name, total) {
  const entries = readLocal(seed, mode)
  const mine = entries.find((e) => e.name === name)
  if (mine) mine.score = Math.max(mine.score, total)
  else entries.push({ name, score: total })
  entries.sort((a, b) => b.score - a.score)
  const trimmed = entries.slice(0, BOARD_SIZE)
  try {
    localStorage.setItem(localKey(seed, mode), JSON.stringify(trimmed))
  } catch { /* storage full/blocked — board is best-effort */ }
  return trimmed
}

async function api(path, opts) {
  const res = await fetch(path, opts)
  if (!res.ok) throw new Error(`api ${res.status}`)
  return res.json()
}

// → { entries: [{ name, score }], rank, local } — `local: true` means the
// shared board was unreachable and this is the on-device fallback.
export async function submitScore({ seed, mode, name, total }) {
  try {
    const data = await api('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed: encodeSeed(seed), mode, name, total }),
    })
    return { ...data, local: false }
  } catch {
    const entries = submitLocal(seed, mode, name, total)
    return { entries, rank: entries.findIndex((e) => e.name === name) + 1, local: true }
  }
}

export async function fetchBoard({ seed, mode }) {
  try {
    const data = await api(`/api/leaderboard?seed=${encodeSeed(seed)}&mode=${mode}`)
    return { ...data, local: false }
  } catch {
    return { entries: readLocal(seed, mode), rank: null, local: true }
  }
}
