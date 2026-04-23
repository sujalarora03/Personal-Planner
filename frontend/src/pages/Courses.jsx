import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const STATUSES   = ['Planned','In Progress','Completed','Dropped']
const CATEGORIES = ['Programming','Data Science','Cloud','Design','Business','Language','Other']
const STATUS_COLORS = { Planned:'#6b7280', 'In Progress':'#3b82f6', Completed:'#10b981', Dropped:'#ef4444' }

function CourseForm({ onSave, onClose }) {
  const [form, setForm] = useState({ title:'', provider:'', url:'', category:'Programming', status:'Planned', notes:'' })
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Course Title *</label>
        <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. AWS Solutions Architect" /></div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Provider</label>
          <input value={form.provider} onChange={e => set('provider', e.target.value)} placeholder="e.g. Udemy" /></div>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select></div>
      </div>
      <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>URL</label>
        <input type="url" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." /></div>
      <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Category</label>
        <select value={form.category} onChange={e => set('category', e.target.value)}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select></div>
      <div style={{ display:'flex', gap:10, marginTop:6 }}>
        <button type="submit" className="btn btn-purple" style={{ flex:1 }}>Add Course</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

export default function Courses() {
  const [courses, setCourses]   = useState([])
  const [filter,  setFilter]    = useState('All')
  const [showAdd, setShowAdd]   = useState(false)

  const load = () => api.getCourses(filter !== 'All' ? filter : undefined).then(setCourses).catch(() => {})
  useEffect(() => { load() }, [filter])

  const handleAdd    = async (form) => { await api.createCourse(form); toast.success('Course added!'); setShowAdd(false); load() }
  const handleDelete = async (id)  => { if (!confirm('Delete this course?')) return; await api.deleteCourse(id); toast('Deleted'); load() }
  const handleStatus = async (id, status) => { await api.updateCourse(id, { status }); load() }
  const handleProgress = async (id, progress) => { await api.updateCourse(id, { progress: +progress }); load() }

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div><h1 className="page-title">Courses</h1><p className="page-sub">{courses.length} course{courses.length !== 1 ? 's' : ''}</p></div>
        <button className="btn btn-purple" onClick={() => setShowAdd(true)}><Plus size={16}/> Add Course</button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {['All', ...STATUSES].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-purple' : 'btn-ghost'}`}
            onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
        {courses.length === 0 && (
          <div className="glass" style={{ padding:40, textAlign:'center', color:'rgba(255,255,255,0.3)', gridColumn:'1/-1' }}>
            No courses found.
          </div>
        )}
        {courses.map((c, i) => {
          const sc = STATUS_COLORS[c.status] || '#6b7280'
          return (
            <motion.div key={c.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              transition={{ delay: i*0.05 }} className="glass" style={{ padding:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ flex:1, marginRight:8 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{c.title}</div>
                  {c.provider && <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{c.provider}</div>}
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={13}/></a>}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={13}/></button>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <div className="progress-bar" style={{ marginBottom:6 }}>
                  <div className="progress-fill" style={{ width:`${c.progress}%`, background:sc }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,0.4)' }}>
                  <span>{c.progress}% complete</span>
                  <input type="number" min={0} max={100} defaultValue={c.progress}
                    onBlur={e => handleProgress(c.id, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleProgress(c.id, e.target.value)}
                    style={{ width:60, padding:'2px 8px', fontSize:11 }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {STATUSES.map(s => (
                  <button key={s} className={`btn btn-sm ${c.status === s ? 'btn-purple' : 'btn-ghost'}`}
                    style={{ fontSize:10 }} onClick={() => handleStatus(c.id, s)}>{s}</button>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      {showAdd && <Modal title="Add Course" onClose={() => setShowAdd(false)}><CourseForm onSave={handleAdd} onClose={() => setShowAdd(false)} /></Modal>}
    </div>
  )
}
