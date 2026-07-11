// POST /api/score  { seed, mode, name, total }
// Records a score on the challenge's board (best score per name is kept)
// and returns the top of the board plus the submitter's 1-based rank.

import { boardKey, cleanName, configured, redis, topEntries, validMode, validSeed } from './_upstash.js'

const BOARD_TTL = 60 * 60 * 24 * 90 // boards expire after 90 days of inactivity

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  if (!configured()) return res.status(503).json({ error: 'leaderboard not configured' })

  const { seed, mode, total } = req.body || {}
  const name = cleanName(req.body?.name)
  if (!validSeed(seed) || !validMode(mode) || !name) {
    return res.status(400).json({ error: 'bad request' })
  }
  const score = Number(total)
  if (!Number.isFinite(score) || score < 0 || score > 50) {
    return res.status(400).json({ error: 'bad score' })
  }

  try {
    const key = boardKey(seed, mode)
    // GT: only overwrite an existing entry with a better score
    await redis(['ZADD', key, 'GT', Math.round(score * 100) / 100, name])
    await redis(['EXPIRE', key, BOARD_TTL])
    const [entries, rank] = await Promise.all([topEntries(key), redis(['ZREVRANK', key, name])])
    return res.status(200).json({ entries, rank: rank == null ? null : rank + 1 })
  } catch (err) {
    console.error('score:', err)
    return res.status(502).json({ error: 'storage unavailable' })
  }
}
