import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { Download, X } from 'lucide-react'
import Sidebar from './components/Sidebar'
import AuroraBackground from './components/AuroraBackground'
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

const pageVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -12 },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        style={{ flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' }}
      >
        <Routes location={location}>
          <Route path="/"           element={<Home />} />
          <Route path="/profile"    element={<Profile />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/tasks"      element={<Tasks />} />
          <Route path="/work-hours" element={<WorkHours />} />
          <Route path="/projects"   element={<Projects />} />
          <Route path="/targets"    element={<Targets />} />
          <Route path="/courses"    element={<Courses />} />
          <Route path="/career"     element={<Career />} />
          <Route path="/ai"         element={<AI />} />
          <Route path="/relax"      element={<Relax />} />
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
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [updateInfo, setUpdateInfo]         = useState(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)

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

  return (
    <>
      <AuroraBackground />
      {/* Update notification banner */}
      <AnimatePresence>
        {updateInfo && !updateDismissed && (
          <motion.div
            initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }}
            style={{
              position: 'fixed', top: 0, left: 220, right: 0, zIndex: 100,
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
            <a href={updateInfo.download_url} target="_blank" rel="noreferrer"
              style={{
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                color: 'white', borderRadius: 8, padding: '5px 14px', fontSize: 12,
                fontWeight: 700, textDecoration: 'none', flexShrink: 0,
              }}>
              Download Update →
            </a>
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
        <Sidebar />
        <AnimatedRoutes />
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
