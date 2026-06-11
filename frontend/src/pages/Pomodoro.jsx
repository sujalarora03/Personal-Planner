import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'
import { api } from '../api/client'

const FOCUS_MIN  = 25
const BREAK_MIN  = 5
const LONG_BREAK_MIN = 15
const SESSIONS_BEFORE_LONG = 4
const CATEGORIES = ['Work', 'Study', 'Personal', 'Exercise', 'Other']

export default function Pomodoro({
  mode,
  timeLeft,
  running,
  sessions,
  task,
  category,
  projectId,
  setMode,
  setTimeLeft,
  setRunning,
  setSessions,
  setTask,
  setCategory,
  setProjectId,
  reset,
  skip,
  switchMode
}) {
  const [projects, setProjects] = useState([])

  useEffect(() => { 
    api.getProjects().then(setProjects).catch(() => {}) 
  }, [])

  const totalSecs = () => {
    if (mode === 'focus') return FOCUS_MIN * 60
    return (sessions > 0 && sessions % SESSIONS_BEFORE_LONG === 0 ? LONG_BREAK_MIN : BREAK_MIN) * 60
  }

  const pct = ((totalSecs() - timeLeft) / totalSecs()) * 100
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')
  const accent = mode === 'focus' ? '#7c3aed' : '#06b6d4'
  const R = 108
  const circumference = 2 * Math.PI * R

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Focus Timer</h1>
        <p className="page-sub">{sessions} session{sessions !== 1 ? 's' : ''} completed · {sessions * FOCUS_MIN} min logged today</p>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
        {[
          ['focus', '🎯 Focus', FOCUS_MIN],
          ['break', '☕ Break', BREAK_MIN]
        ].map(([m, label, mins]) => (
          <button key={m}
            className={`btn btn-sm ${mode === m ? 'btn-purple' : 'btn-ghost'}`}
            style={mode === m ? { background: `${accent}22`, borderColor: accent, color: accent } : {}}
            onClick={() => switchMode(m)}>
            {label} ({mins}m)
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Timer ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <div style={{ position: 'relative' }}>
            <svg width={260} height={260} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={130} cy={130} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
              <circle cx={130} cy={130} r={R} fill="none" stroke={accent} strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct / 100)}
                style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 58, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'white', lineHeight: 1, letterSpacing: -1 }}>
                {mm}:{ss}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8, textTransform: 'uppercase', letterSpacing: 3 }}>
                {mode === 'focus' ? 'Focus' : sessions > 0 && sessions % SESSIONS_BEFORE_LONG === 0 ? 'Long Break' : 'Break'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button className="btn btn-ghost" title="Reset" onClick={reset}><RotateCcw size={17} /></button>
            <motion.button
              className="btn btn-purple"
              style={{ width: 120, justifyContent: 'center', gap: 8, background: accent, borderColor: accent, boxShadow: running ? `0 0 24px ${accent}66` : 'none' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRunning(r => !r)}>
              {running ? <><Pause size={17} /> Pause</> : <><Play size={17} /> {timeLeft === totalSecs() ? 'Start' : 'Resume'}</>}
            </motion.button>
            <button className="btn btn-ghost" title="Skip to next phase" onClick={skip}><SkipForward size={17} /></button>
          </div>

          {/* Session dots */}
          {sessions > 0 && (
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginRight: 4 }}>Today:</span>
              {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
                <div key={i} style={{
                  width: 11, height: 11, borderRadius: '50%',
                  background: (i + 1) % SESSIONS_BEFORE_LONG === 0 ? '#06b6d4' : '#7c3aed',
                }} />
              ))}
              {sessions > 8 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>+{sessions - 8}</span>}
            </div>
          )}
        </div>

        {/* Session config */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="glass" style={{ padding: 24, flex: 1, minWidth: 280 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            SESSION DETAILS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>What are you working on?</label>
              <input value={task} onChange={e => setTask(e.target.value)}
                placeholder="e.g. Write report, review PRs…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {projects.length > 0 && (
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Project</label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)}>
                    <option value="">— None —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="glass" style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>HOW IT WORKS</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
              🎯 Work for <strong style={{ color: '#a78bfa' }}>25 min</strong>, then take a <strong style={{ color: '#22d3ee' }}>5 min break</strong>.<br />
              Every 4 sessions → <strong style={{ color: '#22d3ee' }}>15 min long break</strong>.<br />
              Completed sessions are <strong style={{ color: '#34d399' }}>auto-logged</strong> to Work Hours.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
