import { useEffect, useState } from 'react'
import gsap from 'gsap'
import AngleDial from './AngleDial.jsx'

// Self-playing mini demo for the menu: names an angle, sweeps the orange
// arrow to a near-miss, reveals the answer, then moves on to the next one.
// Replaces the old pre-rendered GIF, so it always matches the live palette.

const STEPS = [
  { target: 120, base: 25, miss: 9 },
  { target: 265, base: 210, miss: -12 },
  { target: 60, base: 320, miss: 5 },
]

const SWEEP_S = 1.5
const HOLD_REVEAL_MS = 2300

export default function DemoDial() {
  const [step, setStep] = useState(STEPS[0])
  const [guess, setGuess] = useState(8)
  const [reveal, setReveal] = useState(null)

  useEffect(() => {
    let alive = true
    let tween
    let timer
    let i = 0
    const cycle = () => {
      if (!alive) return
      const s = STEPS[i % STEPS.length]
      i++
      setStep(s)
      setReveal(null)
      setGuess(8)
      const proxy = { g: 8 }
      tween = gsap.to(proxy, {
        g: s.target + s.miss,
        duration: SWEEP_S,
        delay: 0.6,
        ease: 'power2.inOut',
        onUpdate: () => alive && setGuess(proxy.g),
        onComplete: () => {
          if (!alive) return
          setReveal({ target: s.target })
          timer = setTimeout(cycle, HOLD_REVEAL_MS)
        },
      })
    }
    cycle()
    return () => {
      alive = false
      tween?.kill()
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="demo-dial" aria-hidden="true">
      <div className="demo-callout">
        MAKE <b>{step.target}°</b>
      </div>
      <AngleDial base={step.base} guess={guess} interactive={false} reveal={reveal} timeFrac={null} />
    </div>
  )
}
