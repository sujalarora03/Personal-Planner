import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import logoImg from '../assets/logo.png'
import {
  Home, LayoutDashboard, CheckSquare, Clock, Rocket,
  Target, BookOpen, GraduationCap, Bot, User, Headphones,
  ChevronLeft, ChevronRight, Timer, CheckCircle2, NotebookPen, CalendarDays,
  ArrowUpCircle, Heart,
} from 'lucide-react'

const NAV = [
  { to: '/',           icon: Home,           label: 'Home' },
  { to: '/profile',    icon: User,           label: 'Profile' },
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/planner',    icon: CalendarDays,   label: 'Today\'s Plan' },
  { to: '/tasks',      icon: CheckSquare,    label: 'Tasks' },
  { to: '/work-hours', icon: Clock,          label: 'Work Hours' },
  { to: '/focus',      icon: Timer,          label: 'Focus Timer' },
  { to: '/projects',   icon: Rocket,         label: 'Projects' },
  { to: '/targets',    icon: Target,         label: 'Year Targets' },
  { to: '/habits',     icon: CheckCircle2,   label: 'Habits' },
  { to: '/notes',      icon: NotebookPen,    label: 'Notes' },
  { to: '/courses',    icon: BookOpen,       label: 'Courses' },
  { to: '/career',     icon: GraduationCap,  label: 'Career' },
  { to: '/ai',         icon: Bot,            label: 'AI Assistant' },
  { to: '/relax',      icon: Headphones,     label: 'Relax' },
  { to: '/updates',    icon: ArrowUpCircle,  label: 'Updates & Help' },
  { to: '/about',      icon: Heart,          label: 'About & Feedback' },
]

const STORAGE_KEY = 'pp_sidebar_collapsed'

export default function Sidebar({ timerRunning, timerTimeLeft, timerMode }) {
  const navigate    = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')

  // Publish width as CSS variable so other elements (e.g. update banner) can track it
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '60px' : '220px')
  }, [collapsed])

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  const W = collapsed ? 60 : 220

  return (
    <aside
      data-collapsed={collapsed ? 'true' : 'false'}
      style={{
      width: W,
      minWidth: W,
      height: '100vh',
      background: 'rgba(10, 10, 20, 0.4)',
      backdropFilter: 'blur(30px) saturate(180%)',
      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      padding: collapsed ? '20px 8px' : '20px 12px',
      position: 'relative',
      zIndex: 10,
      transition: 'width 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), min-width 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), padding 0.25s ease',
      overflow: 'hidden',
    }}>
      {/* Logo row */}
      <div style={{
        padding: '8px 4px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 10,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <img src={logoImg} alt="logo" style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            boxShadow: '0 0 20px rgba(139,92,246,0.25)',
            objectFit: 'cover'
          }} />
          {!collapsed && (
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'white', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Personal Planner</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                <span style={{
                  background: 'rgba(139,92,246,0.2)', color: '#c084fc',
                  padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                }}>v0.8.5</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <motion.button
              key={to}
              className={`nav-btn ${active ? 'active' : ''}`}
              onClick={() => navigate(to)}
              whileTap={{ scale: 0.97 }}
              title={collapsed ? label : undefined}
              style={{ 
                justifyContent: collapsed ? 'center' : 'flex-start', 
                paddingLeft: collapsed ? 0 : undefined, 
                position: 'relative',
                background: 'transparent', // controlled by sliding layout bubble
              }}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(139, 92, 246, 0.12)',
                    borderRadius: 12,
                    borderLeft: collapsed ? 'none' : '3px solid #8b5cf6',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={16} strokeWidth={active ? 2.5 : 2} style={{ color: active ? '#c084fc' : 'inherit' }} />
              {!collapsed && <span>{label}</span>}
              
              {to === '/focus' && timerRunning && (
                <>
                  {!collapsed ? (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 10,
                      fontWeight: 'bold',
                      background: timerMode === 'focus' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                      color: timerMode === 'focus' ? '#c084fc' : '#22d3ee',
                      padding: '2px 6px',
                      borderRadius: 6,
                      border: `1px solid ${timerMode === 'focus' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
                      fontFamily: 'monospace',
                      boxShadow: `0 0 8px ${timerMode === 'focus' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(6, 182, 212, 0.2)'}`,
                    }}>
                      {String(Math.floor(timerTimeLeft / 60)).padStart(2, '0')}:{String(timerTimeLeft % 60).padStart(2, '0')}
                    </span>
                  ) : (
                    <span style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: timerMode === 'focus' ? '#8b5cf6' : '#06b6d4',
                      boxShadow: `0 0 6px ${timerMode === 'focus' ? '#8b5cf6' : '#06b6d4'}`,
                    }} />
                  )}
                </>
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        {!collapsed && (
          <div style={{
            background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)',
            borderRadius: 12, padding: '10px 12px', marginBottom: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>🔒 100% Private</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
              All data stays local. Nothing sent online.
            </div>
          </div>
        )}
        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="btn btn-ghost btn-sm"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ width: '100%', justifyContent: 'center', padding: '8px', border: 'none' }}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span style={{ fontSize: 11 }}>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

