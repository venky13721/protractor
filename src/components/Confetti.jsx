import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { COLORS as THEME } from '../logic.js'

const COLORS = [THEME.green, THEME.yellow, THEME.gold, THEME.violet, THEME.blue]

// One-shot confetti burst rendered with plain divs + GSAP physics.
export default function Confetti({ count = 90 }) {
  const ref = useRef(null)

  useEffect(() => {
    const host = ref.current
    const tweens = []
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-piece'
      el.style.background = COLORS[i % COLORS.length]
      el.style.left = `${10 + Math.random() * 80}%`
      el.style.top = '-4vh'
      el.style.width = `${6 + Math.random() * 8}px`
      el.style.height = `${10 + Math.random() * 8}px`
      host.appendChild(el)
      tweens.push(
        gsap.to(el, {
          y: window.innerHeight * (1.05 + Math.random() * 0.3),
          x: gsap.utils.random(-140, 140),
          rotation: gsap.utils.random(-540, 540),
          duration: gsap.utils.random(2.2, 4),
          delay: Math.random() * 0.8,
          ease: 'power1.in',
          onComplete: () => el.remove(),
        })
      )
    }
    return () => { tweens.forEach((t) => t.kill()); host.innerHTML = '' }
  }, [count])

  return <div ref={ref} className="confetti" aria-hidden="true" />
}
