import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import { Download, X, Play, Pause, Music, Volume2, VolumeX } from 'lucide-react'
import Sidebar from './components/Sidebar'
import AuroraBackground from './components/AuroraBackground'
import CommandPalette from './components/CommandPalette'
import { api } from './api/client'
import Home       from './pages/Home'
import Profile    from './pages/Profile'
import Dashboard  from './pages/Dashboard'
import Tasks      from './pages/Tasks'
import WorkHours  from './pages/WorkHours'
import Projects   from './pages/Projects'
import Targets    from './pages/Targets'
import Courses    from './pages/Courses'
import Career     from './pages/Career'
import AI         from './pages/AI'
import Relax      from './pages/Relax'
import Pomodoro   from './pages/Pomodoro'
import Habits     from './pages/Habits'
import Notes      from './pages/Notes'
import Planner    from './pages/Planner'
import Updates    from './pages/Updates'
import About      from './pages/About'
import Analytics  from './pages/Analytics'
import CalendarView from './pages/CalendarView'
import Achievements from './pages/Achievements'
import Settings from './pages/Settings'
import WeeklyReview from './pages/WeeklyReview'

// Apply saved accent theme on startup (before React render)
;(() => {
  const theme = localStorage.getItem('pp_theme')
  if (theme && theme !== 'purple') {
    document.documentElement.setAttribute('data-theme', theme)
  }
})()

