import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid, ReferenceLine
} from 'recharts'
import { TrendingUp, Target, Zap, Award, Clock, CheckSquare, Flame } from 'lucide-react'
import { api } from '../api/client'

const ACCENT = '#7c3aed'
const CYAN   = '#06b6d4'
const GREEN  = '#10b981'
const AMBER  = '#f59e0b'

function ScoreRing({ score }) {
  const R = 54
  const circ = 2 * Math.PI * R
  const color = score >= 80 ? GREEN : score >= 55 ? AMBER : '#ef4444'
  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
        <circle cx={70} cy={70} r={R} fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1 }}>SCORE</div>
      </div>
    </div>
  )
}

const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function computeProductivityScore({ weekTasks, weekHours, weekHabits, totalHabits, weekPomodoros }) {
  const tasksScore    = Math.min(30, (weekTasks || 0) * 3)
  const hoursScore    = Math.min(30, ((weekHours || 0) / 40) * 30)
  const habitsScore   = totalHabits > 0 ? Math.min(25, ((weekHabits || 0) / (totalHabits * 7)) * 25) : 0
  const pomodoroScore = Math.min(15, (weekPomodoros || 0) * 1.5)
  return Math.round(tasksScore + hoursScore + habitsScore + pomodoroScore)
}

export default function Analytics() {
  const [stats, setStats]       = useState({})
  const [weekly, setWeekly]     = useState([])
  const [monthly, setMonthly]   = useState([])
  const [habits, setHabits]     = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getDashboard().then(setStats).catch(() => {}),
      api.getWeekly().then(d => setWeekly(d.map(r => ({ ...r, hours: +(r.total_minutes / 60).toFixed(1) })))).catch(() => {}),
      api.getMonthly().then(d => setMonthly(d.map(r => ({ ...r, hours: +(r.total_minutes / 60).toFixed(1) })))).catch(() => {}),
      api.getHabits().then(setHabits).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const score = computeProductivityScore({
    weekTasks:    stats.tasks_done ?? 0,
    weekHours:    stats.week_hours ?? 0,
    weekHabits:   habits.filter(h => h.done_today).length,
    totalHabits:  habits.length,
    weekPomodoros: 0,
  })

  const scoreLabel = score >= 80 ? '🔥 Outstanding' : score >= 60 ? '✅ On Track' : score >= 40 ? '⚡ Building Up' : '🌱 Just Starting'

  // Day-of-week hours breakdown from weekly data
  const dayBreakdown = DAYS_SHORT.map((day, i) => {
    const entry = weekly.find(w => {
      const d = new Date(w.date + 'T00:00:00')
      return d.getDay() === i
    })
    return { day, hours: entry?.hours || 0 }
  })

  const peakDay = dayBreakdown.reduce((max, d) => d.hours > max.hours ? d : max, { day: '—', hours: 0 })
  const totalWeekHours = weekly.reduce((s, d) => s + (d.hours || 0), 0)

  const statCards = [
    { label: 'Tasks Done',      value: stats.tasks_done ?? 0,    icon: CheckSquare, color: '#a78bfa', unit: 'this week' },
    { label: 'Hours Logged',    value: +(totalWeekHours).toFixed(1), icon: Clock, color: CYAN,   unit: 'this week' },
    { label: 'Active Streak',   value: habits.reduce((m,h) => Math.max(m, h.streak||0), 0), icon: Flame, color: AMBER, unit: 'days' },
    { label: 'Overdue Tasks',   value: stats.tasks_overdue ?? 0, icon: Target,       color: '#f87171', unit: 'need attention' },
  ]

  if (loading) return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Analytics</h1></div>
      <div className="page-loading"><div className="spinner-ring" /><span>Loading analytics…</span></div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
          }}>
            <TrendingUp size={22} color="white" />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Analytics</h1>
            <p className="page-sub" style={{ margin: 0 }}>Your productivity at a glance — this week</p>
          </div>
        </div>
      </div>

      {/* Score + stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 24 }}>
        {/* Productivity score */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            Weekly Productivity Score
          </div>
          <ScoreRing score={score} />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginTop: 4 }}>{scoreLabel}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: 160 }}>
            Based on tasks, hours logged, habits & focus sessions
          </div>
        </motion.div>

        {/* Stat cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {statCards.map(({ label, value, icon: Icon, color, unit }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }} className="glass"
              style={{ padding: '18px 20px', borderLeft: `3px solid ${color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{unit}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Daily hours this week */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass" style={{ padding: 22 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Hours by Day of Week</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
            Peak: <strong style={{ color: CYAN }}>{peakDay.day} ({peakDay.hours}h)</strong>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dayBreakdown} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="hours" radius={4}>
                {dayBreakdown.map((d, i) => (
                  <Cell key={i} fill={d.day === peakDay.day ? CYAN : ACCENT} fillOpacity={d.hours > 0 ? 0.85 : 0.2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass" style={{ padding: 22 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Monthly Trend</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
            {monthly.length} months tracked
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="hours" stroke={ACCENT} strokeWidth={2.5}
                dot={{ fill: ACCENT, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#c084fc' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Habits heatmap summary */}
      {habits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="glass" style={{ padding: 22 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Habit Streaks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {habits.slice(0, 6).map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: h.color, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', flex: 1, minWidth: 120 }}>{h.name}</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {(h.week_log || Array(7).fill(false)).map((done, i) => (
                    <div key={i} style={{
                      width: 14, height: 14, borderRadius: 3,
                      background: done ? h.color : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${done ? h.color + '60' : 'rgba(255,255,255,0.06)'}`,
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: h.streak > 0 ? AMBER : 'rgba(255,255,255,0.3)', minWidth: 60, textAlign: 'right', fontWeight: 600 }}>
                  {h.streak > 0 ? `🔥 ${h.streak}d` : 'no streak'}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
