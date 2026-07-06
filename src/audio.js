// Synthesized sound engine — no audio assets, everything is
// generated with the Web Audio API on the fly.

let ctx = null
let muted = false

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m) { muted = m }
export function isMuted() { return muted }
// Call from a user gesture so the context is allowed to start.
export function unlock() { ac() }

function tone({ freq = 440, type = 'sine', dur = 0.2, vol = 0.2, at = 0, glide = null, curve = 'exp' }) {
  const c = ac()
  if (!c || muted) return
  const t0 = c.currentTime + at
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(glide, 1), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  else g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function noise({ dur = 0.4, vol = 0.25, at = 0, from = 400, to = 4000, q = 1.2 }) {
  const c = ac()
  if (!c || muted) return
  const t0 = c.currentTime + at
  const len = Math.ceil(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, t0)
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter).connect(g).connect(c.destination)
  src.start(t0)
  src.stop(t0 + dur + 0.05)
}

export const sfx = {
  // UI button press
  click() {
    tone({ freq: 720, type: 'triangle', dur: 0.08, vol: 0.15 })
    tone({ freq: 1440, type: 'sine', dur: 0.06, vol: 0.08, at: 0.02 })
  },

  // Tiny ratchet blip while dragging the arrow
  ratchet() {
    tone({ freq: 2200 + Math.random() * 300, type: 'square', dur: 0.018, vol: 0.028, curve: 'lin' })
  },

  // Round intro whoosh + hit
  roundIntro() {
    noise({ dur: 0.45, vol: 0.18, from: 300, to: 2600 })
    tone({ freq: 196, type: 'sawtooth', dur: 0.35, vol: 0.12, at: 0.12, glide: 98 })
  },

  // Countdown tick in the final seconds
  tick(urgent = false) {
    tone({ freq: urgent ? 1320 : 880, type: 'sine', dur: 0.07, vol: urgent ? 0.22 : 0.14 })
  },

  // Locking in a guess
  lock() {
    noise({ dur: 0.25, vol: 0.2, from: 3000, to: 500 })
    tone({ freq: 440, type: 'triangle', dur: 0.18, vol: 0.2 })
    tone({ freq: 660, type: 'triangle', dur: 0.22, vol: 0.14, at: 0.06 })
  },

  // Reveal jingle, scaled to how well the round went (score 0..10)
  reveal(score) {
    if (score >= 9.5) {
      // perfect — sparkling major arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
      notes.forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.35, vol: 0.2, at: i * 0.08 }))
      noise({ dur: 0.7, vol: 0.1, from: 2000, to: 8000, at: 0.1, q: 0.8 })
    } else if (score >= 7) {
      [523.25, 659.25, 783.99].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.3, vol: 0.18, at: i * 0.09 }))
    } else if (score >= 4) {
      tone({ freq: 493.88, type: 'triangle', dur: 0.25, vol: 0.16 })
      tone({ freq: 587.33, type: 'triangle', dur: 0.3, vol: 0.14, at: 0.12 })
    } else {
      // sad trombone-ish slide
      tone({ freq: 311, type: 'sawtooth', dur: 0.5, vol: 0.12, glide: 233 })
      tone({ freq: 156, type: 'sawtooth', dur: 0.55, vol: 0.08, at: 0.05, glide: 117 })
    }
  },

  // Score ticker while the number counts up
  scoreTick(progress) {
    tone({ freq: 600 + progress * 900, type: 'sine', dur: 0.03, vol: 0.05, curve: 'lin' })
  },

  // Final results fanfare
  fanfare(good = true) {
    if (good) {
      const seq = [392, 523.25, 659.25, 783.99, 1046.5]
      seq.forEach((f, i) => {
        tone({ freq: f, type: 'triangle', dur: 0.4, vol: 0.2, at: i * 0.12 })
        tone({ freq: f * 2, type: 'sine', dur: 0.3, vol: 0.08, at: i * 0.12 + 0.03 })
      })
      noise({ dur: 1.2, vol: 0.08, from: 3000, to: 9000, at: 0.5, q: 0.7 })
    } else {
      [392, 370, 349, 330].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.4, vol: 0.1, at: i * 0.22 }))
    }
  },
}