const pageVariants = {
  initial: { opacity: 0, scale: 0.97, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit:    { opacity: 0, scale: 1.03, y: -10 },
}

// Determine the best playback mode for a song
const songMode = (song) => {
  if (!song) return null
  if (song.yt_found && song.audio_url) return 'youtube'
  if (song.itunes_found && song.preview_url) return 'itunes'
  return null
}

const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function PomodoroPip({
  mode,
  timeLeft,
  running,
  sessions,
  focusMins,
  breakMins,
  longBreakMins,
  setRunning,
  reset,
  skip,
}) {
  const SESSIONS_BEFORE_LONG = 4
  const totalSecs = () => {
    if (mode === 'focus') return focusMins * 60
    return (sessions > 0 && sessions % SESSIONS_BEFORE_LONG === 0 ? longBreakMins : breakMins) * 60
  }

  const pct = ((totalSecs() - timeLeft) / totalSecs()) * 100
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')
  const accent = mode === 'focus' ? '#8b5cf6' : '#06b6d4'
  const R = 32
  const circumference = 2 * Math.PI * R

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #111326 0%, #080914 100%)',
      overflow: 'hidden',
      gap: 20
    }}>
      {/* Left side: Sleek mini progress circle */}
      <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={80} height={80} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx={40} cy={40} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={4} />
          <circle cx={40} cy={40} r={R} fill="none" stroke={accent} strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
        </svg>
        <span style={{ fontSize: 18 }}>
          {mode === 'focus' ? '🎯' : '☕'}
        </span>
      </div>

      {/* Right side: Time, Status, and Controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'monospace', color: 'white', letterSpacing: -1, lineHeight: 1 }}>
            {mm}:{ss}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: accent,
            background: `${accent}15`,
            border: `1px solid ${accent}30`,
            borderRadius: 6,
            padding: '2px 8px',
            textTransform: 'uppercase',
            letterSpacing: 1
          }}>
            {mode === 'focus' ? 'Focus' : 'Break'}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {/* Pause / Resume */}
          <button 
            onClick={() => setRunning(r => !r)} 
            style={{
              flex: 1.5,
              background: accent,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: running ? `0 0 12px ${accent}44` : 'none',
              transition: 'background 0.2s, transform 0.1s'
            }}
          >
            {running ? (
              <>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                Pause
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Resume
              </>
            )}
          </button>
          
          {/* Restart */}
          <button 
            onClick={reset} 
            style={{
              width: 32,
              height: 32,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.8)',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Restart Timer"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
          </button>

          {/* Skip / Next */}
          <button 
            onClick={skip} 
            style={{
              width: 32,
              height: 32,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.8)',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Skip to next phase"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="currentColor" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function AnimatedRoutes({
  // Pomodoro timer states & handlers
  pomodoroMode, pomodoroTimeLeft, pomodoroRunning, pomodoroSessions,
  pomodoroTask, pomodoroCategory, pomodoroProjectId,
  focusMins, breakMins, longBreakMins,
  updateFocusMins, updateBreakMins, updateLongBreakMins,
  startPip, pipActive,
  setPomodoroMode, setPomodoroTimeLeft, setPomodoroRunning, setPomodoroSessions,
  setPomodoroTask, setPomodoroCategory, setPomodoroProjectId,
  resetPomodoro, skipPomodoro, switchPomodoroMode,
  // Audio global states & handlers
  globalSongs, setGlobalSongs, globalPlayingIdx, setGlobalPlayingIdx,
  globalIsPlaying, globalCurrentTime, globalDuration, globalVolume,
  handlePlayPause, seekTo, adjustVolume
}) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}
      >
        <Routes location={location}>
          <Route path="/"           element={<Home />} />
          <Route path="/profile"    element={<Profile />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/planner"    element={<Planner />} />
          <Route path="/tasks"      element={<Tasks />} />
          <Route path="/work-hours" element={<WorkHours />} />
          <Route path="/focus"      element={
            <Pomodoro
              mode={pomodoroMode}
              timeLeft={pomodoroTimeLeft}
              running={pomodoroRunning}
              sessions={pomodoroSessions}
              task={pomodoroTask}
              category={pomodoroCategory}
              projectId={pomodoroProjectId}
              focusMins={focusMins}
              breakMins={breakMins}
              longBreakMins={longBreakMins}
              updateFocusMins={updateFocusMins}
              updateBreakMins={updateBreakMins}
              updateLongBreakMins={updateLongBreakMins}
              startPip={startPip}
              pipActive={pipActive}
              setMode={setPomodoroMode}
              setTimeLeft={setPomodoroTimeLeft}
              setRunning={setPomodoroRunning}
              setSessions={setPomodoroSessions}
              setTask={setPomodoroTask}
              setCategory={setPomodoroCategory}
              setProjectId={setPomodoroProjectId}
              reset={resetPomodoro}
              skip={skipPomodoro}
              switchMode={switchPomodoroMode}
            />
          } />
          <Route path="/projects"   element={<Projects />} />
          <Route path="/targets"    element={<Targets />} />
          <Route path="/habits"     element={<Habits />} />
          <Route path="/notes"      element={<Notes />} />
          <Route path="/courses"    element={<Courses />} />
          <Route path="/career"     element={<Career />} />
          <Route path="/ai"         element={<AI />} />
          <Route path="/analytics"  element={<Analytics />} />
          <Route path="/calendar"   element={<CalendarView />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/settings"   element={<Settings />} />
          <Route path="/relax"      element={
            <Relax
              globalSongs={globalSongs}
              setGlobalSongs={setGlobalSongs}
              globalPlayingIdx={globalPlayingIdx}
              setGlobalPlayingIdx={setGlobalPlayingIdx}
              globalIsPlaying={globalIsPlaying}
              globalCurrentTime={globalCurrentTime}
              globalDuration={globalDuration}
              globalVolume={globalVolume}
              handlePlayPause={handlePlayPause}
              seekTo={seekTo}
              adjustVolume={adjustVolume}
            />
          } />
          <Route path="/updates"    element={<Updates />} />
          <Route path="/app-info"    element={<About />} />
          <Route path="/weekly-review" element={<WeeklyReview />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function FirstRunModal({ onClose }) {
  const [step, setStep]           = useState(1)
  const [form, setForm]           = useState({ name: '', role: '', company: '', experience_years: 0 })
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await api.saveProfile({ ...form, experience_years: +form.experience_years })
    } catch (_) {}
    setSaving(false)
    setStep(2)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      await fetch('/api/resumes/upload', { method: 'POST', body: fd })
      setUploadDone(true)
    } catch (_) {}
    setUploading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(3,4,14,0.88)', backdropFilter: 'blur(8px)',
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass"
        style={{ width: 'min(520px, 100%)', borderRadius: 18, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>👋 Welcome to Personal Planner</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Quick setup — takes less than a minute</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1, height: 3, borderRadius: 2, transition: 'background 0.3s',
                background: s <= step ? '#7c3aed' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
            Step {step} of 2 — {step === 1 ? 'Your Profile' : 'Resume Upload (optional)'}
          </div>
        </div>

        {/* Step 1: Profile form */}
        {step === 1 && (
          <form onSubmit={handleSaveProfile} style={{ padding: '22px 26px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Full Name *</label>
                <input required value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Your full name" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Role / Title</label>
                  <input value={form.role} onChange={e => set('role', e.target.value)}
                    placeholder="e.g. Software Engineer" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Company</label>
                  <input value={form.company} onChange={e => set('company', e.target.value)}
                    placeholder="Where you work" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Years of Experience</label>
                <input type="number" min={0} step={0.5}
                  value={form.experience_years} onChange={e => set('experience_years', e.target.value)}
                  style={{ width: 130 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>Skip</button>
              <button type="submit" className="btn btn-purple" disabled={saving}>
                {saving ? 'Saving…' : 'Save & Continue →'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Resume upload */}
        {step === 2 && (
          <div style={{ padding: '22px 26px' }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4, lineHeight: 1.6 }}>
              Upload your resume so AI can analyse your skills and give personalised career advice.
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>
              PDF, DOCX or TXT — processed locally, never sent to any cloud.
            </div>

            {!uploadDone ? (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, cursor: uploading ? 'wait' : 'pointer',
                background: 'rgba(124,58,237,0.07)', border: '2px dashed rgba(124,58,237,0.35)',
                borderRadius: 12, padding: '32px 20px', color: '#a78bfa', fontSize: 14,
                transition: 'border-color 0.2s',
              }}>
                <span style={{ fontSize: 36 }}>{uploading ? '⏳' : '📄'}</span>
                <span style={{ fontWeight: 600 }}>{uploading ? 'Uploading…' : 'Click to choose file'}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>PDF · DOCX · TXT</span>
                <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleUpload}
                  disabled={uploading} style={{ display: 'none' }} />
              </label>
            ) : (
              <div style={{
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 12, padding: '18px 20px', color: '#34d399', fontSize: 14, textAlign: 'center',
              }}>
                ✓ Resume uploaded — skills extracted automatically!
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              {!uploadDone && (
                <button className="btn btn-ghost" onClick={onClose}>Skip for now</button>
              )}
              {uploadDone && (
                <button className="btn btn-purple" onClick={onClose}>Get Started →</button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function AppShell() {
  const navigate = useNavigate()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [updateInfo, setUpdateInfo]         = useState(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Pomodoro Focus Timer global states
  const [focusMins, setFocusMins] = useState(() => {
    const saved = localStorage.getItem('pomodoro_focus_mins')
    return saved ? parseInt(saved, 10) : 25
  })
  const [breakMins, setBreakMins] = useState(() => {
    const saved = localStorage.getItem('pomodoro_break_mins')
    return saved ? parseInt(saved, 10) : 5
  })
  const [longBreakMins, setLongBreakMins] = useState(() => {
    const saved = localStorage.getItem('pomodoro_long_break_mins')
    return saved ? parseInt(saved, 10) : 15
  })

  const [pomodoroMode, setPomodoroMode]         = useState('focus')
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(() => {
    const saved = localStorage.getItem('pomodoro_focus_mins')
    return (saved ? parseInt(saved, 10) : 25) * 60
  })
  const [pomodoroRunning, setPomodoroRunning]   = useState(false)
  const [pomodoroSessions, setPomodoroSessions] = useState(0)
  const [pomodoroTask, setPomodoroTask]         = useState('')
  const [pomodoroCategory, setPomodoroCategory] = useState('Work')
  const [pomodoroProjectId, setPomodoroProjectId] = useState('')

  const SESSIONS_BEFORE_LONG = 4

  const updateFocusMins = (mins) => {
    setFocusMins(mins)
    localStorage.setItem('pomodoro_focus_mins', mins)
    if (pomodoroMode === 'focus' && !pomodoroRunning) {
      setPomodoroTimeLeft(mins * 60)
    }
  }
  const updateBreakMins = (mins) => {
    setBreakMins(mins)
    localStorage.setItem('pomodoro_break_mins', mins)
    if (pomodoroMode === 'break' && !pomodoroRunning) {
      const isLong = pomodoroSessions > 0 && pomodoroSessions % SESSIONS_BEFORE_LONG === 0
      if (!isLong) setPomodoroTimeLeft(mins * 60)
    }
  }
  const updateLongBreakMins = (mins) => {
    setLongBreakMins(mins)
    localStorage.setItem('pomodoro_long_break_mins', mins)
    if (pomodoroMode === 'break' && !pomodoroRunning) {
      const isLong = pomodoroSessions > 0 && pomodoroSessions % SESSIONS_BEFORE_LONG === 0
      if (isLong) setPomodoroTimeLeft(mins * 60)
    }
  }

  // Picture-in-Picture window state
  const [pipWindow, setPipWindow] = useState(null)

  const startPip = async () => {
    if (!window.documentPictureInPicture) {
      toast.error("Picture-in-Picture not supported in this environment")
      return
    }
    if (pipWindow) {
      pipWindow.close()
      return
    }
    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 180,
      })

      // Copy stylesheets to PiP document
      const styleSheets = Array.from(document.styleSheets)
      for (const sheet of styleSheets) {
        try {
          const cssRules = Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('')
          const style = document.createElement('style')
          style.textContent = cssRules
          pip.document.head.appendChild(style)
        } catch (e) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = sheet.href
          pip.document.head.appendChild(link)
        }
      }

      // Add basic reset and style to PiP window
      const baseStyle = pip.document.createElement('style')
      baseStyle.textContent = `
        body {
          margin: 0;
          padding: 0;
          background: #0b0c16;
          color: white;
          font-family: 'Segoe UI', system-ui, sans-serif;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
      `
      pip.document.head.appendChild(baseStyle)

      pip.addEventListener('pagehide', () => {
        setPipWindow(null)
      })

      setPipWindow(pip)
    } catch (err) {
      console.error(err)
      toast.error("Failed to open Picture-in-Picture")
    }
  }

  // Show PiP tip on start
  useEffect(() => {
    if (pomodoroRunning) {
      const tipShown = localStorage.getItem('pp_pip_tip_shown')
      if (!tipShown && window.documentPictureInPicture) {
        toast('Tip: Click the PIP button to keep the timer always on top!', {
          icon: '📺',
          duration: 6000
        })
        localStorage.setItem('pp_pip_tip_shown', 'true')
      }
    }
  }, [pomodoroRunning])

  const pomodoroStateRef = useRef({ 
    mode: pomodoroMode, 
    sessions: pomodoroSessions, 
    task: pomodoroTask, 
    category: pomodoroCategory, 
    projectId: pomodoroProjectId 
  })
  pomodoroStateRef.current = { 
    mode: pomodoroMode, 
    sessions: pomodoroSessions, 
    task: pomodoroTask, 
    category: pomodoroCategory, 
    projectId: pomodoroProjectId 
  }

  const pomodoroTimerRef = useRef(null)
  const pomodoroCompletedRef = useRef(false)

  const doPomodoroComplete = () => {
    const { mode: m, sessions: s, task: tk, category: cat, projectId: pid } = pomodoroStateRef.current
    if (m === 'focus') {
      const newS = s + 1
      setPomodoroSessions(newS)
      api.logWork({
        duration_minutes: focusMins,
        description: tk || 'Pomodoro focus session',
        category: cat || 'Work',
        project_id: pid ? +pid : null,
        date: new Date().toISOString().slice(0, 10),
      }).catch(() => {})
      toast.success(`🍅 Session ${newS} done! ${focusMins}min logged to Work Hours.`)
      const breakSecs = newS % SESSIONS_BEFORE_LONG === 0 ? longBreakMins * 60 : breakMins * 60
      setPomodoroMode('break')
      setPomodoroTimeLeft(breakSecs)
    } else {
      setPomodoroMode('focus')
      setPomodoroTimeLeft(focusMins * 60)
      toast('☕ Break over — ready to focus?', { icon: '🎯' })
    }
  }

  const doPomodoroCompleteRef = useRef(doPomodoroComplete)
  doPomodoroCompleteRef.current = doPomodoroComplete

  useEffect(() => {
    if (!pomodoroRunning) {
      clearInterval(pomodoroTimerRef.current)
      return
    }
    pomodoroCompletedRef.current = false
    pomodoroTimerRef.current = setInterval(() => {
      setPomodoroTimeLeft(t => {
        if (t <= 1) {
          clearInterval(pomodoroTimerRef.current)
          setPomodoroRunning(false)
          if (!pomodoroCompletedRef.current) {
            pomodoroCompletedRef.current = true
            setTimeout(() => doPomodoroCompleteRef.current(), 10)
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(pomodoroTimerRef.current)
  }, [pomodoroRunning])

  const resetPomodoro = () => {
    clearInterval(pomodoroTimerRef.current)
    setPomodoroRunning(false)
    setPomodoroTimeLeft(pomodoroMode === 'focus' ? focusMins * 60 : (pomodoroSessions > 0 && pomodoroSessions % SESSIONS_BEFORE_LONG === 0 ? longBreakMins : breakMins) * 60)
  }

  const skipPomodoro = () => {
    doPomodoroCompleteRef.current()
  }

  const switchPomodoroMode = (m) => {
    clearInterval(pomodoroTimerRef.current)
    setPomodoroRunning(false)
    setPomodoroMode(m)
    setPomodoroTimeLeft(m === 'focus' ? focusMins * 60 : (pomodoroSessions > 0 && pomodoroSessions % SESSIONS_BEFORE_LONG === 0 ? longBreakMins : breakMins) * 60)
  }

  // Audio global states
  const [globalSongs, setGlobalSongs] = useState([])
  const [globalPlayingIdx, setGlobalPlayingIdx] = useState(null)
  const [globalIsPlaying, setGlobalIsPlaying] = useState(false)
  const [globalCurrentTime, setGlobalCurrentTime] = useState(0)
  const [globalDuration, setGlobalDuration] = useState(30)
  const [globalVolume, setGlobalVolume] = useState(1)

  const audioRef = useRef(null)
  const idxRef = useRef(null)
  const songsRef = useRef([])
  idxRef.current = globalPlayingIdx
  songsRef.current = globalSongs

  const startPlay = (idx, songsList = songsRef.current) => {
    const audio = audioRef.current
    const song = songsList[idx]
    if (!audio || !song) return
    const mode = songMode(song)
    const url = mode === 'youtube' ? song.audio_url : song?.preview_url
    if (!url) return
    audio.pause()
    audio.src = url
    audio.load()
    audio.play().catch(() => {})
    setGlobalPlayingIdx(idx)
    setGlobalCurrentTime(0)
  }

  const startPlayRef = useRef(startPlay)
  startPlayRef.current = startPlay

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio
    audio.volume = globalVolume

    const onTimeUpdate = () => setGlobalCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setGlobalDuration(audio.duration || 30)
    const onPlay = () => setGlobalIsPlaying(true)
    const onPause = () => setGlobalIsPlaying(false)
    const onEnded = () => {
      setGlobalIsPlaying(false)
      setGlobalCurrentTime(0)
      const curr = idxRef.current
      const list = songsRef.current
      if (curr !== null) {
        for (let i = curr + 1; i < list.length; i++) {
          if (songMode(list[i])) {
            startPlayRef.current?.(i, list)
            return
          }
        }
      }
      setGlobalPlayingIdx(null)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audio.src = ''
    }
  }, [])

  const handlePlayPause = (idx, songsList = globalSongs) => {
    const song = songsList[idx]
    if (!song) return
    const mode = songMode(song)
    if (!mode) return
    const audio = audioRef.current
    if (!audio) return
    if (globalPlayingIdx === idx && globalSongs === songsList) {
      globalIsPlaying ? audio.pause() : audio.play().catch(() => {})
    } else {
      setGlobalSongs(songsList)
      startPlayRef.current?.(idx, songsList)
    }
  }

  const seekTo = (e) => {
    if (globalPlayingIdx === null || !audioRef.current || !globalDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * globalDuration
  }

  const adjustVolume = (v) => {
    setGlobalVolume(v)
    if (audioRef.current) {
      audioRef.current.volume = v
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.getProfile().catch(() => ({})),
      api.getResumes().catch(() => ([])),
    ]).then(([profile, resumes]) => {
      if (cancelled) return
      const needsProfile = !profile?.name || !String(profile.name).trim()
      const needsResume  = !Array.isArray(resumes) || resumes.length === 0
      if (needsProfile || needsResume) setShowOnboarding(true)
    })

    // Check for updates after a short delay (non-blocking)
    const timer = setTimeout(() => {
      api.checkUpdate().then(data => {
        if (!cancelled && data?.available) setUpdateInfo(data)
      }).catch(() => {})
    }, 4000)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  // Mouse position tracking for cursor glow
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const activeSong = globalPlayingIdx !== null ? globalSongs[globalPlayingIdx] : null
  const progressPct = globalDuration ? (globalCurrentTime / globalDuration) * 100 : 0
  const activeMode = activeSong ? songMode(activeSong) : null

  return (
    <>
      <AuroraBackground />
      <div className="grid-mesh" />
      <div className="cursor-glow" />
      {/* Update notification banner */}
      <AnimatePresence>
        {updateInfo && !updateDismissed && (
          <motion.div
            initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }}
            style={{
              position: 'fixed', top: 0, left: 'var(--sidebar-w, 220px)', right: 0, zIndex: 100,
              background: 'linear-gradient(90deg, rgba(124,58,237,0.92), rgba(6,182,212,0.88))',
              backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
              boxShadow: '0 2px 20px rgba(124,58,237,0.4)',
            }}>
            <Download size={15} color="white" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'white', flex: 1 }}>
              ✨ Personal Planner {updateInfo.latest} is available
              <span style={{ fontWeight: 400, opacity: 0.8, marginLeft: 8 }}>
                (you have {updateInfo.current})
              </span>
            </span>
            <button onClick={() => { setUpdateDismissed(true); navigate('/updates'); }}
              style={{
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                color: 'white', borderRadius: 8, padding: '5px 14px', fontSize: 12,
                fontWeight: 700, textDecoration: 'none', flexShrink: 0, cursor: 'pointer',
              }}>
              Download Update →
            </button>
            <button onClick={() => setUpdateDismissed(true)} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0,
            }}>
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div style={{ display: 'flex', height: '100vh', position: 'relative', zIndex: 1 }}>
        <Sidebar timerRunning={pomodoroRunning} timerTimeLeft={pomodoroTimeLeft} timerMode={pomodoroMode} />
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
            <AnimatedRoutes
              pomodoroMode={pomodoroMode}
              pomodoroTimeLeft={pomodoroTimeLeft}
              pomodoroRunning={pomodoroRunning}
              pomodoroSessions={pomodoroSessions}
              pomodoroTask={pomodoroTask}
              pomodoroCategory={pomodoroCategory}
              pomodoroProjectId={pomodoroProjectId}
              focusMins={focusMins}
              breakMins={breakMins}
              longBreakMins={longBreakMins}
              updateFocusMins={updateFocusMins}
              updateBreakMins={updateBreakMins}
              updateLongBreakMins={updateLongBreakMins}
              startPip={startPip}
              pipActive={!!pipWindow}
              setPomodoroMode={setPomodoroMode}
              setPomodoroTimeLeft={setPomodoroTimeLeft}
              setPomodoroRunning={setPomodoroRunning}
              setPomodoroSessions={setPomodoroSessions}
              setPomodoroTask={setPomodoroTask}
              setPomodoroCategory={setPomodoroCategory}
              setPomodoroProjectId={setPomodoroProjectId}
              resetPomodoro={resetPomodoro}
              skipPomodoro={skipPomodoro}
              switchPomodoroMode={switchPomodoroMode}

              globalSongs={globalSongs}
              setGlobalSongs={setGlobalSongs}
              globalPlayingIdx={globalPlayingIdx}
              setGlobalPlayingIdx={setGlobalPlayingIdx}
              globalIsPlaying={globalIsPlaying}
              globalCurrentTime={globalCurrentTime}
              globalDuration={globalDuration}
              globalVolume={globalVolume}
              handlePlayPause={handlePlayPause}
              seekTo={seekTo}
              adjustVolume={adjustVolume}
            />
          </div>

          {/* Bottom Floating Mini-Player bar */}
          <AnimatePresence>
            {activeSong && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                className="glass"
                style={{
                  height: 72,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 24px 0 0',
                  margin: '0 24px 20px 24px',
                  borderRadius: 16,
                  overflow: 'hidden',
                  zIndex: 40,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  flexShrink: 0
                }}
              >
                {activeSong.thumbnail ? (
                  <img src={activeSong.thumbnail} alt=""
                    style={{ width: 72, height: 72, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 72, height: 72, background: 'rgba(124,58,237,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Music size={20} color="white" />
                  </div>
                )}
                
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 16, padding: '0 20px' }}>
                  <div style={{ minWidth: 0, flex: '0 0 200px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}>
                      {activeSong.track_name || activeSong.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#a78bfa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                      {activeSong.artist_name || activeSong.artist}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                      {activeMode === 'youtube' ? '▶ YouTube Audio' : '◑ 30s iTunes Preview'}
                    </div>
                  </div>

                  <button onClick={() => handlePlayPause(globalPlayingIdx)} style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: '#7c3aed', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(124,58,237,0.4)',
                    transition: 'transform 0.15s'
                  }}>
                    {globalIsPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
                  </button>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', minWidth: 28, textAlign: 'right' }}>{fmtTime(globalCurrentTime)}</span>
                    <div onClick={seekTo}
                      style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
                      <div style={{ height: '100%', background: '#7c3aed', borderRadius: 2,
                        width: `${progressPct}%`, transition: 'width 0.1s linear' }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', minWidth: 28 }}>{fmtTime(globalDuration)}</span>
                  </div>

                  {/* Volume control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => {
                      const v = globalVolume === 0 ? 1 : 0
                      adjustVolume(v)
                    }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      {globalVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <input type="range" min={0} max={1} step={0.02} value={globalVolume}
                      onChange={e => adjustVolume(parseFloat(e.target.value))}
                      style={{ width: 72, cursor: 'pointer' }}
                    />
                  </div>

                  <button onClick={() => setGlobalPlayingIdx(null)} style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', display: 'flex', padding: 4, marginLeft: 8 }}>
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showOnboarding && (
        <FirstRunModal onClose={() => setShowOnboarding(false)} />
      )}
      
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
      {pipWindow && createPortal(
        <PomodoroPip 
          mode={pomodoroMode}
          timeLeft={pomodoroTimeLeft}
          running={pomodoroRunning}
          sessions={pomodoroSessions}
          focusMins={focusMins}
          breakMins={breakMins}
          longBreakMins={longBreakMins}
          setRunning={setPomodoroRunning}
          reset={resetPomodoro}
          skip={skipPomodoro}
        />,
        pipWindow.document.body
      )}
      <AnimatePresence>
        {cmdPaletteOpen && (
          <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
