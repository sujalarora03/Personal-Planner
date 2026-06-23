import { useEffect, useState, useRef } from 'react'

const POLL_MS = 400

export default function PipView() {
  const [state, setState] = useState(null)
  // Optimistic local overrides — make buttons feel instant
  const [localRunning, setLocalRunning] = useState(null)
  const [flash, setFlash] = useState(null)

  // Poll server state
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/pip/state')
        if (res.ok) {
          const data = await res.json()
          if (data && data.mode) {
            setState(data)
            // Clear optimistic override once server confirms
            setLocalRunning(null)
          }
        }
      } catch {}
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [])

  const sendCmd = async (cmd) => {
    // Optimistic update — instant visual feedback before server round-trip
    if (cmd === 'pause')  setLocalRunning(false)
    if (cmd === 'resume') setLocalRunning(true)
    if (cmd === 'skip' || cmd === 'reset') {
      setFlash(cmd)
      setTimeout(() => setFlash(null), 300)
    }
    try {
      await fetch('/api/pip/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd }),
      })
    } catch {}
  }

  if (!state) {
    return (
      <div style={styles.root}>
        <style>{css}</style>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>Connecting…</span>
        </div>
      </div>
    )
  }

  const {
    mode, timeLeft = 0, focusMins = 25, breakMins = 5,
    longBreakMins = 15, sessions = 0,
  } = state
  const running = localRunning !== null ? localRunning : (state.running ?? false)

  const SESSIONS_BEFORE_LONG = 4
  const totalSecs = mode === 'focus'
    ? focusMins * 60
    : (sessions > 0 && sessions % SESSIONS_BEFORE_LONG === 0 ? longBreakMins : breakMins) * 60

  const pct   = Math.min(100, ((totalSecs - timeLeft) / totalSecs) * 100)
  const mm    = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss    = String(timeLeft % 60).padStart(2, '0')
  const isFocus = mode === 'focus'
  const accent  = isFocus ? '#a78bfa' : '#22d3ee'
  const accentB = isFocus ? 'rgba(167,139,250,0.2)' : 'rgba(34,211,238,0.2)'

  // Arc math
  const SZ = 84, R = 36, SW = 5
  const circ   = 2 * Math.PI * R
  const offset = circ * (1 - pct / 100)

  const isSkipFlash  = flash === 'skip'
  const isResetFlash = flash === 'reset'

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Ambient glow blobs */}
      <div style={{ ...styles.blob, background: isFocus
        ? 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)'
        : 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)',
        top: -40, left: -40, width: 180, height: 180,
        transition: 'background 0.6s',
      }} />
      <div style={{ ...styles.blob,
        background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
        bottom: -30, right: -30, width: 140, height: 140,
      }} />

      {/* ── Main layout ─────────────────────────── */}
      <div style={styles.card}>

        {/* LEFT: Progress ring */}
        <div style={styles.ringWrap}>
          <svg width={SZ} height={SZ} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={SZ/2} cy={SZ/2} r={R} fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
            {/* Glow */}
            <circle cx={SZ/2} cy={SZ/2} r={R} fill="none"
              stroke={accent} strokeWidth={SW + 5} strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              opacity={0.18}
              style={{ filter:'blur(5px)', transition:'stroke-dashoffset 0.85s linear,stroke 0.4s' }} />
            {/* Main */}
            <circle cx={SZ/2} cy={SZ/2} r={R} fill="none"
              stroke={accent} strokeWidth={SW} strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition:'stroke-dashoffset 0.85s linear,stroke 0.4s' }} />
          </svg>
          {/* Emoji in center */}
          <div style={styles.ringEmoji}>{isFocus ? '🎯' : '☕'}</div>
        </div>

        {/* RIGHT: Info + controls */}
        <div style={styles.right}>
          {/* Time */}
          <div style={{ ...styles.time, textShadow:`0 0 24px ${accent}70` }}>
            {mm}<span style={styles.timeSep}>:</span>{ss}
          </div>

          {/* Mode + running badge */}
          <div style={styles.badgeRow}>
            <div style={{
              ...styles.badge,
              background: accentB,
              border: `1px solid ${isFocus ? 'rgba(167,139,250,0.3)' : 'rgba(34,211,238,0.3)'}`,
              color: accent,
            }}>
              {running
                ? (isFocus ? '● FOCUS' : '● BREAK')
                : '⏸ PAUSED'}
            </div>
          </div>

          {/* Session dots */}
          <div style={styles.dotsRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i < (sessions % 4 || (sessions > 0 && sessions % 4 === 0 ? 4 : 0))
                  ? accent : 'rgba(255,255,255,0.12)',
                boxShadow: i < (sessions % 4 || (sessions > 0 && sessions % 4 === 0 ? 4 : 0))
                  ? `0 0 5px ${accent}` : 'none',
                transition: 'all 0.3s',
              }} />
            ))}
            <span style={styles.sessionNum}>#{sessions + 1}</span>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            {/* Reset */}
            <button
              onClick={() => sendCmd('reset')}
              style={{
                ...styles.iconBtn,
                transform: isResetFlash ? 'scale(0.88)' : 'scale(1)',
                background: isResetFlash ? accentB : 'rgba(255,255,255,0.06)',
                borderColor: isResetFlash ? accent : 'rgba(255,255,255,0.1)',
              }}
              title="Restart"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor"
                strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={() => sendCmd(running ? 'pause' : 'resume')}
              style={{
                ...styles.playBtn,
                background: `linear-gradient(135deg, ${accent} 0%, ${isFocus ? '#7c3aed' : '#0891b2'} 100%)`,
                boxShadow: `0 4px 18px ${accent}55`,
                transform: localRunning !== null ? 'scale(0.9)' : 'scale(1)',
              }}
            >
              {running ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>

            {/* Skip */}
            <button
              onClick={() => sendCmd('skip')}
              style={{
                ...styles.iconBtn,
                transform: isSkipFlash ? 'scale(0.88)' : 'scale(1)',
                background: isSkipFlash ? accentB : 'rgba(255,255,255,0.06)',
                borderColor: isSkipFlash ? accent : 'rgba(255,255,255,0.1)',
              }}
              title="Skip"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Browser hint (only visible in browser, hidden in pywebview by size) */}
      <div style={styles.browserHint}>
        📌 pip-view · <a href="http://localhost:7432/pip-view" target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.5 }}>
          localhost:7432/pip-view
        </a>
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  root: {
    width: '100vw', height: '100vh', margin: 0, padding: 0,
    background: 'linear-gradient(135deg, #0f1023 0%, #080914 100%)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', userSelect: 'none', position: 'relative',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  blob: {
    position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
    filter: 'blur(24px)',
  },
  card: {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
    gap: 20, padding: '10px 20px',
    width: '100%', maxWidth: 320, zIndex: 1,
  },
  ringWrap: {
    position: 'relative', width: 84, height: 84,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  ringEmoji: {
    position: 'absolute', fontSize: 20, lineHeight: 1,
    userSelect: 'none',
  },
  right: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 6,
    minWidth: 0,
  },
  time: {
    fontSize: 32, fontWeight: 900, fontFamily: 'monospace',
    color: 'white', letterSpacing: -1, lineHeight: 1,
  },
  timeSep: {
    opacity: 0.5, animation: 'blink 1s step-end infinite',
  },
  badgeRow: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  badge: {
    display: 'inline-flex', alignItems: 'center',
    fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '2px 7px',
    borderRadius: 5, transition: 'all 0.3s',
  },
  dotsRow: {
    display: 'flex', alignItems: 'center', gap: 4,
  },
  sessionNum: {
    fontSize: 9, color: 'rgba(255,255,255,0.25)',
    fontWeight: 700, marginLeft: 3,
  },
  controls: {
    display: 'flex', alignItems: 'center', gap: 7, marginTop: 2,
  },
  iconBtn: {
    width: 32, height: 32, borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s cubic-bezier(.4,0,.2,1)',
    outline: 'none',
  },
  playBtn: {
    width: 44, height: 44, borderRadius: 14, border: 'none',
    color: 'white', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s cubic-bezier(.4,0,.2,1)',
    outline: 'none',
  },
  loading: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 24, height: 24, borderRadius: '50%',
    border: '2px solid rgba(167,139,250,0.2)',
    borderTopColor: '#a78bfa',
    animation: 'spin 0.8s linear infinite',
  },
  browserHint: {
    position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center',
    fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.04em',
    fontFamily: 'monospace',
  },
}

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; overflow: hidden; }
  @keyframes spin  { to { transform: rotate(360deg) } }
  @keyframes blink { 0%,100% { opacity: 0.5 } 50% { opacity: 0.15 } }
  button:hover { filter: brightness(1.15) !important; }
  button:active { transform: scale(0.88) !important; transition: transform 0.08s !important; }
  a:hover { opacity: 0.8; }
`
