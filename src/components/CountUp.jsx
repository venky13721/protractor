import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { sfx } from '../audio.js'

// CountUp — a number that rolls up to its value with GSAP
// (inspired by reactbits.dev's Count Up), with a rising audio ticker.
export default function CountUp({ value, decimals = 2, duration = 1.4, className = '', withSound = false, delay = 0 }) {
  const ref = useRef(null)

  useEffect(() => {
    const obj = { v: 0 }
    let lastTicked = -1
    const tween = gsap.to(obj, {
      v: value,
      duration,
      delay,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = obj.v.toFixed(decimals)
        if (withSound && value > 0) {
          const step = Math.floor((obj.v / value) * 12)
          if (step !== lastTicked) {
            lastTicked = step
            sfx.scoreTick(obj.v / value)
          }
        }
      },
    })
    return () => tween.kill()
  }, [value, decimals, duration, withSound, delay])

  return <span ref={ref} className={className}>{(0).toFixed(decimals)}</span>
}
