import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, Palette, Database, Shield, Save, CheckCircle2,
  DownloadCloud, Trash2, RefreshCw,
} from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

const ACCENT_THEMES = [
  { id: 'purple', label: 'Purple',  color: '#8b5cf6', bg: 'linear-gradient(135deg,#8b5cf6,#6366f1)' },
  { id: 'ocean',  label: 'Ocean',   color: '#06b6d4', bg: 'linear-gradient(135deg,#06b6d4,#0284c7)' },
  { id: 'rose',   label: 'Rose',    color: '#f43f5e', bg: 'linear-gradient(135deg,#f43f5e,#ec4899)' },
  { id: 'amber',  label: 'Amber',   color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  { id: 'forest', label: 'Forest',  color: '#10b981', bg: 'linear-gradient(135deg,#10b981,#0d9488)' },
]

function SectionHeader({ icon: Icon, title, color = '#a78bfa' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={14} style={{ color }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
        {title}
      </span>
    </div>
  )
}

function Toggle({ value, onChange, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: value ? '#7c3aed' : 'rgba(255,255,255,0.1)',
          position: 'relative', transition: 'all 0.2s', flexShrink: 0,
          boxShadow: value ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 22 : 3,
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  )
}

export default function Settings() {
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('pp_theme') || 'purple')
  const [notifConfig, setNotifConfig] = useState({ pomodoro_done: true, task_due: true, habit_reminder: false, habit_reminder_time: '08:00' })
  const [saving, setSaving] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  // Backup scheduler states
  const [backupConfig, setBackupConfig] = useState({ enabled: false, interval: 'weekly', backup_dir: '', last_backup: '' })
  const [savingBackup, setSavingBackup] = useState(false)
  const [manualBackupRunning, setManualBackupRunning] = useState(false)

  useEffect(() => {
    api.getNotificationsConfig().then(setNotifConfig).catch(() => {})
    api.getBackupConfig().then(setBackupConfig).catch(() => {})
    // Apply saved theme on mount
    const saved = localStorage.getItem('pp_theme') || 'purple'
    if (saved !== 'purple') document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const applyTheme = (id) => {
    setActiveTheme(id)
    localStorage.setItem('pp_theme', id)
    if (id === 'purple') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', id)
    }
  }

  const saveNotifications = async () => {
    setSaving(true)
    try {
      await api.saveNotificationsConfig(notifConfig)
      toast.success('Notification settings saved!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const blob = await api.exportData()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `personal-planner-backup-${new Date().toISOString().slice(0,10)}.db`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Database exported!')
    } catch {
      toast.error('Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  const saveBackup = async () => {
    setSavingBackup(true)
    try {
      await api.saveBackupConfig(backupConfig)
      toast.success('Backup configuration saved!')
    } catch (e) {
      toast.error(e.message || 'Failed to save backup config')
    } finally {
      setSavingBackup(false)
    }
  }

  const runManualBackup = async () => {
    setManualBackupRunning(true)
    try {
      const res = await api.runBackupManual()
      toast.success('Backup created successfully!')
      setBackupConfig(prev => ({ ...prev, last_backup: new Date().toISOString() }))
    } catch (e) {
      toast.error('Backup failed: ' + (e.message || 'Error occurred'))
    } finally {
      setManualBackupRunning(false)
    }
  }

  const setN = (key, value) => setNotifConfig(prev => ({ ...prev, [key]: value }))

  return (
    <div className="page">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Customize your Personal Planner experience</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>

        {/* ── Accent Theme ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: 24 }}>
          <SectionHeader icon={Palette} title="Accent Color" color="#c084fc" />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {ACCENT_THEMES.map(theme => (
              <button key={theme.id} onClick={() => applyTheme(theme.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                background: activeTheme === theme.id ? theme.color + '18' : 'rgba(255,255,255,0.03)',
                border: `2px solid ${activeTheme === theme.id ? theme.color : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.2s',
                boxShadow: activeTheme === theme.id ? `0 0 16px ${theme.color}30` : 'none',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.bg, boxShadow: `0 4px 12px ${theme.color}40` }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: activeTheme === theme.id ? theme.color : 'rgba(255,255,255,0.4)' }}>
                  {theme.label}
                </span>
                {activeTheme === theme.id && (
                  <CheckCircle2 size={14} style={{ color: theme.color, position: 'absolute' }} />
                )}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            Theme is applied instantly and saved to your device.
          </div>
        </motion.div>

        {/* ── Notifications ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass" style={{ padding: 24 }}>
          <SectionHeader icon={Bell} title="Notifications" color="#fb923c" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Toggle value={notifConfig.pomodoro_done}   onChange={v => setN('pomodoro_done', v)}
              label="Focus Session Complete"  description="Get notified when a Pomodoro focus session finishes" />
            <Toggle value={notifConfig.task_due}        onChange={v => setN('task_due', v)}
              label="Task Due Reminder"       description="Notify 30 minutes before a task is due today" />
            <Toggle value={notifConfig.habit_reminder}  onChange={v => setN('habit_reminder', v)}
              label="Morning Habit Reminder"  description="Daily reminder to check your habits" />
            {notifConfig.habit_reminder && (
              <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Reminder time:</span>
                <input type="time" value={notifConfig.habit_reminder_time}
                  onChange={e => setN('habit_reminder_time', e.target.value)}
                  style={{ width: 120 }} />
              </div>
            )}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-purple btn-sm" onClick={saveNotifications} disabled={saving}>
              {saving ? <><RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</> : <><Save size={12} /> Save</>}
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            ℹ️ Notifications require the app to be running. Desktop toasts are used — no internet needed.
          </div>
        </motion.div>

        {/* ── Data Management ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass" style={{ padding: 24 }}>
          <SectionHeader icon={Database} title="Data Management" color="#34d399" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Export Database Backup</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Download your SQLite database file for safekeeping</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exportLoading} style={{ flexShrink: 0 }}>
                {exportLoading ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <DownloadCloud size={13} />}
                {exportLoading ? ' Exporting…' : ' Export'}
              </button>
            </div>
            <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Data Location</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>All data stored locally in your AppData folder</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: 6 }}>
                %APPDATA%\PersonalPlanner
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Auto-Backup Scheduler ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass" style={{ padding: 24 }}>
          <SectionHeader icon={Database} title="Local Auto-Backup" color="#60a5fa" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Toggle 
              value={backupConfig.enabled}   
              onChange={v => setBackupConfig(prev => ({ ...prev, enabled: v }))}
              label="Enable Automated Database Backups"  
              description="Automatically backup your database in the background when starting the application" 
            />

            {backupConfig.enabled && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Backup Frequency</label>
                  <select 
                    value={backupConfig.interval} 
                    onChange={e => setBackupConfig(prev => ({ ...prev, interval: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      fontSize: 13, 
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.2)', 
                      color: 'white', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    How often the scheduler will make a new backup version of your planner database.
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Backup Destination Directory (Optional)</label>
                  <input 
                    type="text" 
                    value={backupConfig.backup_dir} 
                    onChange={e => setBackupConfig(prev => ({ ...prev, backup_dir: e.target.value }))}
                    placeholder="e.g. C:\MyBackups or leave empty for default backups folder"
                    style={{ 
                      width: '100%', 
                      fontSize: 12, 
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.2)', 
                      color: 'white', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    Leave empty to store backups inside your AppData folder: <code>%APPDATA%\PersonalPlanner\backups</code>.
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {backupConfig.last_backup ? (
                  <span>Last backup run: <strong style={{ color: '#60a5fa' }}>{new Date(backupConfig.last_backup).toLocaleString()}</strong></span>
                ) : (
                  <span>No backup has run yet</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={runManualBackup} disabled={manualBackupRunning} style={{ color: '#60a5fa', borderColor: 'rgba(96,165,250,0.3)' }}>
                  {manualBackupRunning ? (
                    <><RefreshCw size={12} className="spinner-ring" style={{ animation: 'spin 1s linear infinite' }} /> Backing up...</>
                  ) : (
                    'Run Manual Backup Now'
                  )}
                </button>
                <button className="btn btn-purple btn-sm" onClick={saveBackup} disabled={savingBackup}>
                  {savingBackup ? <><RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</> : <><Save size={12} /> Save Config</>}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
              ℹ️ The system retains only the last 5 backup database files in the destination folder to conserve storage.
            </div>
          </div>
        </motion.div>

        {/* ── Privacy ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass" style={{ padding: 24 }}>
          <SectionHeader icon={Shield} title="Privacy & Security" color="#818cf8" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '🔒', title: 'Zero Cloud', desc: 'Your data never leaves your machine. No servers, no sync, no telemetry.' },
              { icon: '🤖', title: 'Local AI Only', desc: 'The LLM runs entirely on your GPU/CPU via llama-cpp-python. No API keys, no subscriptions.' },
              { icon: '📦', title: 'Open Source', desc: 'You can audit every line of code on GitHub — no hidden functionality.' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}
