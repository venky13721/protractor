import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { sfx } from '../audio.js'
import { COLORS } from '../logic.js'

const CX = 200
const CY = 200
const RAY = 148 // arrow length
const RING = 184 // timer ring radius
const ARC_TARGET = 118
const ARC_GUESS = 92
const NOTCH = 10       // degrees per audible tick (sparser than before)
const TICK_MIN_MS = 45 // min gap between ticks so fast drags don't machine-gun

// Visual angles are degrees counter-clockwise from the +x axis.
// Screen y grows downward, hence the minus on sin.
function pt(deg, r) {
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)]
}

// CCW arc from startDeg sweeping `sweep` degrees at radius r.
function arcPath(startDeg, sweep, r) {
  const s = Math.min(Math.max(sweep, 0.01), 359.9)
  const [x0, y0] = pt(startDeg, r)
  const [x1, y1] = pt(startDeg + s, r)
  const large = s > 180 ? 1 : 0
  // sweep-flag 0 = counter-clockwise on screen
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 0 ${x1} ${y1}`
}

function arcLength(sweep, r) {
  return (2 * Math.PI * r * Math.min(Math.max(sweep, 0.01), 359.9)) / 360
}

// `hollow` gives the fixed arrow an outlined head, so the two live arrows
// differ by shape as well as color (never color alone — CVD safety).
function Arrow({ deg, color, ghost = false, hollow = false }) {
  const [tx, ty] = pt(deg, RAY)
  return (
    <g style={{ filter: ghost ? 'none' : `drop-shadow(0 0 8px ${color})` }} opacity={ghost ? 0.85 : 1}>
      <line x1={CX} y1={CY} x2={tx} y2={ty} stroke={color} strokeWidth={ghost ? 3 : hollow ? 4 : 5} strokeLinecap="round" strokeDasharray={ghost ? '7 7' : 'none'} />
      <path
        d="M6,0 L-16,9 L-10,0 L-16,-9 Z"
        fill={hollow ? 'none' : color}
        stroke={hollow ? color : 'none'}
        strokeWidth={hollow ? 2.5 : 0}
        strokeLinejoin="round"
        transform={`translate(${tx} ${ty}) rotate(${-deg})`}
      />
    </g>
  )
}

/**
 * The dial. Two arrows around a shared vertex — one fixed (blue, hollow
 * head), one the player drags (orange, solid head). No ticks, no numbers,
 * no mercy.
 *
 * props:
 *  base        fixed arrow direction (visual degrees)
 *  guess       current guess, degrees CCW from the fixed arrow
 *  onChange    (guess) => void while dragging
 *  interactive whether dragging is allowed
 *  reveal      null | { target } — shows the answer arcs
 *  timeFrac    1 → full time left, 0 → out of time
 */
export default function AngleDial({ base, guess, onChange, interactive, reveal, timeFrac }) {
  const svgRef = useRef(null)
  const dragging = useRef(false)
  const lastBucket = useRef(null)
  const lastTick = useRef(0)
  const targetArcRef = useRef(null)
  const guessArcRef = useRef(null)

  const angleFromEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 400
    const y = ((e.clientY - rect.top) / rect.height) * 400
    return (Math.atan2(CY - y, x - CX) * 180) / Math.PI
  }

  const applyPointer = (e) => {
    const theta = angleFromEvent(e)
    const g = ((theta - base) % 360 + 360) % 360
    const bucket = Math.floor(g / NOTCH)
    if (bucket !== lastBucket.current) {
      lastBucket.current = bucket
      const now = performance.now()
      if (now - lastTick.current > TICK_MIN_MS) {
        lastTick.current = now
        sfx.ratchet()
      }
    }
    onChange(g)
  }

  const onPointerDown = (e) => {
    if (!interactive) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    applyPointer(e)
  }
  const onPointerMove = (e) => {
    if (dragging.current && interactive) applyPointer(e)
  }
  const onPointerUp = () => { dragging.current = false }

  // Animate the answer arcs sweeping in on reveal.
  useEffect(() => {
    if (!reveal) return
    const anims = []
    const draw = (el, sweep, r, delay) => {
      if (!el) return
      const len = arcLength(sweep, r)
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 })
      anims.push(gsap.to(el, { strokeDashoffset: 0, duration: 0.7, delay, ease: 'power2.inOut' }))
    }
    draw(targetArcRef.current, reveal.target, ARC_TARGET, 0.15)
    draw(guessArcRef.current, guess, ARC_GUESS, 0.45)
    return () => anims.forEach((a) => a.kill())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  const ringLen = 2 * Math.PI * RING
  const frac = Math.min(Math.max(timeFrac ?? 1, 0), 1)
  const urgent = frac < 0.3
  const ringColor = urgent ? '#ff4d6d' : frac < 0.6 ? COLORS.gold : COLORS.fixed
  const moveDeg = base + guess

  return (
    <svg
      ref={svgRef}
      className={`dial ${interactive ? 'dial-live' : ''}`}
      viewBox="0 0 400 400"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* faint face */}
      <circle cx={CX} cy={CY} r={RING} fill="rgba(10,14,32,0.55)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={RAY + 14} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 10" />

      {/* timer ring */}
      {timeFrac != null && (
        <circle
          cx={CX} cy={CY} r={RING}
          fill="none"
          stroke={ringColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={ringLen}
          strokeDashoffset={ringLen * (1 - frac)}
          transform={`rotate(-90 ${CX} ${CY})`}
          className={urgent ? 'ring-urgent' : ''}
          style={{ filter: `drop-shadow(0 0 6px ${ringColor})`, transition: 'stroke 0.4s' }}
        />
      )}

      {/* reveal arcs: white = the target, orange = the guess */}
      {reveal && (
        <g fill="none">
          <path ref={targetArcRef} d={arcPath(base, reveal.target, ARC_TARGET)} stroke={COLORS.target} strokeWidth="6" strokeLinecap="round" opacity="0" style={{ filter: `drop-shadow(0 0 8px ${COLORS.target})` }} />
          <path ref={guessArcRef} d={arcPath(base, guess, ARC_GUESS)} stroke={COLORS.you} strokeWidth="6" strokeLinecap="round" opacity="0" style={{ filter: `drop-shadow(0 0 8px ${COLORS.you})` }} />
        </g>
      )}

      {/* the ghost (dashed) arrow marking where the target actually was */}
      {reveal && <Arrow deg={base + reveal.target} color={COLORS.target} ghost />}

      {/* fixed (blue, hollow head) + movable (orange, solid head) arrows */}
      <Arrow deg={base} color={COLORS.fixed} hollow />
      <Arrow deg={moveDeg} color={COLORS.you} />

      {/* hub */}
      <circle cx={CX} cy={CY} r="10" fill="#0b1024" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <circle cx={CX} cy={CY} r="3.5" fill="#fff" />
    </svg>
  )
}
