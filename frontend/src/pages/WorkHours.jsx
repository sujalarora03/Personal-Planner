import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const CATEGORIES = ['Work','Study','Personal','Exercise','Other']

export default function WorkHours() {
  const [sessions, setSessions] = useState([])
  const [weekly,   setWeekly]   = useState([])
  const [showAdd,  setShowAdd]  = useState(false)
  const [form, setForm] = useState({ duration_minutes:60, description:'', category:'Work', date:'' })
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }))

  const load = () => {
    api.getWorkHours(30).then(setSessions).catch(() => {})
    api.getWeekly().then(d => setWeekly(d.map(r => ({ ...r, hours: +(r.total_minutes/60).toFixed(1) })))).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const totalWeek = weekly.reduce((a, r) => a + r.total_minutes, 0)
  const h = Math.floor(totalWeek / 60), m = totalWeek % 60

  const handleLog = async (e) => {
    e.preventDefault()
    await api.logWork({ ...form, duration_minutes: +form.duration_minutes })
    toast.success('Work session logged!')
    setShowAdd(false)
    setForm({ duration_minutes:60, description:'', category:'Work', date:'' })
    load()
  }

  const handleDelete = async (id) => {
    await api.deleteWorkSession(id); toast('Deleted'); load()
  }

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Work Hours</h1>
          <p className="page-sub">This week: <strong style={{ color:'#22d3ee' }}>{h}h {m}m</strong></p>
        </div>
        <button className="btn btn-purple" onClick={() => setShowAdd(true)}><Plus size={16}/> Log Session</button>
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="glass" style={{ padding:22, marginBottom:24 }}>
        <div style={{ fontWeight:700, marginBottom:16 }}>Hours per Day (Last 7 Days)</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekly} barSize={24}>
            <XAxis dataKey="date" tick={{ fill:'#6b7280', fontSize:11 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fill:'#6b7280', fontSize:11 }} />
            <Tooltip contentStyle={{ background:'#0f0f1e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8 }} />
            <Bar dataKey="hours" fill="#06b6d4" fillOpacity={0.8} radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Session list */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {sessions.map((s, i) => {
          const hh = Math.floor(s.duration_minutes/60), mm = s.duration_minutes%60
          return (
            <motion.div key={s.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
              transition={{ delay: i*0.04 }} className="glass"
              style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{
                width:48, height:48, borderRadius:12, background:'rgba(6,182,212,0.1)',
                border:'1px solid rgba(6,182,212,0.2)', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', flexShrink:0,
              }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#22d3ee', lineHeight:1 }}>{hh}h</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{mm}m</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600 }}>{s.description || 'Work session'}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
                  {s.date} · <span className="badge" style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)' }}>{s.category}</span>
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}><Trash2 size={13}/></button>
            </motion.div>
          )
        })}
      </div>

      {showAdd && (
        <Modal title="Log Work Session" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleLog} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Duration (minutes) *</label>
              <input type="number" min={1} max={1440} required value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} /></div>
            <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>What did you work on?</label>
              <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Deep work — backend API" /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Date</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:6 }}>
              <button type="submit" className="btn btn-purple" style={{ flex:1 }}>Log It</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
