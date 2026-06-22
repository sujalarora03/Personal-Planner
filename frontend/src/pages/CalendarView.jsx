import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, CheckSquare, Calendar } from 'lucide-react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const PRIORITY_COLORS = { Low: '#6b7280', Medium: '#3b82f6', High: '#f59e0b', Urgent: '#ef4444' }

function TaskChip({ task }) {
  const pc = PRIORITY_COLORS[task.priority] || '#6b7280'
  return (
    <div style={{
      background: pc + '20', border: `1px solid ${pc}40`,
      borderRadius: 5, padding: '2px 6px', fontSize: 10, color: 'white',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      cursor: 'default',
    }} title={task.title}>
      <span style={{ color: pc }}>●</span> {task.title}
    </div>
  )
}

export default function CalendarView() {
  const now   = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [tasks, setTasks] = useState([])
  const [habits, setHabits] = useState([])
  const [selected, setSelected] = useState(null) // date string
  const [showAdd, setShowAdd]   = useState(false)
  const [newTask, setNewTask]   = useState({ title: '', priority: 'Medium', due_date: '' })
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getTasks({ include_archived: false }).catch(() => []),
      api.getHabits().catch(() => []),
    ]).then(([t, h]) => { setTasks(t); setHabits(h) })
      .finally(() => setLoading(false))
  }, [])

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    await api.createTask({ ...newTask, due_date: selected })
    toast.success('Task added!')
    setShowAdd(false)
    setNewTask({ title: '', priority: 'Medium' })
    const t = await api.getTasks({}).catch(() => [])
    setTasks(t)
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
  const today = new Date().toISOString().slice(0, 10)

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDay + 1
    if (dayNum < 1) return { date: null, num: prevMonthDays + dayNum, other: true }
    if (dayNum > daysInMonth) return { date: null, num: dayNum - daysInMonth, other: true }
    const d = String(dayNum).padStart(2, '0')
    const m = String(month + 1).padStart(2, '0')
    const dateStr = `${year}-${m}-${d}`
    return { date: dateStr, num: dayNum, other: false }
  })

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const tasksForDay = (dateStr) => tasks.filter(t => t.due_date === dateStr && !t.archived)
  const habitsForDay = (dateStr) => {
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay()
    // Show habits done on that day if week_log is available
    return habits.filter(h => {
      if (!h.week_log) return false
      const today = new Date()
      const diff = Math.floor((today - new Date(dateStr + 'T00:00:00')) / 86400000)
      const idx = 6 - diff
      return idx >= 0 && idx < 7 && h.week_log[idx]
    })
  }

  const selectedTasks = selected ? tasksForDay(selected) : []

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
          }}>
            <Calendar size={22} color="white" />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Calendar</h1>
            <p className="page-sub" style={{ margin: 0 }}>Tasks by due date</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} className="btn btn-ghost btn-sm"><ChevronLeft size={16} /></button>
          <div style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>
            {MONTH_NAMES[month]} {year}
          </div>
          <button onClick={nextMonth} className="btn btn-ghost btn-sm"><ChevronRight size={16} /></button>
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }} className="btn btn-ghost btn-sm">Today</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', padding: '4px 0', letterSpacing: 1 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((cell, i) => {
          if (!cell.date) return (
            <div key={i} style={{ minHeight: 90, borderRadius: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '8px 6px' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.12)' }}>{cell.num}</div>
            </div>
          )
          const isToday = cell.date === today
          const isSelected = cell.date === selected
          const dayTasks = tasksForDay(cell.date)
          const hasTasks = dayTasks.length > 0

          return (
            <motion.div key={cell.date}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(cell.date === selected ? null : cell.date)}
              style={{
                minHeight: 90, borderRadius: 10, padding: '8px 6px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(124,58,237,0.15)' : isToday ? 'rgba(124,58,237,0.07)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : isToday ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)'}`,
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{
                  fontSize: 13, fontWeight: isToday ? 800 : 500,
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? '#7c3aed' : 'transparent',
                  color: isToday ? 'white' : 'rgba(255,255,255,0.7)',
                }}>
                  {cell.num}
                </div>
                {hasTasks && (
                  <span style={{ fontSize: 9, background: '#7c3aed30', color: '#c084fc', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>
                    {dayTasks.length}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayTasks.slice(0, 3).map(t => <TaskChip key={t.id} task={t} />)}
                {dayTasks.length > 3 && (
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', paddingLeft: 2 }}>+{dayTasks.length - 3} more</div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Selected day panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="glass" style={{ marginTop: 20, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} due
                </div>
              </div>
              <button className="btn btn-purple btn-sm"
                onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Add Task
              </button>
            </div>
            {selectedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                No tasks due on this day. Add one?
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedTasks.map(t => {
                  const pc = PRIORITY_COLORS[t.priority] || '#6b7280'
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 10, background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${pc}` }}>
                      <CheckSquare size={14} style={{ color: t.status === 'Done' ? '#10b981' : pc }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, textDecoration: t.status === 'Done' ? 'line-through' : 'none', color: t.status === 'Done' ? 'rgba(255,255,255,0.4)' : 'white' }}>
                          {t.title}
                        </div>
                        {t.project_name && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>📁 {t.project_name}</div>}
                      </div>
                      <span style={{ fontSize: 10, background: pc + '20', color: pc, padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>
                        {t.priority}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showAdd && (
        <Modal title={`Add Task — ${selected}`} onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Title *</label>
              <input required autoFocus value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Task title…" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Priority</label>
              <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}>
                {['Low','Medium','High','Urgent'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" className="btn btn-purple" style={{ flex: 1 }}>Add Task</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
