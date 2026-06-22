import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckSquare, FileText, Rocket, BookOpen, CheckCircle2, X, ArrowRight, Command } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const TYPE_META = {
  task:    { icon: CheckSquare, color: '#a78bfa', route: '/tasks' },
  note:    { icon: FileText,    color: '#22d3ee', route: '/notes' },
  project: { icon: Rocket,      color: '#fb923c', route: '/projects' },
  habit:   { icon: CheckCircle2,color: '#34d399', route: '/habits' },
  course:  { icon: BookOpen,    color: '#818cf8', route: '/courses' },
}

async function globalSearch(query) {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results = []

  try {
    const [tasks, notes, projects, habits, courses] = await Promise.all([
      api.getTasks({}).catch(() => []),
      api.getNotes().catch(() => []),
      api.getProjects().catch(() => []),
      api.getHabits().catch(() => []),
      api.getCourses().catch(() => []),
    ])

    tasks.filter(t => !t.archived && (t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)))
      .slice(0, 5).forEach(t => results.push({ type: 'task', id: t.id, label: t.title, sub: t.status + (t.due_date ? ` · Due ${t.due_date}` : '') }))

    notes.filter(n => (n.title + n.content).toLowerCase().includes(q))
      .slice(0, 4).forEach(n => results.push({ type: 'note', id: n.id, label: n.title || 'Untitled note', sub: n.content?.slice(0, 60) }))

    projects.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      .slice(0, 3).forEach(p => results.push({ type: 'project', id: p.id, label: p.name, sub: p.status }))

    habits.filter(h => h.name?.toLowerCase().includes(q))
      .slice(0, 3).forEach(h => results.push({ type: 'habit', id: h.id, label: h.name, sub: h.streak > 0 ? `${h.streak} day streak` : 'No streak yet' }))

    courses.filter(c => (c.title + (c.provider || '')).toLowerCase().includes(q))
      .slice(0, 3).forEach(c => results.push({ type: 'course', id: c.id, label: c.title, sub: c.provider || c.status }))
  } catch (e) {
    console.error('Search error', e)
  }

  return results
}

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      const r = await globalSearch(query)
      setResults(r)
      setActiveIdx(0)
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const handleSelect = (item) => {
    navigate(TYPE_META[item.type].route)
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIdx]) handleSelect(results[activeIdx])
  }

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems: 'flex-start', paddingTop: '12vh' }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: 600, maxWidth: '95vw',
          background: 'rgba(10, 10, 20, 0.92)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Search size={18} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, notes, projects, habits, courses…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 16, color: 'white', padding: 0,
              fontFamily: 'var(--font-sans)',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>
              <X size={16} />
            </button>
          )}
          <kbd style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '2px 7px', fontSize: 11, color: 'rgba(255,255,255,0.3)',
            fontFamily: 'var(--font-mono)',
          }}>Esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              Searching…
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No results for "{query}"</div>
            </div>
          )}
          {!loading && results.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              {results.map((item, i) => {
                const meta = TYPE_META[item.type]
                const Icon = meta.icon
                const isActive = i === activeIdx
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 20px', cursor: 'pointer',
                      background: isActive ? 'rgba(139,92,246,0.1)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: meta.color + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={15} style={{ color: meta.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </div>
                      {item.sub && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.sub}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: meta.color, background: meta.color + '15', padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>
                        {item.type}
                      </span>
                      {isActive && <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {!query && (
            <div style={{ padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                {Object.entries(TYPE_META).map(([type, meta]) => {
                  const Icon = meta.icon
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                      <Icon size={12} style={{ color: meta.color }} /> {type}s
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Start typing to search across your planner</div>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 20px', display: 'flex', gap: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            <span>↑↓ navigate</span>
            <span>↵ open page</span>
            <span>Esc close</span>
          </div>
        )}
      </motion.div>
    </div>
  )
}
