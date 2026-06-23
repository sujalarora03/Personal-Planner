import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import logoImg from '../assets/logo.png'
import { api } from '../api/client'
import {
  Home, LayoutDashboard, CheckSquare, Clock, Rocket,
  Target, BookOpen, GraduationCap, Bot, User, Headphones,
  ChevronLeft, ChevronRight, Timer, CheckCircle2, NotebookPen, CalendarDays,
  ArrowUpCircle, Heart, Search, TrendingUp, Calendar, Award, Settings, ClipboardCheck,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/',           icon: Home,           label: 'Home' },
      { to: '/profile',    icon: User,           label: 'Profile' },
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics',  icon: TrendingUp,     label: 'Analytics' },
      { to: '/calendar',   icon: Calendar,       label: 'Calendar' },
      { to: '/planner',    icon: CalendarDays,   label: "Today's Plan" },
      { to: '/tasks',      icon: CheckSquare,    label: 'Tasks' },
      { to: '/work-hours', icon: Clock,          label: 'Work Hours' },
      { to: '/projects',   icon: Rocket,         label: 'Projects' },
      { to: '/notes',      icon: NotebookPen,    label: 'Notes' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { to: '/focus',        icon: Timer,         label: 'Focus Timer' },
      { to: '/targets',      icon: Target,        label: 'Year Targets' },
      { to: '/habits',       icon: CheckCircle2,  label: 'Habits' },
      { to: '/courses',      icon: BookOpen,      label: 'Courses' },
      { to: '/career',       icon: GraduationCap, label: 'Career' },
      { to: '/achievements', icon: Award,         label: 'Achievements' },
      { to: '/weekly-review', icon: ClipboardCheck, label: 'Weekly Review' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/ai',           icon: Bot,          label: 'AI Assistant' },
      { to: '/relax',        icon: Headphones,   label: 'Relax' },
      { to: '/settings',     icon: Settings,     label: 'Settings' },
      { to: '/updates',      icon: ArrowUpCircle,label: 'Updates & Help' },
      { to: '/app-info',     icon: Heart,        label: 'About & Feedback' },
    ],
  },
]
// Flat list used in other components that need it
const NAV = NAV_GROUPS.flatMap(g => g.items)


const STORAGE_KEY = 'pp_sidebar_collapsed'

export default function Sidebar({ timerRunning, timerTimeLeft, timerMode }) {
  const navigate    = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')
  const [version, setVersion] = useState('')

  useEffect(() => {
    api.getVersion().then(data => setVersion(data.version)).catch(() => {})
  }, [])

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
                }}>v{version || '0.8.18'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
        title="Search (Ctrl+K)"
        style={{
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8,
          width: '100%', margin: '10px 0 4px',
          padding: collapsed ? '8px 0' : '8px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.35)',
          fontSize: 12, justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
      >
        <Search size={13} />
        {!collapsed && (
          <>
            <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
            <kbd style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.2)' }}>Ctrl K</kbd>
          </>
        )}
      </button>

      <nav style={{ flex: 1, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && (
              <div style={{
                margin: collapsed ? '8px 4px' : '8px 4px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: 6,
              }}>
                {!collapsed && (
                  <div style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                    color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
                    paddingLeft: 16, paddingBottom: 4,
                  }}>
                    {group.label}
                  </div>
                )}
              </div>
            )}
            {gi === 0 && !collapsed && (
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
                paddingLeft: 16, paddingBottom: 4,
              }}>
                {group.label}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map(({ to, icon: Icon, label }) => {
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
                      background: 'transparent',
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
                            top: 8, right: 8,
                            width: 6, height: 6,
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
            </div>
          </div>
        ))}
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

