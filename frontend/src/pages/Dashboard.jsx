import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../api/client'

const ACCENT = '#7c3aed'

export default function Dashboard() {
  const [stats,   setStats]   = useState({})
  const [weekly,  setWeekly]  = useState([])
  const [monthly, setMonthly] = useState([])

  useEffect(() => {
    api.getDashboard().then(setStats).catch(() => {})
    api.getWeekly().then(data => setWeekly(data.map(r => ({ ...r, hours: +(r.total_minutes / 60).toFixed(1) })))).catch(() => {})
    api.getMonthly().then(data => setMonthly(data.map(r => ({ ...r, hours: +(r.total_minutes / 60).toFixed(1) })))).catch(() => {})
  }, [])

  const cards = [
    { label: 'Active Tasks',  value: stats.tasks_active,  icon: '📝', color: '#a78bfa' },
    { label: 'Overdue',       value: stats.tasks_overdue, icon: '⚠️',  color: '#f87171' },
    { label: 'Done This Week',value: stats.tasks_done,    icon: '✅', color: '#34d399' },
    { label: 'Hours This Week',value: stats.week_hours,   icon: '⏱',  color: '#22d3ee' },
    { label: 'Projects',      value: stats.projects,      icon: '🚀', color: '#fb923c' },
    { label: 'Courses',       value: stats.courses,       icon: '📚', color: '#818cf8' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">Your productivity at a glance</p>
      </div>

      {/* Stat grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
        {cards.map(({ label, value, icon, color }, i) => (
          <motion.div key={label} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: i*0.07 }} className="glass"
            style={{ padding:'22px 20px', borderLeft:`3px solid ${color}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:32, fontWeight:800, color, lineHeight:1 }}>{value ?? '—'}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:6 }}>{label}</div>
              </div>
              <span style={{ fontSize:24 }}>{icon}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
          className="glass" style={{ padding:22 }}>
          <div style={{ fontWeight:700, marginBottom:16 }}>Weekly Work Hours</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} barSize={20}>
              <XAxis dataKey="date" tick={{ fill:'#6b7280', fontSize:11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill:'#6b7280', fontSize:11 }} />
              <Tooltip contentStyle={{ background:'#0f0f1e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8 }} />
              <Bar dataKey="hours" radius={4}>
                {weekly.map((_, i) => <Cell key={i} fill={ACCENT} fillOpacity={0.7 + i*0.04} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
          className="glass" style={{ padding:22 }}>
          <div style={{ fontWeight:700, marginBottom:16 }}>Monthly Work Hours</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} barSize={28}>
              <XAxis dataKey="month" tick={{ fill:'#6b7280', fontSize:11 }} />
              <YAxis tick={{ fill:'#6b7280', fontSize:11 }} />
              <Tooltip contentStyle={{ background:'#0f0f1e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8 }} />
              <Bar dataKey="hours" radius={4} fill="#06b6d4" fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}
