import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Save, FileText, Eye, Edit3 } from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

// Lightweight markdown → HTML (no external deps)
function renderMarkdown(md) {
  if (!md) return ''
  let html = md
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:12px;overflow-x:auto;"><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;font-size:0.9em;font-family:monospace;">$1</code>')
    // H1
    .replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:800;margin:16px 0 8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;">$1</h1>')
    // H2
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;margin:14px 0 6px;color:#c084fc;">$1</h2>')
    // H3
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:10px 0 4px;color:#a78bfa;">$1</h3>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em style="color:rgba(255,255,255,0.7);">$1</em>')
    // Strikethrough
    .replace(/~~([^~]+)~~/g, '<s style="opacity:0.5;">$1</s>')
    // Unordered list items
    .replace(/^[\-\*] (.+)$/gm, '<li style="margin:2px 0;">$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:2px 0;list-style-type:decimal;margin-left:16px;">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => `<ul style="padding-left:18px;margin:6px 0;">${m}</ul>`)
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:12px 0;">')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #7c3aed;padding-left:12px;margin:8px 0;color:rgba(255,255,255,0.6);font-style:italic;">$1</blockquote>')
    // Line breaks (double newline = paragraph)
    .replace(/\n\n/g, '</p><p style="margin:6px 0;">')
    .replace(/\n/g, '<br/>')
  return `<p style="margin:0;line-height:1.75;">${html}</p>`
}

function NoteEditor({ note, projects, onSave, onDelete, onClose }) {
  const [title,    setTitle]    = useState(note?.title || '')
  const [content,  setContent]  = useState(note?.content || '')
  const [projId,   setProjId]   = useState(note?.project_id || '')
  const [noteDate, setNoteDate] = useState(note?.note_date || new Date().toISOString().slice(0, 10))
  const [preview,  setPreview]  = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!preview && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content, preview])

  const handleSave = async () => {
    await onSave({ title, content, note_date: noteDate, project_id: projId ? +projId : null })
  }

  const handleExport = (format) => {
    if (!note?.id) return
    const a = document.createElement('a')
    a.href = `/api/notes/${note.id}/export?format=${format}`
    a.click()
    toast.success(`Note exported to ${format.toUpperCase()}`)
  }

  const dirty = content !== (note?.content || '') || title !== (note?.title || '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 300 }}>
      <input value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Note title (optional)…"
        style={{ fontSize: 16, fontWeight: 600, background: 'transparent', border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)', borderRadius: 0, padding: '4px 0' }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ width: 150 }} />
          {projects.length > 0 && (
            <select value={projId} onChange={e => setProjId(e.target.value)} style={{ flex: 1 }}>
              <option value="">— No project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        {/* Edit/Preview toggle */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <button onClick={() => setPreview(false)}
            style={{ padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 4,
              background: !preview ? 'rgba(124,58,237,0.25)' : 'transparent',
              color: !preview ? '#c084fc' : 'rgba(255,255,255,0.4)',
            }}>
            <Edit3 size={12} /> Edit
          </button>
          <button onClick={() => setPreview(true)}
            style={{ padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 4,
              background: preview ? 'rgba(124,58,237,0.25)' : 'transparent',
              color: preview ? '#c084fc' : 'rgba(255,255,255,0.4)',
            }}>
            <Eye size={12} /> Preview
          </button>
        </div>
      </div>

      {preview ? (
        <div
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) || '<p style="color:rgba(255,255,255,0.2);font-style:italic;">Nothing to preview yet…</p>' }}
          style={{
            flex: 1, minHeight: 240, fontSize: 14, lineHeight: 1.75,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '12px 16px', color: 'rgba(255,255,255,0.85)',
            overflowY: 'auto',
          }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write anything… Supports **bold**, *italic*, # headings, - lists, `code`"
          style={{
            flex: 1, minHeight: 240, resize: 'none', overflow: 'hidden',
            fontSize: 14, lineHeight: 1.7, background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
            padding: '12px 14px', fontFamily: 'var(--font-mono)',
          }}
        />
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(note?.id)}>
            <Trash2 size={13} /> Delete
          </button>
          {note?.id && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleExport('markdown')} style={{ fontSize: 11, padding: '6px 10px' }} title="Export to Markdown (.md)">
                ⬇️ MD
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleExport('html')} style={{ fontSize: 11, padding: '6px 10px' }} title="Export to HTML (ideal for printing to PDF)">
                ⬇️ HTML
              </button>
            </div>
          )}
        </div>
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
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="glass skeleton" style={{ height: 140 }} />
          ))}
        </div>
      ) : (
        <>
          {filtered.length === 0 && (
            <div className="glass" style={{ padding: '60px 40px', textAlign: 'center' }}>
              {search || dateFilter ? (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>No matching notes</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Try a different search term or date filter</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>✍️</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>Your thinking space</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
                    Capture thoughts, meeting notes, ideas, and plans. Supports Markdown formatting.
                  </div>
                  <button className="btn btn-purple" onClick={() => setEditing('new')}>
                    <Plus size={16} /> Write first note
                  </button>
                </>
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
