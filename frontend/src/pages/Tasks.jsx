import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Archive, ChevronRight } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const PRIORITIES  = ['Low', 'Medium', 'High', 'Urgent']
const STATUSES    = ['Todo', 'In Progress', 'Done']
const CATEGORIES  = ['General','Work','Personal','Health','Learning','Finance','Other']

const PRIORITY_COLORS = { Low:'#6b7280', Medium:'#3b82f6', High:'#f59e0b', Urgent:'#ef4444' }
const STATUS_COLORS   = { 'Todo':'#6b7280', 'In Progress':'#3b82f6', 'Done':'#10b981' }
const STATUS_NEXT     = { 'Todo':'In Progress', 'In Progress':'Done', 'Done':'Todo' }

function TaskForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { title:'', description:'', category:'General', priority:'Medium', due_date:'' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Title *</label>
        <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs to be done?" /></div>
      <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Description</label>
        <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional details..." /></div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Priority</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select></div>
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select></div>
      </div>
      <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Due Date</label>
        <input type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} /></div>
      <div style={{ display:'flex', gap:10, marginTop:6 }}>
        <button type="submit" className="btn btn-purple" style={{ flex:1 }}>Save Task</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

export default function Tasks() {
  const [tasks, setTasks]       = useState([])
  const [filter, setFilter]     = useState('All')
  const [catFilter, setCat]     = useState('All')
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [delConfirm, setDelConfirm] = useState(null)

  const load = async () => {
    const params = {}
    if (filter !== 'All' && filter !== 'Archived') params.status = filter
    if (filter === 'Archived') params.include_archived = true
    if (catFilter !== 'All') params.category = catFilter
    const data = await api.getTasks(params)
    setTasks(filter === 'Archived' ? data.filter(t => t.archived) : data)
  }

  useEffect(() => { load() }, [filter, catFilter])

  const visible = search
    ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks

  const handleAdd = async (form) => {
    await api.createTask(form)
    toast.success('Task added!')
    setShowAdd(false)
    load()
  }

  const handleToggle = async (task) => {
    await api.updateTask(task.id, { status: STATUS_NEXT[task.status] })
    load()
  }

  const handleDelete = async (id) => {
    await api.deleteTask(id)
    toast.success('Task deleted')
    setDelConfirm(null)
    load()
  }

  const handleArchive = async (id) => {
    await api.archiveTask(id)
    toast('Task archived 📦')
    load()
  }

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-sub">{visible.length} task{visible.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-purple" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Task</button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:200 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width:140 }}>
          {['All', ...STATUSES, 'Archived'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={catFilter} onChange={e => setCat(e.target.value)} style={{ width:140 }}>
          {['All', ...CATEGORIES].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Task list */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {visible.length === 0 && (
          <div className="glass" style={{ padding:40, textAlign:'center', color:'rgba(255,255,255,0.3)' }}>
            No tasks found. {filter === 'All' && <button className="btn btn-purple btn-sm" style={{ marginLeft:12 }} onClick={() => setShowAdd(true)}>Add your first task</button>}
          </div>
        )}
        {visible.map((task, i) => {
          const done = task.status === 'Done'
          const pc   = PRIORITY_COLORS[task.priority] || '#6b7280'
          const sc   = STATUS_COLORS[task.status] || '#6b7280'
          const overdue = task.due_date && task.due_date < new Date().toISOString().slice(0,10) && !done
          return (
            <motion.div key={task.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
              transition={{ delay: i * 0.03 }} className="glass glass-hover"
              style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14,
                borderLeft: `3px solid ${pc}`, opacity: done ? 0.6 : 1 }}>
              {/* Status toggle */}
              <button onClick={() => handleToggle(task)} style={{
                width:32, height:32, borderRadius:8, border:`2px solid ${sc}`,
                background: done ? sc : 'transparent', color: done ? 'white' : sc,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0,
              }}>{done ? '✓' : ''}</button>
              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, textDecoration: done ? 'line-through' : 'none',
                  color: done ? 'rgba(255,255,255,0.4)' : 'white', marginBottom:3 }}>{task.title}</div>
                {task.description && <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{task.description}</div>}
                <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                  <span className="badge" style={{ background:`${pc}22`, color:pc }}>{task.priority}</span>
                  <span className="badge" style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)' }}>{task.category}</span>
                  {task.due_date && <span className="badge" style={{ background: overdue ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: overdue ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
                    {overdue ? '⚠ Overdue — ' : ''}Due {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                  </span>}
                </div>
              </div>
              {/* Actions */}
              <div style={{ display:'flex', gap:6 }}>
                {done && !task.archived && (
                  <button className="btn btn-ghost btn-sm" title="Archive" onClick={() => handleArchive(task.id)}><Archive size={14} /></button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => setDelConfirm(task)}><Trash2 size={14} /></button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {showAdd && <Modal title="New Task" onClose={() => setShowAdd(false)}><TaskForm onSave={handleAdd} onClose={() => setShowAdd(false)} /></Modal>}

      {delConfirm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDelConfirm(null)}>
          <motion.div className="modal-box" style={{ width:380 }}
            initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#f87171', marginBottom:12 }}>🗑 Delete Task?</h2>
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
