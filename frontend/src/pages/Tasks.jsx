import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Archive, Edit2, List, Columns } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const PRIORITIES  = ['Low', 'Medium', 'High', 'Urgent']
const STATUSES    = ['Todo', 'In Progress', 'Done']
const CATEGORIES  = ['General','Work','Personal','Health','Learning','Finance','Other']

const PRIORITY_COLORS = { Low:'#6b7280', Medium:'#3b82f6', High:'#f59e0b', Urgent:'#ef4444' }
const STATUS_COLORS   = { 'Todo':'#6b7280', 'In Progress':'#3b82f6', 'Done':'#10b981' }
const STATUS_NEXT     = { 'Todo':'In Progress', 'In Progress':'Done', 'Done':'Todo' }

function TaskForm({ initial, onSave, onClose, projects = [] }) {
  const [form, setForm] = useState(initial || { title:'', description:'', category:'General', priority:'Medium', due_date:'', project_id:'' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, project_id: form.project_id || null }) }} style={{ display:'flex', flexDirection:'column', gap:14 }}>
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
      {projects.length > 0 && (
        <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Project (optional)</label>
          <select value={form.project_id || ''} onChange={e => set('project_id', e.target.value ? +e.target.value : null)}>
            <option value="">— No project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
      )}
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
  const [projects, setProjects] = useState([])
  const [filter, setFilter]     = useState('All')
  const [catFilter, setCat]     = useState('All')
  const [projFilter, setProj]   = useState('All')
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [viewMode, setViewMode] = useState('list')  // 'list' | 'board'
  const [dragging, setDragging] = useState(null)    // { id, status }

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter !== 'All' && filter !== 'Archived') params.status = filter
      if (filter === 'Archived') params.include_archived = true
      if (catFilter !== 'All') params.category = catFilter
      if (projFilter !== 'All') params.project_id = projFilter
      const data = await api.getTasks(params)
      setTasks(filter === 'Archived' ? data.filter(t => t.archived) : data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { api.getProjects().then(setProjects).catch(() => {}) }, [])
  useEffect(() => { load() }, [filter, catFilter, projFilter])

  const visible = search
    ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks

  const handleAdd = async (form) => {
    await api.createTask(form)
    toast.success('Task added!')
    setShowAdd(false)
    load()
  }

  const handleEdit = async (form) => {
    await api.updateTask(editing.id, form)
    toast.success('Task updated!')
    setEditing(null)
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
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div className="glass" style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
            <button className={`btn btn-sm ${viewMode==='list' ? 'btn-purple' : 'btn-ghost'}`}
              style={{ borderRadius:0, border:'none' }} onClick={() => setViewMode('list')}>
              <List size={14}/>
            </button>
            <button className={`btn btn-sm ${viewMode==='board' ? 'btn-purple' : 'btn-ghost'}`}
              style={{ borderRadius:0, border:'none' }} onClick={() => setViewMode('board')}>
              <Columns size={14}/>
            </button>
          </div>
          <button className="btn btn-purple" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Task</button>
        </div>
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
        {projects.length > 0 && (
          <select value={projFilter} onChange={e => setProj(e.target.value)} style={{ width:160 }}>
            <option value="All">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Task list or Kanban board */}
      {viewMode === 'board' ? (
        /* ── Kanban Board ─────────────────────────────────────────── */
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, flex:1, minHeight:0 }}>
          {['Todo', 'In Progress', 'Done'].map(col => {
            const colTasks = tasks.filter(t => t.status === col && !t.archived)
            const colColor = STATUS_COLORS[col]
            return (
              <div key={col}
                onDragOver={e => e.preventDefault()}
                onDrop={async () => {
                  if (dragging && dragging.status !== col) {
                    await api.updateTask(dragging.id, { status: col })
                    setDragging(null); load()
                  } else { setDragging(null) }
                }}
                style={{ display:'flex', flexDirection:'column', gap:8, minHeight:200,
                  background: dragging ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderRadius:12, padding:8, border:`1px solid ${dragging ? colColor + '33' : 'rgba(255,255,255,0.04)'}`,
                  transition:'border-color 0.2s, background 0.2s' }}>
                <div style={{ fontWeight:700, fontSize:13, padding:'4px 6px', marginBottom:4,
                  color:colColor, display:'flex', justifyContent:'space-between' }}>
                  <span>{col}</span>
                  <span style={{ opacity:0.5 }}>{colTasks.length}</span>
                </div>
                {colTasks.map(task => {
                  const pc = PRIORITY_COLORS[task.priority] || '#6b7280'
                  const overdue = task.due_date && task.due_date < new Date().toISOString().slice(0,10)
                  return (
                    <div key={task.id}
                      draggable
                      onDragStart={() => setDragging({ id:task.id, status:task.status })}
                      onDragEnd={() => setDragging(null)}
                      className="glass"
                      style={{ padding:'10px 12px', cursor:'grab', borderLeft:`3px solid ${pc}`,
                        opacity: dragging?.id === task.id ? 0.4 : 1, transition:'opacity 0.2s' }}>
                      <div style={{ fontWeight:600, fontSize:13, marginBottom:6 }}>{task.title}</div>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        <span className="badge" style={{ background:`${pc}22`, color:pc, fontSize:10 }}>{task.priority}</span>
                        {task.project_name && <span className="badge" style={{ background:'rgba(124,58,237,0.12)', color:'#a78bfa', fontSize:10 }}>📁 {task.project_name}</span>}
                        {task.due_date && <span className="badge" style={{ background: overdue ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: overdue ? '#f87171' : 'rgba(255,255,255,0.4)', fontSize:10 }}>
                          {overdue ? '⚠ ' : ''}{new Date(task.due_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                        </span>}
                      </div>
                      <div style={{ display:'flex', gap:5, marginTop:8 }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding:'2px 6px' }} onClick={() => setEditing(task)}><Edit2 size={12}/></button>
                        <button className="btn btn-danger btn-sm" style={{ padding:'2px 6px' }} onClick={() => setDelConfirm(task)}><Trash2 size={12}/></button>
                      </div>
                    </div>
                  )
                })}
                {/* Drop zone hint when column empty */}
                {colTasks.length === 0 && (
                  <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                    color:'rgba(255,255,255,0.12)', fontSize:12, border:'2px dashed rgba(255,255,255,0.06)',
                    borderRadius:8, minHeight:80 }}>Drop here</div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ── List View ────────────────────────────────────────────── */
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {loading ? (
          <div className="page-loading"><div className="spinner-ring" /><span>Loading tasks…</span></div>
        ) : (
          <>
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
                  {task.project_name && <span className="badge" style={{ background:`${task.color || 'rgba(124,58,237,0.2)'}22`, color:'#a78bfa' }}>📁 {task.project_name}</span>}
                  {task.due_date && <span className="badge" style={{ background: overdue ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: overdue ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
                    {overdue ? '⚠ Overdue — ' : ''}Due {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                  </span>}
                </div>
              </div>
              {/* Actions */}
              <div style={{ display:'flex', gap:6 }}>
                {!task.archived && (
                  <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => setEditing(task)}><Edit2 size={14} /></button>
                )}
                {done && !task.archived && (
                  <button className="btn btn-ghost btn-sm" title="Archive" onClick={() => handleArchive(task.id)}><Archive size={14} /></button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => setDelConfirm(task)}><Trash2 size={14} /></button>
              </div>
            </motion.div>
          )
        })}
          </>
        )}
      </div>
      )} {/* end list/board */}

      {showAdd && <Modal title="New Task" onClose={() => setShowAdd(false)}><TaskForm projects={projects} onSave={handleAdd} onClose={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit Task" onClose={() => setEditing(null)}><TaskForm initial={editing} projects={projects} onSave={handleEdit} onClose={() => setEditing(null)} /></Modal>}

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
