import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Aurora from './components/Aurora.jsx'
import ShinyText from './components/ShinyText.jsx'
import ClickSpark from './components/ClickSpark.jsx'
import CountUp from './components/CountUp.jsx'
import Confetti from './components/Confetti.jsx'
import AngleDial from './components/AngleDial.jsx'
import { ROUNDS, ROUND_TIME, MODES, DEFAULT_MODE, newTargets, angularError, roundScore, rankFor, roundVerdict } from './logic.js'
import { sfx, unlock, setMuted, isMuted, playVoice } from './audio.js'

const rand = (min, max) => min + Math.random() * (max - min)

export default function App() {
  const [phase, setPhase] = useState('menu') // menu | intro | play | reveal | results
  const [round, setRound] = useState(0)
  const [targets, setTargets] = useState([])
  const [results, setResults] = useState([]) // { target, guess, score }
  const [base, setBase] = useState(0)
  const [guess, setGuess] = useState(90)
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME)
  const [muted, setMutedState] = useState(isMuted())
  const [mode, setMode] = useState(DEFAULT_MODE)
  const [paused, setPaused] = useState(false)

  const roundTime = MODES[mode].time

  const guessRef = useRef(guess)
  const lockedRef = useRef(false)
  const stageRef = useRef(null)

  const setGuessLive = useCallback((g) => {
    guessRef.current = g
    setGuess(g)
  }, [])

  // ---- phase transitions -------------------------------------------------

  const startGame = () => {
    unlock()
    sfx.click()
    setTargets(newTargets())
    setResults([])
    setRound(0)
    setPhase('intro')
  }

  const beginRound = useCallback(() => {
    // Easy pins the green arrow to +x; Hard/Ultra randomize orientation (no frame of reference)
    setBase(MODES[mode].fixedBase ? 0 : rand(0, 360))
    setGuessLive(rand(25, 335))
    lockedRef.current = false
    setTimeLeft(MODES[mode].time)
    setPhase('play')
  }, [setGuessLive, mode])

  // Pick a difficulty on the menu; announce it with the robotic voice on change.
  const selectMode = (id) => {
    if (id === mode) return
    setMode(id)
    sfx.click()
    playVoice(MODES[id].voice)
  }

  const lockIn = useCallback(() => {
    if (lockedRef.current) return
    lockedRef.current = true
    sfx.lock()
    setResults((prev) => {
      const target = targets[prev.length]
      const g = guessRef.current
      return [...prev, { target, guess: g, score: roundScore(target, g) }]
    })
    setTimeout(() => setPhase('reveal'), 380)
  }, [targets])

  // intro flash -> play
  useEffect(() => {
    if (phase !== 'intro') return
    sfx.roundIntro()
    const t = setTimeout(beginRound, 1250)
    return () => clearTimeout(t)
  }, [phase, beginRound])

  // countdown timer during play — pauses when the tab/app is backgrounded
  useEffect(() => {
    if (phase !== 'play') return
    let raf
    let start = performance.now()
    let lastWhole = Math.ceil(roundTime)
    let hidden = false
    let hidAt = 0
    const loop = (now) => {
      const left = Math.max(0, roundTime - (now - start) / 1000)
      setTimeLeft(left)
      const whole = Math.ceil(left)
      if (whole !== lastWhole) {
        lastWhole = whole
        if (whole <= 3 && whole > 0) sfx.tick(whole <= 1)
      }
      if (left <= 0) lockIn()
      else raf = requestAnimationFrame(loop)
    }
    const onVis = () => {
      if (document.hidden) {
        hidden = true
        hidAt = performance.now()
        cancelAnimationFrame(raf)
        setPaused(true)
      } else if (hidden) {
        hidden = false
        start += performance.now() - hidAt // exclude the time spent away
        setPaused(false)
        raf = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
      setPaused(false)
    }
  }, [phase, lockIn, roundTime])

  // reveal jingle + auto-advance
  useEffect(() => {
    if (phase !== 'reveal') return
    const res = results[results.length - 1]
    if (res) sfx.reveal(res.score)
    const t = setTimeout(() => {
      if (round + 1 < ROUNDS) {
        setRound((r) => r + 1)
        setPhase('intro')
      } else {
        setPhase('results')
      }
    }, 4200)
    return () => clearTimeout(t)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // results fanfare
  useEffect(() => {
    if (phase !== 'results') return
    const total = results.reduce((s, r) => s + r.score, 0)
    sfx.fanfare(total >= 18)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // animate each screen in
  useEffect(() => {
    if (!stageRef.current) return
    const els = stageRef.current.querySelectorAll('[data-animate]')
    if (!els.length) return
    const tween = gsap.fromTo(
      els,
      { y: 26, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.09, ease: 'back.out(1.6)', clearProps: 'transform' }
    )
    return () => tween.kill()
  }, [phase])

  const toggleMute = () => {
    const m = !muted
    setMuted(m)
    setMutedState(m)
    if (!m) sfx.click()
  }

  // ---- render ------------------------------------------------------------

  const lastResult = results[results.length - 1]
  const total = results.reduce((s, r) => s + r.score, 0)

  return (
    <div className="app">
      <Aurora />
      <ClickSpark />

      <header className="topbar">
        <span className="logo">📐 PROTRACTOR</span>
        {(phase === 'play' || phase === 'reveal' || phase === 'intro') && (
          <div className="round-dots" aria-label={`Round ${round + 1} of ${ROUNDS}`}>
            {Array.from({ length: ROUNDS }, (_, i) => (
              <span key={i} className={`dot ${i < results.length ? 'dot-done' : ''} ${i === round ? 'dot-live' : ''}`} />
            ))}
          </div>
        )}
        <button className="mute-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <main className="stage" ref={stageRef}>
        {phase === 'menu' && (
          <section className="screen menu-screen">
            <h1 className="title" data-animate>
              <ShinyText speed={3.5}>PROTRACTOR</ShinyText>
            </h1>
            <p className="tagline" data-animate>How well do you <em>really</em> know your angles?</p>

            <figure className="demo" data-animate>
              <img
                className="demo-gif"
                src="/demo.gif"
                width="520"
                height="500"
                alt="Demo: an angle is named, then you drag the yellow arrow counter-clockwise from the green arrow until the gap feels right, before time runs out."
              />
              <figcaption className="demo-caption">
                Drag the <span className="pink">yellow arrow</span> counter-clockwise from the <span className="cyan">green arrow</span> until the gap <em>feels</em> right — no ticks, no numbers, {roundTime}s × {ROUNDS} rounds.
              </figcaption>
            </figure>

            <div className="mode-select" data-animate role="group" aria-label="Difficulty">
              {Object.values(MODES).map((m) => (
                <button
                  key={m.id}
                  className={`mode-pill ${mode === m.id ? 'mode-pill-active' : ''}`}
                  onClick={() => selectMode(m.id)}
                  aria-pressed={mode === m.id}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button className="btn btn-primary" data-animate onClick={startGame}>
              START GAME
            </button>
          </section>
        )}

        {phase === 'intro' && (
          <section className="screen intro-screen">
            <div className="round-flash" data-animate>
              <span className="round-label">ROUND</span>
              <span className="round-number">{round + 1}</span>
            </div>
          </section>
        )}

        {phase === 'play' && (
          <section className="screen play-screen">
            <div className="target-callout" data-animate>
              <span className="target-label">MAKE THIS ANGLE</span>
              <span className="target-value">{targets[round]}°</span>
            </div>

            <div className="dial-wrap" data-animate>
              <AngleDial
                base={base}
                guess={guess}
                onChange={setGuessLive}
                interactive
                reveal={null}
                timeFrac={timeLeft / roundTime}
              />
              {paused && <div className="pause-overlay">PAUSED</div>}
            </div>

            <div className={`time-readout ${timeLeft <= 3 ? 'time-low' : ''}`} data-animate>{timeLeft.toFixed(1)}s</div>

            <button className="btn btn-primary btn-lock" data-animate onClick={lockIn}>
              LOCK IT IN
            </button>
          </section>
        )}

        {phase === 'reveal' && lastResult && (
          <section className="screen reveal-screen">
            {lastResult.score >= 9.5 && <Confetti count={60} />}
            <div className={`verdict ${lastResult.score >= 8 ? 'verdict-good' : lastResult.score < 4 ? 'verdict-bad' : ''}`} data-animate>
              {roundVerdict(lastResult.score)}
            </div>

            <div className="dial-wrap" data-animate>
              <AngleDial
                base={base}
                guess={lastResult.guess}
                interactive={false}
                reveal={{ target: lastResult.target }}
                timeFrac={null}
              />
            </div>

            <div className="reveal-stats" data-animate>
              <div className="stat">
                <span className="stat-label gold">TARGET</span>
                <span className="stat-value gold">{lastResult.target}°</span>
              </div>
              <div className="stat">
                <span className="stat-label pink">YOU</span>
                <span className="stat-value pink">{Math.round(lastResult.guess)}°</span>
              </div>
              <div className="stat">
                <span className="stat-label">OFF BY</span>
                <span className="stat-value">{Math.round(angularError(lastResult.target, lastResult.guess))}°</span>
              </div>
              <div className="stat stat-score">
                <span className="stat-label">SCORE</span>
                <span className="stat-value">
                  <CountUp value={lastResult.score} duration={1.3} delay={0.9} withSound />
                  <span className="stat-denominator">/10</span>
                </span>
              </div>
            </div>
          </section>
        )}

        {phase === 'results' && (
          <section className="screen results-screen">
            {total >= 25 && <Confetti count={110} />}
            <p className="results-kicker" data-animate>FINAL SCORE</p>
            <div className="results-total" data-animate>
              <ShinyText speed={2.5}>
                <CountUp value={total} duration={2} withSound />
              </ShinyText>
              <span className="results-outof">/ 50</span>
            </div>
            <div className="rank" data-animate>
              <span className="rank-title">{rankFor(total).title}</span>
              <span className="rank-blurb">{rankFor(total).blurb}</span>
            </div>

            <div className="breakdown" data-animate>
              {results.map((r, i) => (
                <div className="breakdown-row" key={i}>
                  <span className="br-round">R{i + 1}</span>
                  <span className="br-detail">{r.target}° → {Math.round(r.guess)}°</span>
                  <div className="br-bar">
                    <div className="br-fill" style={{ width: `${r.score * 10}%`, animationDelay: `${0.3 + i * 0.12}s` }} />
                  </div>
                  <span className="br-score">{r.score.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" data-animate onClick={startGame}>
              PLAY AGAIN
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
