import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const CATEGORIES = ['Personal','Career','Health','Finance','Learning','Other']

function TargetForm({ onSave, onClose }) {
  const [form, setForm] = useState({ title:'', description:'', category:'Personal', target_value:100, unit:'%', color:'#7c3aed' })
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Goal Title *</label>
        <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Read 24 books" /></div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 60px', gap:10 }}>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Target</label>
          <input type="number" value={form.target_value} onChange={e => set('target_value', +e.target.value)} /></div>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Unit</label>
          <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="%" /></div>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select></div>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Color</label>
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)} style={{ height:42, cursor:'pointer' }} /></div>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:6 }}>
        <button type="submit" className="btn btn-purple" style={{ flex:1 }}>Add Goal</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

export default function Targets() {
  const [targets, setTargets] = useState([])
  const [showAdd, setShowAdd] = useState(false)

  const load = () => api.getTargets().then(setTargets).catch(() => {})
  useEffect(() => { load() }, [])

  const handleAdd    = async (form) => { await api.createTarget(form); toast.success('Goal added!'); setShowAdd(false); load() }
  const handleDelete = async (id)  => { if (!confirm('Delete this goal?')) return; await api.deleteTarget(id); toast('Deleted'); load() }
  const handleProgress = async (id, val) => { await api.updateTarget(id, { current_value: +val }); load() }

  const year = new Date().getFullYear()

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div><h1 className="page-title">Year Targets {year}</h1><p className="page-sub">{targets.length} goal{targets.length !== 1 ? 's' : ''}</p></div>
        <button className="btn btn-purple" onClick={() => setShowAdd(true)}><Plus size={16}/> Add Goal</button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {targets.length === 0 && (
          <div className="glass" style={{ padding:40, textAlign:'center', color:'rgba(255,255,255,0.3)' }}>
            No goals yet. Set your first target for {year}!
          </div>
        )}
        {targets.map((t, i) => {
          const pct = t.target_value > 0 ? Math.min(100, Math.round(t.current_value / t.target_value * 100)) : 0
          return (
            <motion.div key={t.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
              transition={{ delay: i*0.06 }} className="glass" style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>{t.title}</div>
                  <span className="badge" style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)' }}>{t.category}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:28, fontWeight:800, color: t.color, lineHeight:1 }}>{pct}%</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{t.current_value} / {t.target_value} {t.unit}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}><Trash2 size={13}/></button>
                </div>
              </div>
              <div className="progress-bar" style={{ marginBottom:10 }}>
                <motion.div className="progress-fill"
                  initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.8, ease:'easeOut' }}
                  style={{ background: `linear-gradient(90deg, ${t.color}88, ${t.color})` }} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)', whiteSpace:'nowrap' }}>Update progress:</span>
                <input type="number" min={0} max={t.target_value * 2} defaultValue={t.current_value}
                  onBlur={e => handleProgress(t.id, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleProgress(t.id, e.target.value)}
                  style={{ width:100 }} />
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{t.unit}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {showAdd && <Modal title="New Year Goal" onClose={() => setShowAdd(false)}><TargetForm onSave={handleAdd} onClose={() => setShowAdd(false)} /></Modal>}
    </div>
  )
}
