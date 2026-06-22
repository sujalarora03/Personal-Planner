import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Flame, CheckCircle2 } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const PRESET_ICONS = ['✓', '💧', '📚', '🏃', '🧘', '💊', '🥗', '😴', '✍️', '🎯', '🎸', '🧹']
const PRESET_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6']
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Generate the labels for the last 7 days ending today
function getWeekLabels() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    return WEEK_DAYS[d.getDay()]
  })
}

function HeatmapRow({ weekLog, color }) {
  const labels = getWeekLabels()
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {(weekLog || Array(7).fill(false)).map((done, i) => (
        <div key={i} title={labels[i]} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5,
            background: done ? color : 'rgba(255,255,255,0.06)',
            border: `1px solid ${done ? color + '80' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: done ? `0 0 6px ${color}55` : 'none',
            transition: 'all 0.2s',
          }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
            {labels[i][0]}
          </span>
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
            <div className="glass" style={{ padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔥</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>Build your first habit</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
                Small daily actions compound into extraordinary results. Start with one habit today.
              </div>
              <button className="btn btn-purple" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Add your first habit
              </button>
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
                    opacity: h.done_today ? 0.8 : 1 }}>

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
                      boxShadow: h.done_today ? `0 0 16px ${h.color}55` : 'none',
                    }}>
                    {h.done_today ? '✓' : h.icon}
                  </motion.button>

                  {/* Name + streak + heatmap */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15,
                      textDecoration: h.done_today ? 'line-through' : 'none',
                      color: h.done_today ? 'rgba(255,255,255,0.5)' : 'white',
                      marginBottom: 6 }}>
                      {h.name}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <HeatmapRow weekLog={h.week_log} color={h.color} />
                      {h.streak > 0 && (
                        <span style={{
                          fontSize: 11, color: '#f59e0b',
                          display: 'flex', alignItems: 'center', gap: 3,
                          background: 'rgba(245,158,11,0.1)', padding: '2px 8px',
                          borderRadius: 20, border: '1px solid rgba(245,158,11,0.2)',
                        }}>
                          <Flame size={11} /> {h.streak}d streak
                        </span>
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
                      boxShadow: form.color === c ? `0 0 10px ${c}` : 'none',
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
