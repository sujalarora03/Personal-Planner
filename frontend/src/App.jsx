import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import AuroraBackground from './components/AuroraBackground'
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

export default function App() {
  return (
    <BrowserRouter>
      <AuroraBackground />
      <div style={{ display: 'flex', height: '100vh', position: 'relative', zIndex: 1 }}>
        <Sidebar />
        <AnimatedRoutes />
      </div>
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
    </BrowserRouter>
  )
}
