import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Download, Sparkles } from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

const ACCENT = '#7c3aed'

export default function Dashboard() {
  const [stats,   setStats]   = useState({})
  const [weekly,  setWeekly]  = useState([])
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getDashboard().then(setStats).catch(() => {}),
      api.getWeekly().then(data => setWeekly(data.map(r => ({ ...r, hours: +(r.total_minutes / 60).toFixed(1) })))).catch(() => {}),
      api.getMonthly().then(data => setMonthly(data.map(r => ({ ...r, hours: +(r.total_minutes / 60).toFixed(1) })))).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const cards = [
    { label: 'Active Tasks',  value: stats.tasks_active  ?? 0,  icon: '📝', color: '#a78bfa' },
    { label: 'Overdue',       value: stats.tasks_overdue ?? 0, icon: '⚠️',  color: '#f87171' },
    { label: 'Done This Week',value: stats.tasks_done    ?? 0,    icon: '✅', color: '#34d399' },
    { label: 'Hours This Week',value: stats.week_hours   ?? 0,   icon: '⏱',  color: '#22d3ee' },
    { label: 'Projects',      value: stats.projects      ?? 0,      icon: '🚀', color: '#fb923c' },
    { label: 'Courses',       value: stats.courses       ?? 0,       icon: '📚', color: '#818cf8' },
  ]

  const handleExport = async () => {
    try {
      const blob = await api.exportData()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `personal-planner-export-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported!')
    } catch {
      toast.error('Export failed')
    }
  }

  const [review, setReview]     = useState(null)
  const [reviewing, setReviewing] = useState(false)

  const fetchReview = async () => {
    setReviewing(true)
    try {
      const r = await api.getWeeklyReview()
      setReview(r)
    } catch { toast.error('Could not generate review') }
    finally { setReviewing(false) }
  }

  if (loading) return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Dashboard</h1></div>
      <div className="page-loading"><div className="spinner-ring" /><span>Loading dashboard…</span></div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Your productivity at a glance</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport} title="Export all data as JSON"
          style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Download size={14}/> Export Data
        </button>
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
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
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

      {/* Weekly AI Review */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }}
        className="glass" style={{ padding:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: review ? 14 : 0 }}>
          <div style={{ fontWeight:700 }}>Week in Review</div>
          <button className="btn btn-ghost btn-sm" onClick={fetchReview} disabled={reviewing}
            style={{ display:'flex', alignItems:'center', gap:6, color:'#a78bfa' }}>
            {reviewing ? <><div className="spinner-ring" style={{ width:14, height:14, borderWidth:2 }}/> Generating…</> : <><Sparkles size={14}/> Generate with AI</>}
          </button>
        </div>
        {review && (
          <div>
            <div style={{ display:'flex', gap:14, marginBottom:14 }}>
              <div className="glass" style={{ padding:'10px 16px', textAlign:'center', flex:1, background:'rgba(124,58,237,0.08)' }}>
                <div style={{ fontSize:22, fontWeight:800, color:'#a78bfa' }}>{review.stats?.done ?? 0}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>tasks done</div>
              </div>
              <div className="glass" style={{ padding:'10px 16px', textAlign:'center', flex:1, background:'rgba(6,182,212,0.08)' }}>
                <div style={{ fontSize:22, fontWeight:800, color:'#22d3ee' }}>{review.stats?.hours ?? 0}h</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>logged</div>
              </div>
            </div>
            <div style={{ fontSize:14, lineHeight:1.7, color:'rgba(255,255,255,0.7)', fontStyle:'italic',
              borderLeft:'3px solid #7c3aed', paddingLeft:14 }}>
              {review.review}
            </div>
            {review.source === 'fallback' && (
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:8 }}>💡 AI offline — showing summary. Start Ollama for a personalised review.</div>
            )}
          </div>
        )}
        {!review && !reviewing && (
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', textAlign:'center', padding:'20px 0' }}>
            Click "Generate with AI" for a personalised weekly summary.
          </div>
        )}
      </motion.div>
    </div>
  )
}
