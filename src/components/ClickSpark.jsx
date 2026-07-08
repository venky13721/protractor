import { useEffect, useRef } from 'react'

// ClickSpark — little burst of lines wherever the user taps
// (inspired by reactbits.dev's Click Spark). Canvas-based, cheap.
export default function ClickSpark() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let sparks = []
    let raf = 0
    let running = false

    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio
      canvas.height = window.innerHeight * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = (e) => {
      const x = e.clientX
      const y = e.clientY
      for (let i = 0; i < 8; i++) {
        sparks.push({ x, y, angle: (Math.PI * 2 * i) / 8 + Math.random() * 0.4, start: performance.now() })
      }
      if (!running) { running = true; raf = requestAnimationFrame(draw) }
    }

    const DUR = 450
    const draw = (now) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      sparks = sparks.filter((s) => now - s.start < DUR)
      for (const s of sparks) {
        const t = (now - s.start) / DUR
        const dist = 12 + t * 34
        const len = 12 * (1 - t)
        const x1 = s.x + Math.cos(s.angle) * dist
        const y1 = s.y + Math.sin(s.angle) * dist
        ctx.strokeStyle = `rgba(57, 255, 20, ${1 - t})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x1 + Math.cos(s.angle) * len, y1 + Math.sin(s.angle) * len)
        ctx.stroke()
      }
      if (sparks.length) raf = requestAnimationFrame(draw)
      else running = false
    }

    window.addEventListener('pointerdown', spawn)
    return () => {
      window.removeEventListener('pointerdown', spawn)
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} className="click-spark" aria-hidden="true" />
}
