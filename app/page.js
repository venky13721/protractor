'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import Confetti from 'react-confetti';

const COLORS = {
  bg: '#0F0F0F',
  card: '#FFFFFF',
  user: '#A3B18A',
  target: '#344E41'
};

const GAME_STATES = {
  MENU: 'MENU',
  PLAY: 'PLAY',
  ROUND_RESULT: 'ROUND_RESULT',
  FINAL_SUMMARY: 'FINAL_SUMMARY'
};

const TOTAL_ROUNDS = 5;
const DIAL_SIZE = 360;
const CENTER = DIAL_SIZE / 2;
const RADIUS = 145;

const wittyPerfect = [
  'Absolute precision.',
  'Laser-guided instincts.',
  'Geometry just applauded.'
];

const wittyMiss = [
  'Acute mistake. Obtuse confidence.',
  'That angle filed a complaint.',
  'Close enough for vibes, not math.'
];

const randomBetween = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toRadians = (degrees) => (degrees * Math.PI) / 180;

const generateTarget = () => Number(randomBetween(5, 175).toFixed(2));

const pickLine = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pointOnDial = (angle, radius = RADIUS) => {
  const x = CENTER + Math.cos(toRadians(180 - angle)) * radius;
  const y = CENTER - Math.sin(toRadians(180 - angle)) * radius;
  return { x, y };
};

const getAngleFromPointer = (clientX, clientY, svgRect) => {
  const x = clientX - svgRect.left;
  const y = clientY - svgRect.top;
  const dx = x - CENTER;
  const dy = CENTER - y;
  const raw = (Math.atan2(dy, -dx) * 180) / Math.PI;
  const normalized = clamp(raw, 0, 180);
  return Number(normalized.toFixed(2));
};

const buildRoundResult = (targetAngle, userAngle, streak, perfectCount) => {
  const error = Math.abs(targetAngle - userAngle);
  const base = Math.max(0, 100 - error);
  const isPerfect = error < 0.5;
  const nextStreak = isPerfect ? streak + 1 : 0;
  const roundScore = isPerfect ? base * Math.pow(1.2, nextStreak) : base;

  return {
    error,
    base,
    isPerfect,
    nextStreak,
    perfectCount: isPerfect ? perfectCount + 1 : perfectCount,
    roundScore
  };
};

const initialState = {
  gameState: GAME_STATES.MENU,
  roundIndex: 0,
  targetAngle: generateTarget(),
  userAngle: 90,
  totalScore: 0,
  streak: 0,
  maxStreak: 0,
  perfectCount: 0,
  lastRound: null,
  feedbackText: ''
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'START':
      return {
        ...initialState,
        gameState: GAME_STATES.PLAY,
        targetAngle: generateTarget(),
        userAngle: 90
      };

    case 'SET_USER_ANGLE':
      return {
        ...state,
        userAngle: action.payload
      };

    case 'SUBMIT_ROUND': {
      const result = buildRoundResult(
        state.targetAngle,
        state.userAngle,
        state.streak,
        state.perfectCount
      );

      return {
        ...state,
        gameState: GAME_STATES.ROUND_RESULT,
        totalScore: state.totalScore + result.roundScore,
        streak: result.nextStreak,
        maxStreak: Math.max(state.maxStreak, result.nextStreak),
        perfectCount: result.perfectCount,
        lastRound: {
          targetAngle: state.targetAngle,
          userAngle: state.userAngle,
          ...result
        },
        feedbackText: result.isPerfect ? pickLine(wittyPerfect) : pickLine(wittyMiss)
      };
    }

    case 'NEXT_ROUND': {
      const nextIndex = state.roundIndex + 1;
      const isFinished = nextIndex >= TOTAL_ROUNDS;
      return {
        ...state,
        roundIndex: nextIndex,
        gameState: isFinished ? GAME_STATES.FINAL_SUMMARY : GAME_STATES.PLAY,
        targetAngle: isFinished ? state.targetAngle : generateTarget(),
        userAngle: 90
      };
    }

    case 'RESET':
      return {
        ...initialState,
        targetAngle: generateTarget()
      };

    default:
      return state;
  }
}

