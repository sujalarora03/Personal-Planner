import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home, LayoutDashboard, CheckSquare, Clock, Rocket,
  Target, BookOpen, GraduationCap, Bot, User, Headphones,
  ChevronLeft, ChevronRight, Timer, CheckCircle2, NotebookPen, CalendarDays, Settings,
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
  { to: '/settings',   icon: Settings,       label: 'Settings' },
]

const STORAGE_KEY = 'pp_sidebar_collapsed'

export default function Sidebar() {
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
    <aside style={{
      width: W,
      minWidth: W,
      height: '100vh',
      background: 'rgba(6,6,15,0.85)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      padding: collapsed ? '20px 10px' : '20px 12px',
      position: 'relative',
      zIndex: 10,
      transition: 'width 0.25s ease, min-width 0.25s ease, padding 0.25s ease',
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
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}>⚡</div>
          {!collapsed && (
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'white', whiteSpace: 'nowrap' }}>Personal Planner</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                <span style={{
                  background: 'rgba(124,58,237,0.25)', color: '#a78bfa',
                  padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                }}>v0.7.5 BETA</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = pathname === to
          return (
            <motion.button
              key={to}
              className={`nav-btn ${active ? 'active' : ''}`}
              onClick={() => navigate(to)}
              whileTap={{ scale: 0.97 }}
              title={collapsed ? label : undefined}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', paddingLeft: collapsed ? 0 : undefined, position: 'relative' }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {!collapsed && <span>{label}</span>}
              {active && !collapsed && (
                <motion.div
                  layoutId="nav-indicator"
                  style={{
                    position: 'absolute', right: 12,
                    width: 4, height: 4, borderRadius: '50%',
                    background: '#7c3aed',
                  }}
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        {!collapsed && (
          <div style={{
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>🔒 100% Private</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
              All data stays local. Nothing sent online.
            </div>
          </div>
        )}
        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="btn btn-ghost btn-sm"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ width: '100%', justifyContent: 'center', padding: '8px' }}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span style={{ fontSize: 11 }}>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

