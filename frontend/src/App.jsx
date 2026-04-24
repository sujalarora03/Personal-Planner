import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
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
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function FirstRunModal({ needsProfile, needsResume, onGoProfile, onGoResume, onClose }) {
  if (!needsProfile && !needsResume) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20,
      background: 'rgba(3, 4, 14, 0.72)', backdropFilter: 'blur(4px)',
      display: 'grid', placeItems: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass"
        style={{ width: 'min(560px, 92vw)', padding: 28, borderRadius: 16 }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Welcome to Personal Planner</div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 18 }}>
          Complete quick setup so AI features can personalize your plan.
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)',
            color: needsProfile ? '#fbbf24' : '#34d399',
          }}>
            {needsProfile ? '1. Create your profile (required)' : '1. Profile complete'}
          </div>
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)',
            color: needsResume ? '#fbbf24' : '#34d399',
          }}>
            {needsResume ? '2. Upload your resume in Career (recommended)' : '2. Resume uploaded'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {needsProfile && (
            <button className="btn btn-purple" onClick={onGoProfile}>Create Profile</button>
          )}
          {needsResume && (
            <button className="btn btn-ghost" onClick={onGoResume}>Upload Resume</button>
          )}
          {!needsProfile && !needsResume && (
            <button className="btn btn-purple" onClick={onClose}>Continue</button>
          )}
          {(needsProfile || needsResume) && (
            <button className="btn btn-ghost" onClick={onClose}>Remind Me Later</button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function AppShell() {
  const navigate = useNavigate()
  const [onboarding, setOnboarding] = useState({ checked: false, needsProfile: false, needsResume: false })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.getProfile().catch(() => ({})),
      api.getResumes().catch(() => ([])),
    ]).then(([profile, resumes]) => {
      if (cancelled) return
      const needsProfile = !profile?.name || !String(profile.name).trim()
      const needsResume = !Array.isArray(resumes) || resumes.length === 0
      setOnboarding({ checked: true, needsProfile, needsResume })
    })
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <AuroraBackground />
      <div style={{ display: 'flex', height: '100vh', position: 'relative', zIndex: 1 }}>
        <Sidebar />
        <AnimatedRoutes />
      </div>
      {onboarding.checked && (onboarding.needsProfile || onboarding.needsResume) && (
        <FirstRunModal
          needsProfile={onboarding.needsProfile}
          needsResume={onboarding.needsResume}
          onGoProfile={() => navigate('/profile')}
          onGoResume={() => navigate('/career')}
          onClose={() => setOnboarding((o) => ({ ...o, needsProfile: false, needsResume: false }))}
        />
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