function Dial({ userAngle, targetAngle, showTarget, onAngleChange, disabled }) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const snappedVisualAngle = useMemo(() => {
    const snapTargets = [90, 180];
    for (const snap of snapTargets) {
      if (Math.abs(userAngle - snap) <= 2) {
        return snap;
      }
    }
    return userAngle;
  }, [userAngle]);

  const displayAngleSpring = useSpring(snappedVisualAngle, {
    stiffness: 350,
    damping: 30,
    mass: 0.5
  });

  const displayAngleMV = useMotionValue(userAngle);
  useEffect(() => {
    const unsubscribe = displayAngleSpring.on('change', (v) => displayAngleMV.set(v));
    return unsubscribe;
  }, [displayAngleSpring, displayAngleMV]);

  useEffect(() => {
    displayAngleSpring.set(snappedVisualAngle);
  }, [displayAngleSpring, snappedVisualAngle]);

  const updateFromPointer = (event) => {
    if (!svgRef.current || disabled) return;
    const rect = svgRef.current.getBoundingClientRect();
    const angle = getAngleFromPointer(event.clientX, event.clientY, rect);
    onAngleChange(angle);
  };

  const userEnd = pointOnDial(userAngle);
  const displayEnd = pointOnDial(displayAngleMV.get());
  const targetEnd = pointOnDial(targetAngle);

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
        className="w-full max-w-[420px] cursor-crosshair"
        onPointerDown={(e) => {
          setDragging(true);
          updateFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (dragging) updateFromPointer(e);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <path d={`M ${CENTER - RADIUS} ${CENTER} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${CENTER}`} stroke="#D1D5DB" strokeWidth="10" fill="none" strokeLinecap="round" />

        {[0, 30, 60, 90, 120, 150, 180].map((angle) => {
          const outer = pointOnDial(angle, RADIUS + 3);
          const inner = pointOnDial(angle, RADIUS - 16);
          return (
            <g key={angle}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#111827" strokeWidth="3" />
              <text x={pointOnDial(angle, RADIUS - 33).x} y={pointOnDial(angle, RADIUS - 33).y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700" fill="#374151">
                {angle}°
              </text>
            </g>
          );
        })}

        <line x1={CENTER} y1={CENTER} x2={userEnd.x} y2={userEnd.y} stroke={COLORS.user} strokeOpacity="0.35" strokeWidth="8" strokeLinecap="round" />

        <motion.line
          x1={CENTER}
          y1={CENTER}
          x2={displayEnd.x}
          y2={displayEnd.y}
          stroke={COLORS.user}
          strokeWidth="8"
          strokeLinecap="round"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />

        <circle cx={CENTER} cy={CENTER} r="10" fill="#111827" />

        {showTarget && (
          <motion.line
            x1={CENTER}
            y1={CENTER}
            x2={targetEnd.x}
            y2={targetEnd.y}
            stroke={COLORS.target}
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </svg>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-black/55">{label}</p>
      <p className="text-lg font-black text-black">{value}</p>
    </div>
  );
}

export default function Page() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [copied, setCopied] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const cardTiltX = useMotionValue(0);
  const cardTiltY = useMotionValue(0);

  const resetTilt = () => {
    cardTiltX.set(0);
    cardTiltY.set(0);
  };

  const handleTilt = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const xPct = (event.clientX - rect.left) / rect.width;
    const yPct = (event.clientY - rect.top) / rect.height;
    cardTiltY.set((xPct - 0.5) * 8);
    cardTiltX.set((0.5 - yPct) * 8);
  };

  const copySummary = async () => {
    const summary = `Protractor: ${state.perfectCount}/${TOTAL_ROUNDS} Perfects | Score: ${Math.round(state.totalScore)} | Max Streak: ${state.maxStreak}`;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const roundDisplay = `${Math.min(state.roundIndex + (state.gameState === GAME_STATES.PLAY ? 1 : 0), TOTAL_ROUNDS)}/${TOTAL_ROUNDS}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10" style={{ background: COLORS.bg }}>
      {state.lastRound?.isPerfect && state.gameState === GAME_STATES.ROUND_RESULT && windowSize.width > 0 && (
        <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={220} recycle={false} gravity={0.16} />
      )}

      <motion.div
        onMouseMove={handleTilt}
        onMouseLeave={resetTilt}
        style={{ rotateX: cardTiltX, rotateY: cardTiltY }}
        className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)] md:p-8"
        animate={
          state.gameState === GAME_STATES.ROUND_RESULT && state.lastRound && !state.lastRound.isPerfect
            ? { x: [0, -8, 8, -6, 6, -4, 4, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.45 }}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight text-black">Protractor</h1>
          <div className="rounded-xl bg-black px-3 py-2 text-xs font-bold uppercase tracking-widest text-white">
            Round {roundDisplay}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {state.gameState === GAME_STATES.MENU && (
            <motion.section
              key="menu"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <p className="text-sm font-semibold text-black/70">
                Five rounds. One dial. Drag the arm to match each target angle between 5° and 175°.
                Perfect hits under 0.5° stack clutch multipliers.
              </p>
              <button
                onClick={() => dispatch({ type: 'START' })}
                className="rounded-2xl bg-black px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:scale-[1.02]"
              >
                Start Session
              </button>
            </motion.section>
          )}

          {state.gameState === GAME_STATES.PLAY && (
            <motion.section
              key="play"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatPill label="Target" value={`${state.targetAngle.toFixed(2)}°`} />
                <StatPill label="Your Angle" value={`${state.userAngle.toFixed(2)}°`} />
                <StatPill label="Streak" value={state.streak} />
                <StatPill label="Score" value={Math.round(state.totalScore)} />
              </div>

              <div className="flex justify-center">
                <Dial
                  userAngle={state.userAngle}
                  targetAngle={state.targetAngle}
                  showTarget={false}
                  onAngleChange={(nextAngle) => dispatch({ type: 'SET_USER_ANGLE', payload: nextAngle })}
                />
              </div>

              <button
                onClick={() => dispatch({ type: 'SUBMIT_ROUND' })}
                className="w-full rounded-2xl border-2 border-black bg-black px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
              >
                Lock Guess
              </button>
            </motion.section>
          )}

          {state.gameState === GAME_STATES.ROUND_RESULT && state.lastRound && (
            <motion.section
              key="result"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatPill label="Target" value={`${state.lastRound.targetAngle.toFixed(2)}°`} />
                <StatPill label="Your Angle" value={`${state.lastRound.userAngle.toFixed(2)}°`} />
                <StatPill label="Error" value={`${state.lastRound.error.toFixed(2)}°`} />
                <StatPill label="Round Score" value={state.lastRound.roundScore.toFixed(2)} />
              </div>

              <div className="flex justify-center">
                <Dial
                  userAngle={state.lastRound.userAngle}
                  targetAngle={state.lastRound.targetAngle}
                  showTarget
                  disabled
                  onAngleChange={() => {}}
                />
              </div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm font-black uppercase tracking-widest text-black"
              >
                {state.feedbackText}
              </motion.p>

              <button
                onClick={() => dispatch({ type: 'NEXT_ROUND' })}
                className="w-full rounded-2xl bg-black px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:scale-[1.01]"
              >
                {state.roundIndex + 1 >= TOTAL_ROUNDS ? 'View Final Summary' : 'Next Round'}
              </button>
            </motion.section>
          )}

          {state.gameState === GAME_STATES.FINAL_SUMMARY && (
            <motion.section
              key="summary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatPill label="Total Score" value={state.totalScore.toFixed(2)} />
                <StatPill label="Perfect Hits" value={`${state.perfectCount}/${TOTAL_ROUNDS}`} />
                <StatPill label="Max Streak" value={state.maxStreak} />
              </div>

              <div className="rounded-2xl border border-black/10 bg-black/5 p-4 text-sm font-semibold text-black/70">
                {`Protractor: ${state.perfectCount}/${TOTAL_ROUNDS} Perfects | Score: ${Math.round(
                  state.totalScore
                )} | Max Streak: ${state.maxStreak}`}
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <button
                  onClick={copySummary}
                  className="flex-1 rounded-2xl border-2 border-black bg-white px-6 py-3 text-sm font-black uppercase tracking-widest text-black transition hover:bg-black hover:text-white"
                >
                  {copied ? 'Copied.' : 'Copy Summary'}
                </button>

                <button
                  onClick={() => dispatch({ type: 'RESET' })}
                  className="flex-1 rounded-2xl bg-black px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:scale-[1.01]"
                >
                  Play Again
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
