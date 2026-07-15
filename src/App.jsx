import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Aurora from './components/Aurora.jsx'
import ShinyText from './components/ShinyText.jsx'
import ClickSpark from './components/ClickSpark.jsx'
import CountUp from './components/CountUp.jsx'
import Confetti from './components/Confetti.jsx'
import AngleDial from './components/AngleDial.jsx'
import DemoDial from './components/DemoDial.jsx'
import { ROUNDS, ROUND_TIME, MODES, DEFAULT_MODE, angularError, rankFor, roundScore, roundVerdict, gamePlan, randomSeed, encodeSeed, decodeSeed } from './logic.js'
import { submitScore, fetchBoard, cleanName, MAX_NAME } from './leaderboard.js'
import { sfx, unlock, setMuted, isMuted, playVoice } from './audio.js'

// A shared game arrives as ?c=<seed>&m=<mode> — same seed, same 5 angles.
function parseChallenge() {
  const params = new URLSearchParams(window.location.search)
  const seed = decodeSeed(params.get('c'))
  if (seed === null) return null
  const m = params.get('m')
  return { seed, mode: MODES[m] ? m : DEFAULT_MODE }
}

export default function App() {
  // A challenge link lands on its own screen, not the menu.
  const [challenge, setChallenge] = useState(parseChallenge)
  const [phase, setPhase] = useState(challenge ? 'challenge' : 'menu') // menu | challenge | intro | play | reveal | results | board
  const [round, setRound] = useState(0)
  const [plan, setPlan] = useState([]) // { target, base, start } per round, from the seed
  const [results, setResults] = useState([]) // { target, guess, score }
  const [base, setBase] = useState(0)
  const [guess, setGuess] = useState(90)
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME)
  const [muted, setMutedState] = useState(isMuted())
  const [mode, setMode] = useState(challenge ? challenge.mode : DEFAULT_MODE)
  const [players, setPlayers] = useState(challenge ? 'multi' : 'single') // single | multi
  const [paused, setPaused] = useState(false)
  const [seed, setSeed] = useState(null)
  const [name, setName] = useState(() => localStorage.getItem('protractor-name') || '')
  const [board, setBoard] = useState(null) // { entries, rank, local } once loaded
  const [copied, setCopied] = useState(false)

  const roundTime = MODES[mode].time

  const guessRef = useRef(guess)
  const lockedRef = useRef(false)
  const stageRef = useRef(null)

  const setGuessLive = useCallback((g) => {
    guessRef.current = g
    setGuess(g)
  }, [])

  // ---- phase transitions -------------------------------------------------

  const launch = (s) => {
    unlock()
    sfx.click()
    setSeed(s)
    setPlan(gamePlan(s, mode))
    setResults([])
    setRound(0)
    setBoard(null)
    setCopied(false)
    setPhase('intro')
  }

  // An accepted challenge starts with its shared seed so everyone gets the
  // same angles; otherwise roll a fresh seed (which becomes shareable after).
  const startGame = () => launch(challenge ? challenge.seed : randomSeed())

  const beginRound = useCallback(() => {
    // Everything about the round comes from the seeded plan, so a shared
    // seed replays the identical game (Easy pins the green arrow to +x).
    const r = plan[round]
    setBase(r.base)
    setGuessLive(r.start)
    lockedRef.current = false
    setTimeLeft(MODES[mode].time)
    setPhase('play')
  }, [setGuessLive, plan, round, mode])

  const dropChallenge = () => {
    if (!challenge) return
    setChallenge(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

  // Decline a challenge from its landing screen → free play on the menu.
  const exitChallenge = () => {
    sfx.click()
    dropChallenge()
    setPhase('menu')
  }

  // Peek at the challenge's board before playing it.
  const viewChallengeBoard = async () => {
    sfx.click()
    setSeed(challenge.seed)
    setBoard(null)
    setPhase('board')
    setBoard(await fetchBoard({ seed: challenge.seed, mode }))
  }

  // Pick a difficulty on the menu; announce it with the robotic voice on change.
  const selectMode = (id) => {
    if (id === mode || challenge) return
    setMode(id)
    sfx.click()
    playVoice(MODES[id].voice)
  }

  // Single skips the leaderboard flow.
  const selectPlayers = (p) => {
    if (p === players || challenge) return
    setPlayers(p)
    sfx.click()
  }

  const lockIn = useCallback(() => {
    if (lockedRef.current) return
    lockedRef.current = true
    sfx.lock()
    setResults((prev) => {
      const target = plan[prev.length].target
      const g = guessRef.current
      return [...prev, { target, guess: g, score: roundScore(target, g) }]
    })
    setTimeout(() => setPhase('reveal'), 380)
  }, [plan])

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

  // ---- multiplayer: share link + leaderboard ------------------------------

  const shareUrl = seed !== null
    ? `${window.location.origin}${window.location.pathname}?c=${encodeSeed(seed)}&m=${mode}`
    : ''

  const copyChallenge = async () => {
    sfx.click()
    // Phones: the native share sheet is far more reliable than the clipboard
    // (and sends the link straight into a chat). Desktop: copy.
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PROTRACTOR challenge',
          text: `Beat my score — same ${ROUNDS} angles, no excuses.`,
          url: shareUrl,
        })
        return
      } catch (err) {
        if (err.name === 'AbortError') return // user closed the sheet
        // NotAllowedError etc — fall through to the clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // clipboard API unavailable (http / old browser) — legacy fallback
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  // Results → leaderboard screen, submitting the score first if a name was given.
  const goToBoard = async (submit) => {
    sfx.click()
    const total = results.reduce((s, r) => s + r.score, 0)
    const player = cleanName(name)
    setBoard(null)
    setPhase('board')
    if (submit && player) {
      localStorage.setItem('protractor-name', player)
      setBoard(await submitScore({ seed, mode, name: player, total: Math.round(total * 100) / 100 }))
    } else {
      setBoard(await fetchBoard({ seed, mode }))
    }
  }

  const playAgain = () => {
    // Always a fresh seed — replaying memorized angles would poison the
    // board. Leaving a challenge also cleans its params out of the URL.
    if (challenge) {
      setChallenge(null)
      window.history.replaceState(null, '', window.location.pathname)
    }
    launch(randomSeed())
  }

  // ---- render ------------------------------------------------------------

  const lastResult = results[results.length - 1]
  const total = results.reduce((s, r) => s + r.score, 0)
  const playerName = cleanName(name)

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
              <DemoDial />
              <figcaption className="demo-caption">
                Drag the <span className="pink">orange arrow</span> counter-clockwise from the <span className="cyan">blue arrow</span> until the gap <em>feels</em> right — no ticks, no numbers, {roundTime}s × {ROUNDS} rounds.
              </figcaption>
            </figure>

            <div className="toggle-row" data-animate>
              <div className="toggle-group" role="group" aria-label="Players">
                <span className="toggle-label">PLAYERS</span>
                <div className="seg">
                  {[['single', 'SINGLE'], ['multi', 'MULTI']].map(([id, label]) => (
                    <button
                      key={id}
                      className={`seg-btn ${players === id ? 'seg-btn-active' : ''}`}
                      onClick={() => selectPlayers(id)}
                      aria-pressed={players === id}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="toggle-group" role="group" aria-label="Difficulty">
                <span className="toggle-label">DIFFICULTY</span>
                <div className="seg">
                  {Object.values(MODES).map((m) => (
                    <button
                      key={m.id}
                      className={`seg-btn ${mode === m.id ? 'seg-btn-active' : ''}`}
                      onClick={() => selectMode(m.id)}
                      aria-pressed={mode === m.id}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {players === 'multi' && !challenge && (
              <p className="multi-hint" data-animate>
                Finish a run to join the leaderboard and challenge friends to your exact angles.
              </p>
            )}

            <button className="btn btn-primary" data-animate onClick={startGame}>
              START GAME
            </button>
          </section>
        )}

        {phase === 'challenge' && challenge && (
          <section className="screen challenge-screen">
            <div className="chal-badge" data-animate>⚔️</div>
            <h1 className="chal-title" data-animate>YOU'VE BEEN CHALLENGED</h1>
            <p className="chal-sub" data-animate>
              Your rival picked <b>{ROUNDS} secret angles</b> on <b>{MODES[challenge.mode].label}</b>.
              You both play the exact same game — beat their score to take the board.
            </p>
            <button className="btn btn-primary" data-animate onClick={startGame}>
              START CHALLENGE
            </button>
            <button className="btn btn-lock btn-view" data-animate onClick={viewChallengeBoard}>
              VIEW LEADERBOARD
            </button>
            <button className="btn-ghost" data-animate onClick={exitChallenge}>
              no thanks — take me to the game
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
              <span className="target-value">{plan[round]?.target}°</span>
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
                <span className="stat-label target-c">TARGET</span>
                <span className="stat-value target-c">{lastResult.target}°</span>
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

            {players === 'multi' ? (
              <>
                <form
                  className="lb-join"
                  data-animate
                  onSubmit={(e) => { e.preventDefault(); if (playerName) goToBoard(true) }}
                >
                  <input
                    className="name-input"
                    type="text"
                    value={name}
                    maxLength={MAX_NAME}
                    placeholder="YOUR NAME"
                    aria-label="Your name for the leaderboard"
                    onChange={(e) => setName(e.target.value)}
                  />
                  <button className="btn btn-primary btn-join" type="submit" disabled={!playerName}>
                    JOIN LEADERBOARD
                  </button>
                </form>

                <button className="btn-ghost" data-animate onClick={() => goToBoard(false)}>
                  skip → just show the board
                </button>
              </>
            ) : (
              <button className="btn btn-primary" data-animate onClick={playAgain}>
                PLAY AGAIN
              </button>
            )}
          </section>
        )}

        {phase === 'board' && (
          <section className="screen board-screen">
            <p className="results-kicker" data-animate>LEADERBOARD</p>
            <div className="board-sub" data-animate>
              {challenge ? 'FRIEND CHALLENGE' : 'YOUR CHALLENGE'} · {MODES[mode].label}
            </div>

            {board?.local && (
              <div className="board-offline" data-animate>
                ⚠️ Shared leaderboard unreachable — this board only shows scores from this device.
              </div>
            )}

            <div className="board" data-animate>
              {!board && <div className="board-empty">loading…</div>}
              {board && board.entries.length === 0 && (
                <div className="board-empty">No scores yet — you could be first!</div>
              )}
              {board?.entries.map((e, i) => (
                <div
                  className={`board-row ${e.name === playerName ? 'board-row-you' : ''}`}
                  key={`${e.name}-${i}`}
                >
                  <span className="board-rank">{['🥇', '🥈', '🥉'][i] || `${i + 1}`}</span>
                  <span className="board-name">{e.name}</span>
                  <span className="board-score">{e.score.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {board?.rank != null && (
              <p className="board-yourank" data-animate>
                You're <b>#{board.rank}</b> on this challenge
              </p>
            )}

            {challenge && results.length === 0 ? (
              // arrived from a challenge link without playing yet
              <button className="btn btn-primary" data-animate onClick={startGame}>
                START CHALLENGE
              </button>
            ) : (
              <>
                <div className="share-row" data-animate>
                  <button className="btn btn-primary btn-share" onClick={copyChallenge}>
                    {copied ? '✓ LINK COPIED!' : '⚔️ CHALLENGE A FRIEND'}
                  </button>
                  <button className="btn btn-lock btn-again" onClick={playAgain}>
                    PLAY AGAIN
                  </button>
                </div>
                <p className="share-hint" data-animate>
                  The link replays your exact {ROUNDS} angles — winner takes the board.
                </p>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
