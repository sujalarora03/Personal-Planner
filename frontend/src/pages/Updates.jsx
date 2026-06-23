import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowUpCircle, RefreshCw, Cpu, Database, 
  Download, Play, CheckCircle, AlertTriangle, FileText, Sparkles
} from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

export default function Updates() {
  // Update State
  const [checking, setChecking] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [installedVersion, setInstalledVersion] = useState('')
  const [downloadState, setDownloadState] = useState({ status: 'idle', progress: 0, error_message: '' })
  
  // Local LLM State
  const [llmStatus, setLlmStatus] = useState({
    model_exists: false,
    model_path: '',
    download: { status: 'idle', progress: 0, error_message: '' },
    running: false
  })
  const [loadingLlm, setLoadingLlm] = useState(false)

  // Polling intervals
  const updatePollRef = useRef(null)
  const llmPollRef = useRef(null)

  useEffect(() => {
    api.getVersion().then(data => setInstalledVersion(data.version)).catch(() => {})
    checkUpdatesSilent()
    loadLlmStatus()

    return () => {
      if (updatePollRef.current) clearInterval(updatePollRef.current)
      if (llmPollRef.current) clearInterval(llmPollRef.current)
    }
  }, [])

  // ── Updates Logic ───────────────────────────────────────────

  const checkUpdatesSilent = async () => {
    try {
      const data = await api.checkUpdate()
      setUpdateInfo(data)
    } catch (_) {}
  }

  const handleCheckUpdates = async () => {
    setChecking(true)
    setUpdateInfo(null)
    try {
      const data = await api.checkUpdate()
      setUpdateInfo(data)
      if (data?.available) {
        toast.success('New version found!')
      } else if (data?.error) {
        toast.error(`Check failed: ${data.error}`)
      } else {
        toast('You are on the latest version!', { icon: '✨' })
      }
    } catch (e) {
      toast.error(`Check failed: ${e.message}`)
    } finally {
      setChecking(false)
    }
  }

  const handleStartDownload = async () => {
    if (!updateInfo?.installer_url) return
    try {
      await api.downloadUpdate(updateInfo.installer_url, updateInfo.latest)
      toast.success('Downloading update in background...')
      startUpdatePolling()
    } catch (e) {
      toast.error(`Download failed: ${e.message}`)
    }
  }

  const startUpdatePolling = () => {
    if (updatePollRef.current) clearInterval(updatePollRef.current)
    updatePollRef.current = setInterval(async () => {
      try {
        const state = await api.downloadUpdateStatus()
        setDownloadState(state)
        if (state.status === 'completed' || state.status === 'ready') {
          toast.success('Download complete! Ready to install.')
          clearInterval(updatePollRef.current)
        } else if (state.status === 'error') {
          toast.error(`Download failed: ${state.error_message}`)
          clearInterval(updatePollRef.current)
        }
      } catch (_) {
        clearInterval(updatePollRef.current)
      }
    }, 1000)
  }

  const handleInstallUpdate = async () => {
    try {
      toast('Installing update and restarting...', { icon: '⚡', duration: 4000 })
      await api.installUpdate()
    } catch (e) {
      toast.error(`Installation trigger failed: ${e.message}`)
    }
  }

  // ── Local LLM (Embedded AI) Logic ─────────────────────────────

  const loadLlmStatus = async () => {
    setLoadingLlm(true)
    try {
      const status = await api.getLlmStatus()
      setLlmStatus(status)
      if (status.download?.status === 'downloading') {
        startLlmPolling()
      }
    } catch (_) {
      setLlmStatus({
        model_exists: false,
        model_path: '',
        download: { status: 'idle', progress: 0, error_message: '' },
        running: false
      })
    } finally {
      setLoadingLlm(false)
    }
  }

  const handleStartLlmDownload = async () => {
    try {
      await api.startLlmDownload()
      toast.success('Starting local AI model download...')
      startLlmPolling()
    } catch (e) {
      toast.error(`Download failed: ${e.message}`)
    }
  }

  const startLlmPolling = () => {
    if (llmPollRef.current) clearInterval(llmPollRef.current)
    llmPollRef.current = setInterval(async () => {
      try {
        const status = await api.getLlmStatus()
        setLlmStatus(status)
        if (status.download?.status === 'completed') {
          toast.success('Local AI model downloaded successfully!')
          clearInterval(llmPollRef.current)
        } else if (status.download?.status === 'error') {
          toast.error(`Download failed: ${status.download.error_message}`)
          clearInterval(llmPollRef.current)
        }
      } catch (_) {
        clearInterval(llmPollRef.current)
      }
    }, 1500)
  }

  // ── Data Maintenance ────────────────────────────────────────

  const handleExportData = async () => {
    try {
      const blob = await api.exportData()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `personal-planner-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.success('Backup downloaded!')
    } catch (e) {
      toast.error(`Backup failed: ${e.message}`)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Updates & System Maintenance ⚙️</h1>
        <p className="page-sub">Keep your Personal Planner up-to-date and manage local AI assets</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Updates & Database Backup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Update Section */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass" 
            style={{ padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <ArrowUpCircle size={22} style={{ color: '#c084fc' }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Update Center</h2>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Installed Version</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)' }}>
                  v{installedVersion || updateInfo?.current || '0.8.18'}
                </div>
              </div>
              <button 
                className="btn btn-ghost" 
                onClick={handleCheckUpdates} 
                disabled={checking}
                style={{ height: 'fit-content' }}
              >
                {checking ? (
                  <RefreshCw size={14} className="spinner-ring" style={{ animation: 'spin 1s linear infinite', borderTopColor: '#c084fc' }} />
                ) : (
                  <RefreshCw size={14} />
                )}
                Check Now
              </button>
            </div>

            <AnimatePresence mode="wait">
              {updateInfo && (
                <motion.div 
                  key="update-details" 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  {updateInfo.available ? (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                        <CheckCircle size={15} /> Update available: v{updateInfo.latest}
                      </div>

                      {/* Download status / button */}
                      {downloadState.status === 'idle' && (
                        <button className="btn btn-purple btn-shimmer" style={{ width: '100%' }} onClick={handleStartDownload}>
                          <Download size={14} /> Download and Install Update
                        </button>
                      )}

                      {downloadState.status === 'downloading' && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Downloading setup...</span>
                            <span style={{ fontWeight: 700, color: '#c084fc' }}>{downloadState.progress}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${downloadState.progress}%`, background: 'var(--purple)' }} />
                          </div>
                        </div>
                      )}

                      {(downloadState.status === 'completed' || downloadState.status === 'ready') && (
                        <button className="btn btn-purple btn-shimmer" style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }} onClick={handleInstallUpdate}>
                          <Play size={14} /> Launch Installer & Restart App
                        </button>
                      )}

                      {downloadState.status === 'error' && (
                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: 12, borderRadius: 10, color: '#fca5a5', fontSize: 13, marginBottom: 10 }}>
                          <div style={{ display: 'flex', gap: 6, fontWeight: 700, marginBottom: 4 }}><AlertTriangle size={14} /> Download Failed</div>
                          <div>{downloadState.error_message}</div>
                          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={handleStartDownload}>
                            Retry Download
                          </button>
                        </div>
                      )}

                      {/* Release notes */}
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                          <FileText size={13} /> Release Notes
                        </div>
                        <div style={{ 
                          background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)', 
                          borderRadius: 10, padding: 12, fontSize: 12, color: 'rgba(255,255,255,0.6)', 
                          maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6
                        }}>
                          {updateInfo.notes}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18, color: 'rgba(255,255,255,0.4)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={15} style={{ color: '#10b981' }} /> Your app is completely up to date.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Local Data Backup */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="glass" 
            style={{ padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Database size={20} style={{ color: '#06b6d4' }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Local Database Backup</h2>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 16 }}>
              Download a full local copy of your tasks, projects, targets, courses, and habits. You can export this at any time. All data stays client-side.
            </p>
            <button className="btn btn-ghost" onClick={handleExportData} style={{ width: '100%' }}>
              <Download size={14} /> Export Backup File (.JSON)
            </button>
          </motion.div>
        </div>

        {/* Right Column: Embedded AI Engine Manager */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.05 }}
            className="glass" 
            style={{ padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Cpu size={22} style={{ color: '#a78bfa' }} />
                <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Embedded AI Engine</h2>
              </div>
              <button 
                onClick={loadLlmStatus} 
                className="btn btn-ghost btn-sm"
                style={{ padding: '6px 10px', minWidth: 0 }}
                title="Refresh LLM status"
                disabled={loadingLlm}
              >
                <RefreshCw size={13} style={{ animation: loadingLlm ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>

            {/* Model Status Card */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Qwen 2.5 3B Instruct (GGUF)</span>
                <span style={{ 
                  fontSize: 10, 
                  fontWeight: 700, 
                  padding: '3px 8px', 
                  borderRadius: 6, 
                  background: llmStatus.model_exists ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)', 
                  color: llmStatus.model_exists ? '#34d399' : '#fca5a5',
                  border: `1px solid ${llmStatus.model_exists ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                }}>
                  {llmStatus.model_exists ? 'ACTIVE' : 'MISSING'}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>Quantization:</span> Q4_K_M (4-bit optimized)
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>Resource footprint:</span> ~2.0 GB disk · ~2.8 GB RAM
                </div>
                <div style={{ wordBreak: 'break-all', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>Model Path:</span> 
                  <code style={{ fontSize: 10, background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 6, color: 'rgba(255,255,255,0.6)' }}>
                    {llmStatus.model_path || 'Pending setup'}
                  </code>
                </div>
                {llmStatus.model_exists && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                    <Sparkles size={13} />
                    {llmStatus.running ? 'Model is currently loaded in memory' : 'Standby (Loads on demand)'}
                  </div>
                )}
              </div>
            </div>

            {/* Download/Setup Section */}
            {!llmStatus.model_exists ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 6 }}>Setup Private Local AI</div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 16 }}>
                  The local AI engine runs 100% privately on your machine. You need to download the model file to enable quote generation, career advice, and music recommendations.
                </p>

                {llmStatus.download?.status === 'idle' && (
                  <button className="btn btn-purple btn-shimmer" style={{ width: '100%' }} onClick={handleStartLlmDownload}>
                    <Download size={14} /> Download AI Model (2.0 GB)
                  </button>
                )}

                {llmStatus.download?.status === 'downloading' && (
                  <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RefreshCw size={12} style={{ animation: 'spin 1.5s linear infinite' }} />
                        Downloading model...
                      </span>
                      <span style={{ fontWeight: 700, color: '#c084fc' }}>{llmStatus.download.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${llmStatus.download.progress}%`, background: 'var(--purple)' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, textAlign: 'center' }}>
                      Streaming from Hugging Face. Do not close the app.
                    </div>
                  </div>
                )}

                {llmStatus.download?.status === 'completed' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', fontSize: 12, fontWeight: 700 }}>
                    <CheckCircle size={14} /> Download complete! Initializing local model...
                  </div>
                )}

                {llmStatus.download?.status === 'error' && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', padding: 12, borderRadius: 10, color: '#fca5a5', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={13} /> Download Failed
                    </div>
                    <div style={{ marginBottom: 10 }}>{llmStatus.download.error_message}</div>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={handleStartLlmDownload}>
                      Retry Download
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: 16 }}>
                <CheckCircle size={18} style={{ color: '#34d399', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>AI Engine Ready</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 1.5 }}>
                    Your system is completely offline-capable. All AI completions are generated locally, fast, and privately.
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </div>
  )
}
