// Shared helpers for the leaderboard functions. Files prefixed with `_`
// are not deployed as endpoints by Vercel.
//
// Talks to Upstash Redis over its REST API with plain fetch — no npm
// dependency. The env vars come from the Vercel integration: the classic
// Upstash integration sets UPSTASH_REDIS_REST_*, while the newer
// Marketplace "Upstash KV" resource sets KV_REST_API_*. Accept either.

const restUrl = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const restToken = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export const configured = () => Boolean(restUrl() && restToken())

export async function redis(cmd) {
  const res = await fetch(restUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${restToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  })
  if (!res.ok) throw new Error(`upstash ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.result
}

// One sorted set per challenge: members are names, scores are totals.
export const boardKey = (seed, mode) => `lb:${seed}:${mode}`

export const BOARD_SIZE = 25
export const MAX_NAME = 16
export const MODES = ['easy', 'hard', 'ultra']

export const validSeed = (seed) => typeof seed === 'string' && /^[0-9a-z]{1,7}$/.test(seed)
export const validMode = (mode) => MODES.includes(mode)

export const cleanName = (name) =>
  typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : ''

// ZRANGE ... REV WITHSCORES returns a flat [member, score, member, score, ...]
export async function topEntries(key) {
  const flat = await redis(['ZRANGE', key, 0, BOARD_SIZE - 1, 'REV', 'WITHSCORES'])
  const entries = []
  for (let i = 0; i < flat.length; i += 2) {
    entries.push({ name: flat[i], score: Number(flat[i + 1]) })
  }
  return entries
}
