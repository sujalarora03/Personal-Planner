import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare, Bot, GraduationCap, RefreshCw, Flame,
  ArrowRight, Sparkles, Target, BookOpen, Clock, Zap
} from 'lucide-react'
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

const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }

export default function Home() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [stats, setStats]     = useState({})
  const [habits, setHabits]   = useState([])
  const [todayTasks, setTodayTasks] = useState([])
  const [quote, setQuote]     = useState({ quote: '...', author: null })
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [version, setVersion] = useState('')

  const refreshQuote = () => {
    setQuoteLoading(true)
    api.getDailyQuote()
      .then((q) => { if (q?.quote) setQuote(q) })
      .catch(() => {})
      .finally(() => setQuoteLoading(false))
  }

  useEffect(() => {
    api.getVersion().then(data => setVersion(data.version)).catch(() => {})
    api.getProfile().then(setProfile).catch(() => {})
    api.getDashboard().then(setStats).catch(() => {})
    api.getTodayPlanner().then(d => {
      setTodayTasks(d.tasks?.slice(0, 4) || [])
      setHabits(d.habits?.slice(0, 5) || [])
    }).catch(() => {})
    refreshQuote()
  }, [])

  const name = profile?.name?.split(' ')[0] || null
  const tasksDoneToday = todayTasks.filter(t => t.status === 'Done').length
  const habitsDone = habits.filter(h => h.done_today).length
  const topStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0)

  return (
    <div className="page" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <motion.div variants={container} initial="hidden" animate="visible">

        {/* Date badge */}
        <motion.div variants={item} style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            ✦ {today} ✦
          </span>
        </motion.div>

        {/* Hero greeting row */}
        <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1.5, fontFamily: 'var(--font-display)' }}>
            {greeting()}{name ? `, ${name}` : ''} 👋
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {topStreak > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)',
                color: '#fb923c', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700,
              }}>
                <Flame size={13} /> {topStreak} day streak
              </div>
            )}
            <span style={{
              background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
              color: '#a78bfa', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 700,
            }}>v{version || '0.8.19'} BETA</span>
          </div>
        </motion.div>

        <motion.p variants={item} style={{ fontSize: 17, color: '#a78bfa', marginBottom: 36 }}>
          {tagline()}
        </motion.p>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Quote card */}
          <motion.div variants={item} className="glass" style={{
            padding: '24px 28px',
            borderColor: 'rgba(124,58,237,0.15)',
            borderLeft: '4px solid var(--accent, #7c3aed)',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(99,102,241,0.04))',
            gridColumn: '1 / -1',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -60, right: -60, width: 200, height: 200,
              background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
              borderRadius: '50%', pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} color="var(--accent, #7c3aed)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent, #7c3aed)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Today's Inspiration</span>
              </div>
              <button onClick={refreshQuote} disabled={quoteLoading}
                style={{
                  background: 'rgba(124, 58, 237, 0.08)',
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                  color: 'var(--accent, #7c3aed)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: quoteLoading ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 0.2s',
                  opacity: quoteLoading ? 0.6 : 1
                }}
                title="Refresh quote">
                <RefreshCw size={12} style={{ animation: quoteLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                <span>New Quote</span>
              </button>
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.6, color: 'white', fontStyle: 'italic', marginBottom: quote.author ? 12 : 0, letterSpacing: -0.5 }}>
              "{quote.quote}"
            </p>
            {quote.author && (
              <div style={{ fontSize: 13, color: 'var(--accent, #a78bfa)', fontWeight: 600 }}>— {quote.author}</div>
            )}
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Active Tasks',  value: stats.tasks_active, icon: '📝', color: '#a78bfa', bg: 'rgba(124,58,237,0.08)',  to: '/tasks' },
            { label: 'Live Projects', value: stats.projects,     icon: '🚀', color: '#22d3ee', bg: 'rgba(6,182,212,0.08)',   to: '/projects' },
            { label: 'Courses',       value: stats.courses,      icon: '📚', color: '#34d399', bg: 'rgba(16,185,129,0.08)', to: '/courses' },
            { label: 'Year Goals',    value: stats.targets,      icon: '🎯', color: '#fb923c', bg: 'rgba(249,115,22,0.08)', to: '/targets' },
          ].map(({ label, value, icon, color, bg, to }) => (
            <motion.div key={label}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => navigate(to)}
              className="glass"
              style={{ padding: '20px 16px', textAlign: 'center', borderColor: `${color}22`, background: bg, cursor: 'pointer' }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--font-display)' }}>{value ?? '—'}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6, fontWeight: 500 }}>{label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom two-column section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Today's tasks preview */}
          <motion.div variants={item} className="glass" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <CheckSquare size={14} color="#a78bfa" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 }}>Today's Focus</span>
              </div>
              {todayTasks.length > 0 && (
                <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700 }}>
                  {tasksDoneToday}/{todayTasks.length} done
                </span>
              )}
            </div>
            {todayTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                <CheckSquare size={20} style={{ marginBottom: 6, opacity: 0.4, display: 'block', margin: '0 auto 6px' }} />
                No tasks due today — you're clear! 🎉
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayTasks.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    background: t.status === 'Done' ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${t.status === 'Done' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${t.status === 'Done' ? '#34d399' : 'rgba(255,255,255,0.2)'}`,
                      background: t.status === 'Done' ? 'rgba(52,211,153,0.2)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {t.status === 'Done' && <span style={{ fontSize: 8, color: '#34d399' }}>✓</span>}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 500, flex: 1,
                      textDecoration: t.status === 'Done' ? 'line-through' : 'none',
                      color: t.status === 'Done' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{t.title}</span>
                    {t.priority === 'Urgent' && (
                      <span style={{ fontSize: 9, color: '#f87171', background: 'rgba(239,68,68,0.12)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>URGENT</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => navigate('/tasks')} style={{
              marginTop: 14, width: '100%', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: 'rgba(255,255,255,0.4)',
              padding: '8px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 5, fontFamily: 'var(--font-sans)',
            }}>
              View all tasks <ArrowRight size={12} />
            </button>
          </motion.div>

          {/* Habits widget */}
          <motion.div variants={item} className="glass" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Flame size={14} color="#fb923c" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 }}>Habits Today</span>
              </div>
              {habits.length > 0 && (
                <span style={{ fontSize: 11, color: '#fb923c', fontWeight: 700 }}>
                  {habitsDone}/{habits.length} done
                </span>
              )}
            </div>
            {habits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                <Flame size={20} style={{ marginBottom: 6, opacity: 0.4, display: 'block', margin: '0 auto 6px' }} />
                No habits yet — add some to build streaks!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {habits.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    background: h.done_today ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${h.done_today ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: h.done_today ? `${h.color}33` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${h.done_today ? h.color + '55' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13,
                    }}>
                      {h.icon}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 500, flex: 1,
                      color: h.done_today ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{h.name}</span>
                    {h.streak > 0 && (
                      <span style={{ fontSize: 10, color: '#fb923c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Flame size={10} /> {h.streak}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => navigate('/habits')} style={{
              marginTop: 14, width: '100%', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: 'rgba(255,255,255,0.4)',
              padding: '8px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 5, fontFamily: 'var(--font-sans)',
            }}>
              Manage habits <ArrowRight size={12} />
            </button>
          </motion.div>
        </div>

        {/* Quick actions */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'My Tasks',     sub: 'Track & manage',    color: '#7c3aed', to: '/tasks',   Icon: CheckSquare, glow: 'rgba(124,58,237,0.35)' },
            { label: 'Ask AI',       sub: 'Chat with your AI', color: '#0ea5e9', to: '/ai',      Icon: Bot,         glow: 'rgba(14,165,233,0.35)' },
            { label: 'Career Coach', sub: 'Grow your career',  color: '#10b981', to: '/career',  Icon: GraduationCap, glow: 'rgba(16,185,129,0.35)' },
          ].map(({ label, sub, color, to, Icon, glow }) => (
            <motion.button key={to}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(to)}
              style={{
                background: `linear-gradient(135deg, ${color}dd, ${color}99)`,
                border: 'none', borderRadius: 16, padding: '18px 20px',
                color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: `0 8px 28px ${glow}`,
                textAlign: 'left',
              }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{label}</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 1 }}>{sub}</div>
              </div>
            </motion.button>
          ))}
        </motion.div>

      </motion.div>
    </div>
  )
}
