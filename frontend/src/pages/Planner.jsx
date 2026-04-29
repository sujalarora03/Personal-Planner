import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import toast from 'react-hot-toast'

const PRIORITY_COLORS = { Low: '#6b7280', Medium: '#3b82f6', High: '#f59e0b', Urgent: '#ef4444' }

function HabitCheck({ h, onToggle }) {
  return (
    <motion.button whileTap={{ scale: 0.85 }} onClick={() => onToggle(h.id)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left',
      background: h.done_today ? `${h.color}18` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${h.done_today ? h.color + '44' : 'rgba(255,255,255,0.06)'}`,
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        border: `2px solid ${h.color}`,
        background: h.done_today ? h.color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: h.done_today ? 'white' : h.color,
      }}>{h.done_today ? '✓' : h.icon}</div>
      <span style={{ fontSize: 13, color: h.done_today ? 'rgba(255,255,255,0.45)' : 'white',
        textDecoration: h.done_today ? 'line-through' : 'none' }}>{h.name}</span>
    </motion.button>
  )
}

export default function Planner() {
  const [data,    setData]    = useState({ tasks: [], sessions: [], habits: [], date: '' })
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { setData(await api.getTodayPlanner()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleToggleTask = async (task) => {
    const next = task.status === 'Todo' ? 'In Progress' : task.status === 'In Progress' ? 'Done' : 'Todo'
    await api.updateTask(task.id, { status: next })
    load()
  }

  const handleToggleHabit = async (id) => {
    await api.toggleHabit(id)
    load()
  }

  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const overdue = data.tasks.filter(t => t.due_date < data.date)
  const dueToday = data.tasks.filter(t => t.due_date === data.date)
  const totalMins = data.sessions.reduce((a, s) => a + s.duration_minutes, 0)
  const habitsDone = data.habits.filter(h => h.done_today).length

  return (
    <div className="page">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Today's Planner</h1>
        <p className="page-sub">{dateLabel}</p>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner-ring" /><span>Loading your day…</span></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>

          {/* Habits */}
          {data.habits.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
              className="glass" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>🧩 Habits</div>
                <span style={{ fontSize: 13, color: habitsDone === data.habits.length ? '#10b981' : '#a78bfa', fontWeight: 700 }}>
                  {habitsDone}/{data.habits.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.habits.map(h => <HabitCheck key={h.id} h={h} onToggle={handleToggleHabit} />)}
              </div>
            </motion.div>
          )}

          {/* Overdue */}
          {overdue.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass" style={{ padding: 20, borderTop: '3px solid #ef4444' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f87171', marginBottom: 14 }}>
                ⚠ Overdue ({overdue.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {overdue.map(t => {
                  const pc = PRIORITY_COLORS[t.priority] || '#6b7280'
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => handleToggleTask(t)} style={{
                        width: 28, height: 28, borderRadius: 7, border: `2px solid ${pc}`,
                        background: 'transparent', color: pc, cursor: 'pointer', flexShrink: 0, fontSize: 13,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: '#f87171' }}>
                          Due {new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {t.project_name && ` · 📁 ${t.project_name}`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Due today */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass" style={{ padding: 20, borderTop: '3px solid #7c3aed' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
              📋 Due Today ({dueToday.length})
            </div>
            {dueToday.length === 0 ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 0' }}>
                Nothing due today 🎉
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dueToday.map(t => {
                  const pc = PRIORITY_COLORS[t.priority] || '#6b7280'
                  const isIP = t.status === 'In Progress'
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => handleToggleTask(t)} style={{
                        width: 28, height: 28, borderRadius: 7,
                        border: `2px solid ${isIP ? '#3b82f6' : pc}`,
                        background: isIP ? 'rgba(59,130,246,0.15)' : 'transparent',
                        color: isIP ? '#60a5fa' : pc, cursor: 'pointer', flexShrink: 0, fontSize: 12,
                      }}>
                        {isIP ? '▶' : ''}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                        {t.project_name && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>📁 {t.project_name}</div>}
                      </div>
                      <span className="badge" style={{ background: `${pc}22`, color: pc, fontSize: 10 }}>{t.priority}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Work sessions today */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass" style={{ padding: 20, borderTop: '3px solid #06b6d4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>⏱ Work Today</div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#22d3ee' }}>
                {Math.floor(totalMins / 60)}h {totalMins % 60}m
              </span>
            </div>
            {data.sessions.length === 0 ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 0' }}>
                No sessions logged today yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.sessions.map(s => {
                  const h = Math.floor(s.duration_minutes / 60)
                  const m = s.duration_minutes % 60
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: 'rgba(6,182,212,0.1)',
                        border: '1px solid rgba(6,182,212,0.2)', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#22d3ee', lineHeight: 1 }}>{h}h</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{m}m</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.description || 'Work session'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                          {s.category}{s.project_name ? ` · 📁 ${s.project_name}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

        </div>
      )}
    </div>
  )
}
