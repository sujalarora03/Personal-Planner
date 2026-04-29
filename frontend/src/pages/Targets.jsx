import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const CATEGORIES = ['Personal','Career','Health','Finance','Learning','Other']

function TargetForm({ initial, onSave, onClose, submitLabel = 'Add Goal' }) {
  const [form, setForm] = useState(initial || { title:'', description:'', category:'Personal', target_value:100, unit:'%', color:'#7c3aed' })
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
        <button type="submit" className="btn btn-purple" style={{ flex:1 }}>{submitLabel}</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

export default function Targets() {
  const [targets, setTargets]   = useState([])
  const [showAdd, setShowAdd]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [year, setYear]         = useState(new Date().getFullYear())

  const load = async () => {
    setLoading(true)
    try { await api.getTargets(year).then(setTargets) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [year])

  const handleAdd    = async (form) => { await api.createTarget({ ...form, year }); toast.success('Goal added!'); setShowAdd(false); load() }
  const handleEdit   = async (form) => { await api.updateTarget(editTarget.id, form); toast.success('Goal updated!'); setEditTarget(null); load() }
  const handleDelete = async (id)  => { await api.deleteTarget(id); toast('Goal deleted'); setDelConfirm(null); load() }
  const handleProgress = async (id, val) => { await api.updateTarget(id, { current_value: +val }); load() }

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Year Targets</h1>
          <p className="page-sub">{targets.length} goal{targets.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setYear(y => y - 1)} title="Previous year"><ChevronLeft size={15}/></button>
          <span style={{ fontWeight:700, fontSize:18, minWidth:52, textAlign:'center', color:'#a78bfa' }}>{year}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setYear(y => y + 1)} title="Next year"><ChevronRight size={15}/></button>
          <button className="btn btn-purple" style={{ marginLeft:8 }} onClick={() => setShowAdd(true)}><Plus size={16}/> Add Goal</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom:18 }}>
        <input placeholder="Search goals…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:280 }} />
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner-ring" /><span>Loading goals…</span></div>
      ) : (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {targets.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase())).length === 0 && (
          <div className="glass" style={{ padding:40, textAlign:'center', color:'rgba(255,255,255,0.3)' }}>
            {search ? `No goals match "${search}"` : `No goals yet. Set your first target for ${year}!`}
          </div>
        )}
        {targets.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase())).map((t, i) => {
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
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <button className="btn btn-ghost btn-sm" title="Edit goal" onClick={() => setEditTarget(t)}><Edit2 size={13}/></button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDelConfirm(t)}><Trash2 size={13}/></button>
                  </div>
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
      )}

      {showAdd && <Modal title="New Year Goal" onClose={() => setShowAdd(false)}><TargetForm onSave={handleAdd} onClose={() => setShowAdd(false)} submitLabel="Add Goal" /></Modal>}
      {editTarget && <Modal title="Edit Goal" onClose={() => setEditTarget(null)}><TargetForm initial={editTarget} onSave={handleEdit} onClose={() => setEditTarget(null)} submitLabel="Save Changes" /></Modal>}

      {delConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDelConfirm(null)}>
          <motion.div className="modal-box" style={{ width:380 }}
            initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#f87171', marginBottom:12 }}>🗑 Delete Goal?</h2>
            <p style={{ color:'rgba(255,255,255,0.6)', marginBottom:24 }}>
              "<strong>{delConfirm.title}</strong>" will be permanently removed.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-danger" style={{ flex:1 }} onClick={() => handleDelete(delConfirm.id)}>Delete</button>
              <button className="btn btn-ghost" onClick={() => setDelConfirm(null)}>Cancel</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
