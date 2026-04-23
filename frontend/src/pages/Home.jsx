import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, Bot, GraduationCap, Zap } from 'lucide-react'
import { api } from '../api/client'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 5)  return 'Burning the midnight oil 🌙'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Late night grind 🌙'
}

const tagline = () => {
  const h = new Date().getHours()
  if (h < 12) return "Let's make today legendary. ⚡"
  if (h < 17) return "Stay locked in — the grind continues. 🔥"
  return "Evening hustle hits different. 💜"
}

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const QUOTES = [
  "You didn't come this far to only come this far.",
  "Make it happen. Shock everyone.",
  "Build the life you can't stop thinking about.",
  "Stop waiting for the right moment. Create it.",
  "Be the main character — not a side quest.",
  "One year from now you'll wish you started today.",
]

export default function Home() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [stats, setStats]     = useState({})
  const [quote]               = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => {})
    api.getDashboard().then(setStats).catch(() => {})
  }, [])

  const name = profile?.name?.split(' ')[0] || null

  const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
  const item      = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <motion.div variants={container} initial="hidden" animate="visible">

        {/* Date + greeting */}
        <motion.div variants={item} style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', letterSpacing: 1, textTransform: 'uppercase' }}>
            ✦ {today} ✦
          </span>
        </motion.div>

        <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>
            {greeting()}{name ? `, ${name}` : ''} 👋
          </h1>
          <span style={{
            background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
            color: '#a78bfa', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap', marginTop: 8,
          }}>v0.5 BETA</span>
        </motion.div>

        <motion.p variants={item} style={{ fontSize: 18, color: '#a78bfa', marginBottom: 40 }}>
          {tagline()}
        </motion.p>

        {/* Quote card */}
        <motion.div variants={item} className="glass" style={{
          padding: '24px 28px', marginBottom: 36,
          borderColor: 'rgba(124,58,237,0.2)',
          background: 'rgba(124,58,237,0.06)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            💫 Today's Vibe
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, color: 'white', fontStyle: 'italic' }}>
            "{quote}"
          </p>
        </motion.div>

        {/* Stat cards */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'Active Tasks',   value: stats.tasks_active,  icon: '📝', color: '#a78bfa', bg: 'rgba(124,58,237,0.1)' },
            { label: 'Live Projects',  value: stats.projects,      icon: '🚀', color: '#22d3ee', bg: 'rgba(6,182,212,0.1)' },
            { label: 'Courses',        value: stats.courses,       icon: '📚', color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
            { label: 'Year Goals',     value: stats.targets,       icon: '🎯', color: '#fb923c', bg: 'rgba(249,115,22,0.1)' },
          ].map(({ label, value, icon, color, bg }) => (
            <motion.div key={label} whileHover={{ y: -4, scale: 1.02 }} className="glass glass-hover"
              style={{ padding: '24px 20px', textAlign: 'center', borderColor: `${color}22`, background: bg }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { label: '✅  My Tasks',     color: '#7c3aed', hover: '#6d28d9', to: '/tasks',   Icon: CheckSquare },
            { label: '🤖  Ask AI',       color: '#0ea5e9', hover: '#0369a1', to: '/ai',      Icon: Bot },
            { label: '🎓  Career Coach', color: '#10b981', hover: '#047857', to: '/career',  Icon: GraduationCap },
          ].map(({ label, color, hover, to, Icon }) => (
            <motion.button key={to} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(to)}
              style={{
                background: color, border: 'none', borderRadius: 14, padding: '18px 20px',
                color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: `0 8px 24px ${color}44`,
              }}>
              <Icon size={18} /> {label}
            </motion.button>
          ))}
        </motion.div>

      </motion.div>
    </div>
  )
}
