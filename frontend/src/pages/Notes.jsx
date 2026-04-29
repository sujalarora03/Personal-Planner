import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Save, FileText } from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

function NoteEditor({ note, projects, onSave, onDelete, onClose }) {
  const [title,   setTitle]   = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [projId,  setProjId]  = useState(note?.project_id || '')
  const [noteDate, setNoteDate] = useState(note?.note_date || new Date().toISOString().slice(0, 10))
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  const handleSave = async () => {
    await onSave({ title, content, note_date: noteDate, project_id: projId ? +projId : null })
  }

  const dirty = content !== (note?.content || '') || title !== (note?.title || '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 300 }}>
      <input value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Note title (optional)…"
        style={{ fontSize: 16, fontWeight: 600, background: 'transparent', border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)', borderRadius: 0, padding: '4px 0' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ width: 150 }} />
        {projects.length > 0 && (
          <select value={projId} onChange={e => setProjId(e.target.value)} style={{ flex: 1 }}>
            <option value="">— No project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write anything… thoughts, plans, meeting notes, ideas…"
        style={{
          flex: 1, minHeight: 240, resize: 'none', overflow: 'hidden',
          fontSize: 14, lineHeight: 1.7, background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
          padding: '12px 14px', fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(note?.id)}>
          <Trash2 size={13} /> Delete
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-purple" onClick={handleSave} disabled={!dirty && !!note?.id}>
            <Save size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Notes() {
  const [notes,    setNotes]   = useState([])
  const [projects, setProjects] = useState([])
  const [loading,  setLoading] = useState(true)
  const [editing,  setEditing] = useState(null)   // null | 'new' | note object
  const [dateFilter, setDateFilter] = useState('')
  const [search,   setSearch]  = useState('')

  const load = async () => {
    setLoading(true)
    try {
      await Promise.all([
        api.getNotes(dateFilter || undefined).then(setNotes),
        api.getProjects().then(setProjects).catch(() => {}),
      ])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [dateFilter])

  const handleCreate = async (form) => {
    const res = await api.createNote(form)
    toast.success('Note saved!')
    setEditing(null)
    load()
  }

  const handleUpdate = async (form) => {
    await api.updateNote(editing.id, form)
    toast.success('Note updated!')
    setEditing(null)
    load()
  }

  const handleDelete = async (id) => {
    if (!id) { setEditing(null); return }
    await api.deleteNote(id)
    toast('Note deleted')
    setEditing(null)
    load()
  }

  const filtered = search
    ? notes.filter(n => (n.title + n.content).toLowerCase().includes(search.toLowerCase()))
    : notes

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="page-sub">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-purple" onClick={() => setEditing('new')}><Plus size={16} /> New Note</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: 150 }} />
        {dateFilter && (
          <button className="btn btn-ghost btn-sm" onClick={() => setDateFilter('')}>Clear date</button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setDateFilter(today)}>Today</button>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner-ring" /><span>Loading notes…</span></div>
      ) : (
        <>
          {filtered.length === 0 && (
            <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              {search || dateFilter ? 'No notes match your filter.' : 'No notes yet. Capture your first thought.'}
              {!search && !dateFilter && (
                <button className="btn btn-purple btn-sm" style={{ marginLeft: 16 }} onClick={() => setEditing('new')}>New note</button>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            <AnimatePresence>
              {filtered.map((n, i) => (
                <motion.div key={n.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}
                  className="glass glass-hover"
                  style={{ padding: 18, cursor: 'pointer', borderTop: '2px solid rgba(124,58,237,0.3)' }}
                  onClick={() => setEditing(n)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                      {n.title || <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Untitled</span>}
                    </div>
                    <FileText size={13} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                  {n.content && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6,
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {n.content}
                    </div>
                  )}
                  <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', gap: 8 }}>
                    <span>{n.note_date || n.created_at?.slice(0, 10)}</span>
                    {n.project_name && <span>· 📁 {n.project_name}</span>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Editor modal */}
      {editing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <motion.div className="modal-box" style={{ width: 620, maxWidth: '95vw' }}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
              {editing === 'new' ? 'New Note' : 'Edit Note'}
            </div>
            <NoteEditor
              note={editing === 'new' ? null : editing}
              projects={projects}
              onSave={editing === 'new' ? handleCreate : handleUpdate}
              onDelete={handleDelete}
              onClose={() => setEditing(null)}
            />
          </motion.div>
        </div>
      )}
    </div>
  )
}
