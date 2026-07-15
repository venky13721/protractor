// GET /api/leaderboard?seed=<base36>&mode=<easy|hard|ultra>
// Returns the top scores for one challenge board.

import { boardKey, configured, topEntries, validMode, validSeed } from './_upstash.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })
  if (!configured()) return res.status(503).json({ error: 'leaderboard not configured' })

  const { seed, mode } = req.query || {}
  if (!validSeed(seed) || !validMode(mode)) {
    return res.status(400).json({ error: 'bad request' })
  }

  try {
    const entries = await topEntries(boardKey(seed, mode))
    return res.status(200).json({ entries, rank: null })
  } catch (err) {
    console.error('leaderboard:', err)
    return res.status(502).json({ error: 'storage unavailable' })
  }
}
