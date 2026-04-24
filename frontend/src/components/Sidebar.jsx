import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home, LayoutDashboard, CheckSquare, Clock, Rocket,
  Target, BookOpen, GraduationCap, Bot, User, Download, Headphones
} from 'lucide-react'
import { api } from '../api/client'

const NAV = [
  { to: '/',           icon: Home,          label: 'Home' },
  { to: '/profile',    icon: User,          label: 'Profile' },
  { to: '/dashboard',  icon: LayoutDashboard,label: 'Dashboard' },
  { to: '/tasks',      icon: CheckSquare,   label: 'Tasks' },
  { to: '/work-hours', icon: Clock,         label: 'Work Hours' },
  { to: '/projects',   icon: Rocket,        label: 'Projects' },
  { to: '/targets',    icon: Target,        label: 'Year Targets' },
  { to: '/courses',    icon: BookOpen,      label: 'Courses' },
  { to: '/career',     icon: GraduationCap, label: 'Career' },
  { to: '/ai',         icon: Bot,           label: 'AI Assistant' },
  { to: '/relax',      icon: Headphones,    label: 'Relax' },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      height: '100vh',
      background: 'rgba(6,6,15,0.85)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ padding: '8px 4px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>Personal Planner</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
              <span style={{
                background: 'rgba(124,58,237,0.25)', color: '#a78bfa',
                padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
              }}>v0.5 BETA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = pathname === to
          return (
            <motion.button
              key={to}
              className={`nav-btn ${active ? 'active' : ''}`}
              onClick={() => navigate(to)}
              whileTap={{ scale: 0.97 }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
              {active && (
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
        <div style={{
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
          borderRadius: 10, padding: '10px 12px', marginBottom: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>🔒 100% Private</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
            All data stays local. Nothing sent online.
          </div>
        </div>
      </div>
    </aside>
  )
}
