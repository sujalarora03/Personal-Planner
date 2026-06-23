import { useEffect, useState, useRef } from 'react'

const POLL_MS = 400

// Smooth animated gradient ring
function ArcRing({ pct, accent, size = 120, strokeWidth = 6 }) {
  const R = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * R
  const offset = circ * (1 - Math.min(pct, 100) / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={R} fill="none"
        stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      {/* Glow layer */}
      <circle cx={size / 2} cy={size / 2} r={R} fill="none"
        stroke={accent} strokeWidth={strokeWidth + 4} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        opacity={0.15}
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s', filter: `blur(4px)` }} />
      {/* Main arc */}
      <circle cx={size / 2} cy={size / 2} r={R} fill="none"
        stroke={accent} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s' }} />
    </svg>
  )
}

export default function PipView() {
  const [state, setState] = useState(null)
  const [cmdSent, setCmdSent] = useState(null) // flash feedback
  const intervalRef = useRef(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/pip/state')
        if (res.ok) {
          const data = await res.json()
          if (data && data.mode) setState(data)
        }
      } catch {}
    }
    poll()
    intervalRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(intervalRef.current)
  }, [])

  const sendCmd = async (cmd) => {
    setCmdSent(cmd)
    setTimeout(() => setCmdSent(null), 350)
    try {
      await fetch('/api/pip/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd }),
      })
    } catch {}
  }

  // ── Styles ─────────────────────────────────────────────────────────────
  const bg = `
    radial-gradient(ellipse at 30% 0%, rgba(124,58,237,0.18) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 100%, rgba(6,182,212,0.12) 0%, transparent 55%),
    linear-gradient(160deg, #0f1023 0%, #080914 100%)
  `

  const btnBase = {
    border: 'none', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  }

  if (!state) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.25)', fontSize: 12,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        userSelect: 'none', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '2px solid rgba(124,58,237,0.3)',
          borderTopColor: '#7c3aed',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        Starting timer…
      </div>
    )
  }

  const { mode, timeLeft = 0, running, focusMins = 25, breakMins = 5, longBreakMins = 15, sessions = 0 } = state
  const SESSIONS_BEFORE_LONG = 4
  const totalSecs = mode === 'focus'
    ? focusMins * 60
    : (sessions > 0 && sessions % SESSIONS_BEFORE_LONG === 0 ? longBreakMins : breakMins) * 60

  const pct = Math.min(100, ((totalSecs - timeLeft) / totalSecs) * 100)
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')
  const accent = mode === 'focus' ? '#a78bfa' : '#22d3ee'
  const accentDim = mode === 'focus' ? 'rgba(167,139,250,0.15)' : 'rgba(34,211,238,0.15)'
  const accentBorder = mode === 'focus' ? 'rgba(167,139,250,0.25)' : 'rgba(34,211,238,0.25)'
  const SIZE = 110

  const iconBtn = (cmd, icon, label) => {
    const active = cmdSent === cmd
    return (
      <button
        onClick={() => sendCmd(cmd)}
        title={label}
        style={{
          ...btnBase,
          width: 36, height: 36, borderRadius: 10,
          background: active ? accentDim : 'rgba(255,255,255,0.05)',
          border: `1px solid ${active ? accentBorder : 'rgba(255,255,255,0.08)'}`,
          color: active ? accent : 'rgba(255,255,255,0.7)',
          transform: active ? 'scale(0.92)' : 'scale(1)',
          boxShadow: active ? `0 0 14px ${accentDim}` : 'none',
        }}
      >
        {icon}
      </button>
    )
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      userSelect: 'none', overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        animation: 'fadeUp 0.4s ease',
      }}>
        {/* Ring + time */}
        <div style={{ position: 'relative', width: SIZE, height: SIZE,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArcRing pct={pct} accent={accent} size={SIZE} />

          {/* Glow orb behind */}
          <div style={{
            position: 'absolute', width: SIZE * 0.5, height: SIZE * 0.5, borderRadius: '50%',
            background: `radial-gradient(circle, ${accentDim} 0%, transparent 70%)`,
            filter: 'blur(10px)',
          }} />

          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <div style={{
              fontSize: 26, fontWeight: 900, fontFamily: 'monospace',
              letterSpacing: -1, lineHeight: 1,
              color: 'white',
              textShadow: `0 0 20px ${accent}80`,
            }}>
              {mm}:{ss}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: accent,
              marginTop: 3,
              animation: running ? 'none' : 'pulse 2s ease-in-out infinite',
            }}>
              {mode === 'focus' ? (running ? '● Focus' : '⏸ Paused') : (running ? '● Break' : '⏸ Break')}
            </div>
          </div>
        </div>

        {/* Session dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < (sessions % 4) ? accent : 'rgba(255,255,255,0.1)',
              boxShadow: i < (sessions % 4) ? `0 0 6px ${accent}` : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 4, lineHeight: '6px', paddingTop: 1 }}>
            #{sessions + 1}
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Reset */}
          {iconBtn('reset',
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>,
            'Restart'
          )}

          {/* Play / Pause — main action */}
          <button
            onClick={() => sendCmd(running ? 'pause' : 'resume')}
            style={{
              ...btnBase,
              width: 52, height: 52, borderRadius: 16,
              background: `linear-gradient(135deg, ${accent}, ${mode === 'focus' ? '#7c3aed' : '#0891b2'})`,
              boxShadow: `0 4px 20px ${accent}55, 0 0 0 1px ${accentBorder}`,
              color: 'white',
              transform: cmdSent === (running ? 'pause' : 'resume') ? 'scale(0.9)' : 'scale(1)',
              fontSize: 18,
            }}
          >
            {running ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          {/* Skip */}
          {iconBtn('skip',
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
            </svg>,
            'Skip'
          )}
        </div>

        {/* Mode label */}
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em',
          textTransform: 'uppercase', fontWeight: 600,
        }}>
          {mode === 'focus' ? '🎯 Focus Session' : '☕ Rest & Recharge'}
        </div>
      </div>
    </div>
  )
}
