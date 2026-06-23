import { useEffect, useState, useRef } from 'react'

const POLL_MS = 800

export default function PipView() {
  const [state, setState] = useState(null)
  const intervalRef = useRef(null)

  // Poll backend for timer state
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
      <div style={{
        width: '100vw', height: '100vh',
        background: 'linear-gradient(135deg, #111326 0%, #080914 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'system-ui',
        userSelect: 'none',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏱</div>
          Waiting for timer…
        </div>
      </div>
    )
  }

  const { mode, timeLeft, running, focusMins, breakMins, longBreakMins, sessions } = state
  const SESSIONS_BEFORE_LONG = 4
  const totalSecs = mode === 'focus'
    ? (focusMins || 25) * 60
    : ((sessions > 0 && sessions % SESSIONS_BEFORE_LONG === 0) ? (longBreakMins || 15) : (breakMins || 5)) * 60

  const pct = Math.min(100, ((totalSecs - (timeLeft || 0)) / totalSecs) * 100)
  const mm = String(Math.floor((timeLeft || 0) / 60)).padStart(2, '0')
  const ss = String((timeLeft || 0) % 60).padStart(2, '0')
  const accent = mode === 'focus' ? '#8b5cf6' : '#06b6d4'
  const R = 32
  const circumference = 2 * Math.PI * R

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #111326 0%, #080914 100%)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', boxSizing: 'border-box', gap: 20,
      overflow: 'hidden', userSelect: 'none',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Progress circle */}
      <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={80} height={80} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx={40} cy={40} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={4} />
          <circle cx={40} cy={40} r={R} fill="none" stroke={accent} strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
        </svg>
        <span style={{ fontSize: 18 }}>{mode === 'focus' ? '🎯' : '☕'}</span>
      </div>

      {/* Right: time + controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'monospace', color: 'white', letterSpacing: -1, lineHeight: 1 }}>
            {mm}:{ss}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 800, color: accent,
            background: `${accent}15`, border: `1px solid ${accent}30`,
            borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {mode === 'focus' ? 'Focus' : 'Break'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {/* Pause / Resume */}
          <button onClick={() => sendCmd(running ? 'pause' : 'resume')} style={{
            flex: 1.5, background: accent, color: 'white', border: 'none',
            borderRadius: 8, padding: '8px 12px', fontSize: 11, fontWeight: 800,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: running ? `0 0 12px ${accent}44` : 'none', transition: 'all 0.2s',
          }}>
            {running ? (
              <><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pause</>
            ) : (
              <><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>Resume</>
            )}
          </button>
          {/* Reset */}
          <button onClick={() => sendCmd('reset')} style={{
            width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
          }} title="Restart">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          </button>
          {/* Skip */}
          <button onClick={() => sendCmd('skip')} style={{
            width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
          }} title="Skip">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
