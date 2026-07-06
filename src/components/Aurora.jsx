import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Aurora — animated gradient blobs drifting behind the game
// (inspired by reactbits.dev's Aurora background).
export default function Aurora() {
  const ref = useRef(null)

  useEffect(() => {
    const blobs = ref.current.querySelectorAll('.aurora-blob')
    const tweens = [...blobs].map((b, i) =>
      gsap.to(b, {
        x: () => gsap.utils.random(-220, 220),
        y: () => gsap.utils.random(-160, 160),
        scale: () => gsap.utils.random(0.8, 1.35),
        rotation: () => gsap.utils.random(-60, 60),
        duration: () => gsap.utils.random(9, 15),
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        repeatRefresh: true,
        delay: i * 0.8,
      })
    )
    return () => tweens.forEach((t) => t.kill())
  }, [])

  return (
    <div className="aurora" ref={ref} aria-hidden="true">
      <div className="aurora-blob aurora-cyan" />
      <div className="aurora-blob aurora-violet" />
      <div className="aurora-blob aurora-pink" />
      <div className="aurora-grid" />
      <div className="aurora-vignette" />
    </div>
  )
}
