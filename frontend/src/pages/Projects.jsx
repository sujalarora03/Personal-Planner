import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

function ProjectForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name:'', description:'', color:'#7c3aed', start_date:'', target_date:'' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Project Name *</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="What are you building?" /></div>
      <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Description</label>
        <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px', gap:12 }}>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Start</label>
          <input type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} /></div>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Target</label>
          <input type="date" value={form.target_date || ''} onChange={e => set('target_date', e.target.value)} /></div>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Color</label>
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)} style={{ height:42, cursor:'pointer' }} /></div>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:6 }}>
        <button type="submit" className="btn btn-purple" style={{ flex:1 }}>Save Project</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState(null)

  const load = () => api.getProjects().then(setProjects).catch(() => {})
  useEffect(() => { load() }, [])

  const handleAdd = async (form) => {
    await api.createProject(form); toast.success('Project created!'); setShowAdd(false); load()
  }
  const handleEdit = async (form) => {
    await api.updateProject(editing.id, form); toast.success('Updated'); setEditing(null); load()
  }
  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return
    await api.deleteProject(id); toast('Deleted'); load()
  }
  const handleProgress = async (id, progress) => {
    await api.updateProject(id, { progress }); load()
  }
  const handleStatus = async (id, status) => {
    await api.updateProject(id, { status }); load()
  }

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div><h1 className="page-title">Projects</h1><p className="page-sub">{projects.length} project{projects.length !== 1 ? 's' : ''}</p></div>
        <button className="btn btn-purple" onClick={() => setShowAdd(true)}><Plus size={16} /> New Project</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
        {projects.length === 0 && (
          <div className="glass" style={{ padding:40, textAlign:'center', color:'rgba(255,255,255,0.3)', gridColumn:'1/-1' }}>
            No projects yet. <button className="btn btn-purple btn-sm" style={{ marginLeft:12 }} onClick={() => setShowAdd(true)}>Create one</button>
          </div>
        )}
        {projects.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: i*0.06 }} className="glass"
            style={{ padding:20, borderTop:`3px solid ${p.color}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontWeight:700, fontSize:16 }}>{p.name}</div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}><Edit2 size={13} /></button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}><Trash2 size={13} /></button>
              </div>
            </div>
            {p.description && <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:14 }}>{p.description}</p>}
            <div style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>
                <span>Progress</span><span style={{ color:p.color, fontWeight:700 }}>{p.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${p.progress}%`, background:p.color }} />
              </div>
              <input type="range" min={0} max={100} value={p.progress}
                onChange={e => handleProgress(p.id, +e.target.value)}
                style={{ width:'100%', marginTop:8, padding:0, border:'none', background:'transparent', cursor:'pointer' }} />
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['Active','On Hold','Completed'].map(s => (
                <button key={s} className={`btn btn-sm ${p.status === s ? 'btn-purple' : 'btn-ghost'}`}
                  onClick={() => handleStatus(p.id, s)}>{s}</button>
              ))}
            </div>
            {(p.start_date || p.target_date) && (
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:10 }}>
                {p.start_date && `Start: ${p.start_date}`}{p.start_date && p.target_date && ' · '}{p.target_date && `Target: ${p.target_date}`}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {showAdd && <Modal title="New Project" onClose={() => setShowAdd(false)}><ProjectForm onSave={handleAdd} onClose={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit Project" onClose={() => setEditing(null)}><ProjectForm initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} /></Modal>}
    </div>
  )
}
