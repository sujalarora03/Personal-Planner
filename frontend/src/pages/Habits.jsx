import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Flame } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const PRESET_ICONS = ['✓', '💧', '📚', '🏃', '🧘', '💊', '🥗', '😴', '✍️', '🎯', '🎸', '🧹']
const PRESET_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6']

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function WeekRow({ habitId }) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - 6 + i)
    return d.toISOString().slice(0, 10)
  })
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {days.map((d, i) => (
        <div key={d} style={{
          width: 20, height: 20, borderRadius: 4,
          fontSize: 9, color: 'rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title={d}>
          {DAYS[new Date(d + 'T00:00:00').getDay()]}
        </div>
      ))}
    </div>
  )
}

export default function Habits() {
  const [habits, setHabits]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ name: '', color: '#7c3aed', icon: '✓' })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = async () => {
    setLoading(true)
    try { setHabits(await api.getHabits()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleToggle = async (id) => {
    await api.toggleHabit(id)
    load()
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await api.createHabit(form)
    toast.success('Habit added!')
    setShowAdd(false)
    setForm({ name: '', color: '#7c3aed', icon: '✓' })
    load()
  }

  const handleDelete = async (id) => {
    await api.deleteHabit(id)
    toast('Habit removed')
    load()
  }

  const done = habits.filter(h => h.done_today).length
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Daily Habits</h1>
          <p className="page-sub">{today} · {done}/{habits.length} done today</p>
        </div>
        <button className="btn btn-purple" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Habit</button>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="glass" style={{ padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: done === habits.length ? '#10b981' : '#a78bfa', minWidth: 48 }}>
            {habits.length > 0 ? Math.round(done / habits.length * 100) : 0}%
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              {done === habits.length ? '🎉 All habits done today!' : `${habits.length - done} remaining`}
            </div>
            <div className="progress-bar">
              <motion.div className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: habits.length > 0 ? `${done / habits.length * 100}%` : '0%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ background: done === habits.length ? '#10b981' : 'linear-gradient(90deg,#7c3aed,#a78bfa)' }} />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="page-loading"><div className="spinner-ring" /><span>Loading habits…</span></div>
      ) : (
        <>
          {habits.length === 0 && (
            <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              No habits yet. Build consistency one habit at a time.
              <button className="btn btn-purple btn-sm" style={{ marginLeft: 16 }} onClick={() => setShowAdd(true)}>Add your first habit</button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {habits.map((h, i) => (
                <motion.div key={h.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }} transition={{ delay: i * 0.04 }}
                  className="glass glass-hover"
                  style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
                    borderLeft: `3px solid ${h.color}`,
                    opacity: h.done_today ? 0.75 : 1 }}>

                  {/* Check button */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleToggle(h.id)}
                    style={{
                      width: 42, height: 42, borderRadius: 12,
                      border: `2px solid ${h.color}`,
                      background: h.done_today ? h.color : 'transparent',
                      color: h.done_today ? 'white' : h.color,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 18, flexShrink: 0,
                      transition: 'all 0.2s',
                    }}>
                    {h.done_today ? '✓' : h.icon}
                  </motion.button>

                  {/* Name + streak */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15,
                      textDecoration: h.done_today ? 'line-through' : 'none',
                      color: h.done_today ? 'rgba(255,255,255,0.45)' : 'white' }}>
                      {h.name}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' }}>
                      {h.streak > 0 && (
                        <span style={{ fontSize: 12, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Flame size={12} /> {h.streak} day{h.streak !== 1 ? 's' : ''} streak
                        </span>
                      )}
                      {h.streak === 0 && (
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No streak yet</span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(h.id)}><Trash2 size={13} /></button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Add habit modal */}
      {showAdd && (
        <Modal title="New Habit" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Habit Name *</label>
              <input required autoFocus value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder="e.g. Morning walk, Read 20 pages…" />
            </div>

            {/* Icon picker */}
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, display: 'block' }}>Icon</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESET_ICONS.map(ic => (
                  <button key={ic} type="button"
                    onClick={() => setF('icon', ic)}
                    style={{
                      width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer',
                      border: form.icon === ic ? `2px solid ${form.color}` : '2px solid rgba(255,255,255,0.1)',
                      background: form.icon === ic ? `${form.color}22` : 'rgba(255,255,255,0.04)',
                    }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, display: 'block' }}>Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setF('color', c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid white' : '3px solid transparent',
                    }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" className="btn btn-purple" style={{ flex: 1 }}>Add Habit</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
