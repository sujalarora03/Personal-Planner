import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  GitBranch, RefreshCw, CheckCircle2, AlertCircle,
  Code2, Heart, ExternalLink, Info, Sparkles,
} from 'lucide-react'
import { api } from '../api/client'

const GITHUB_URL  = 'https://github.com/sujalarora03/Personal-Planner'
const RELEASES_URL = 'https://github.com/sujalarora03/Personal-Planner/releases'

function openUrl(url) {
  // Use the backend open-url endpoint so PyWebView doesn't try to navigate
  fetch(`/api/open-url?url=${encodeURIComponent(url)}`).catch(() => {})
}

export default function Settings() {
  const [checking, setChecking]         = useState(false)
  const [updateResult, setUpdateResult] = useState(null) // null | { available, latest, current } | 'error'
  const [installing, setInstalling]     = useState(false)

  // Auto-check when the user opens this tab
  useEffect(() => {
    checkForUpdate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkForUpdate = async () => {
    setChecking(true)
    setUpdateResult(null)
    try {
      const data = await api.checkUpdate()
      setUpdateResult(data)
    } catch {
      setUpdateResult('error')
    } finally {
      setChecking(false)
    }
  }

  const startInstall = async () => {
    if (!updateResult || !updateResult.available) return
    setInstalling(true)
    try {
      // Trigger download then install via the existing updater endpoints
      await fetch('/api/update/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installer_url: updateResult.installer_url, version: updateResult.latest }),
      })
      // Poll until ready then install
      const poll = setInterval(async () => {
        const state = await fetch('/api/update/progress').then(r => r.json())
        if (state.status === 'ready') {
          clearInterval(poll)
          await fetch('/api/update/install', { method: 'POST' })
        } else if (state.status === 'error') {
          clearInterval(poll)
          setInstalling(false)
          openUrl(RELEASES_URL)
        }
      }, 1000)
    } catch {
      setInstalling(false)
      openUrl(RELEASES_URL)
    }
  }

  const isUpToDate  = updateResult && updateResult !== 'error' && !updateResult.available
  const hasUpdate   = updateResult && updateResult !== 'error' && updateResult.available
  const isError     = updateResult === 'error'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings ⚙️</h1>
          <p className="page-sub">About this app · Updates · Open Source</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 860 }}>

        {/* ── About card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass" style={{ padding: 28, gridColumn: '1 / -1' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, boxShadow: '0 0 28px rgba(124,58,237,0.45)',
            }}>⚡</div>

            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>Personal Planner</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{
                  background: 'rgba(124,58,237,0.25)', color: '#a78bfa',
                  padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                }}>v0.7.5 BETA</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  Your local-first AI life planner
                </span>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 22, paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
          }}>
            {[
              { icon: '🔒', label: 'Fully Local', desc: 'All data stored on your device. Nothing sent to any cloud.' },
              { icon: '🤖', label: 'AI-Powered',  desc: 'Runs Ollama LLMs locally — no OpenAI key or subscription.' },
              { icon: '🆓', label: 'Free Forever', desc: 'No paywalls, no subscriptions, no hidden costs.' },
            ].map(({ icon, label, desc }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'white', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Creator card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass" style={{ padding: 24 }}>

          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            color: 'rgba(255,255,255,0.35)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Heart size={12} color="#f472b6" /> Creator
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: 'white',
            }}>S</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>Sujal Arora</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Developer &amp; Designer
              </div>
            </div>
          </div>

          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7,
            background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            Built with <span style={{ color: '#f472b6' }}>♥</span> as a personal project to make
            productivity, AI, and self-improvement accessible to everyone — completely free and
            running 100% on your own machine.
          </div>
        </motion.div>

        {/* ── Open Source card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="glass" style={{ padding: 24 }}>

          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            color: 'rgba(255,255,255,0.35)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Code2 size={12} /> Open Source
          </div>

          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 18 }}>
            Personal Planner is <strong style={{ color: 'white' }}>open source</strong> under the MIT License.
            Browse the code, report issues, suggest features, or contribute — all on GitHub.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => openUrl(GITHUB_URL)}
              className="btn btn-ghost"
              style={{ justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <GitBranch size={14} /> Source Code
              </span>
              <ExternalLink size={12} style={{ opacity: 0.5 }} />
            </button>

            <button
              onClick={() => openUrl(RELEASES_URL)}
              className="btn btn-ghost"
              style={{ justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Sparkles size={14} /> All Releases &amp; Changelogs
              </span>
              <ExternalLink size={12} style={{ opacity: 0.5 }} />
            </button>
          </div>

          <div style={{
            marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6,
            borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12,
          }}>
            github.com/sujalarora03/Personal-Planner
          </div>
        </motion.div>

        {/* ── Updates card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
          className="glass" style={{ padding: 24, gridColumn: '1 / -1' }}>

          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            color: 'rgba(255,255,255,0.35)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <RefreshCw size={12} /> Software Updates
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                Current version: <strong style={{ color: 'white' }}>v0.7.5</strong>
                <span style={{
                  marginLeft: 8, background: 'rgba(124,58,237,0.2)', color: '#a78bfa',
                  padding: '1px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                }}>BETA</span>
              </div>
              {!updateResult && !checking && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  Checking for updates…
                </div>
              )}

              {/* Result states */}
              {isUpToDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
                  color: '#34d399', fontSize: 13, fontWeight: 600 }}>
                  <CheckCircle2 size={15} /> You're on the latest version!
                </div>
              )}
              {hasUpdate && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                    color: '#fbbf24', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                    <Info size={15} />
                    v{updateResult.latest} is available — you have v{updateResult.current}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={startInstall}
                      disabled={installing}
                      className="btn btn-purple btn-sm"
                      style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399' }}>
                      {installing
                        ? <><RefreshCw size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> Downloading &amp; Installing…</>
                        : <>⬇ Download &amp; Install Now</>}
                    </button>
                    <button
                      onClick={() => openUrl(RELEASES_URL)}
                      className="btn btn-ghost btn-sm">
                      <ExternalLink size={11} /> View on GitHub
                    </button>
                  </div>
                  {!installing && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                      The app will close and reinstall silently, then reopen.
                    </div>
                  )}
                </div>
              )}
              {isError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
                  color: '#f87171', fontSize: 13 }}>
                  <AlertCircle size={15} /> Couldn't reach GitHub. Check your internet connection.
                </div>
              )}
            </div>

            <button
              className="btn btn-purple"
              onClick={checkForUpdate}
              disabled={checking}
              style={{ flexShrink: 0 }}>
              {checking
                ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Checking…</>
                : <><RefreshCw size={13} /> Check for Updates</>}
            </button>
          </div>
        </motion.div>

        {/* ── Tech stack card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="glass" style={{ padding: 24, gridColumn: '1 / -1' }}>

          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            color: 'rgba(255,255,255,0.35)', marginBottom: 14,
          }}>
            Built With
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              ['⚛️', 'React 18'],   ['⚡', 'Vite'],        ['🐍', 'Python / FastAPI'],
              ['🗄️', 'SQLite'],     ['🤖', 'Ollama LLMs'], ['🎵', 'yt-dlp'],
              ['🖥️', 'PyWebView'], ['📦', 'PyInstaller'],  ['🔧', 'Inno Setup'],
            ].map(([emoji, name]) => (
              <span key={name} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {emoji} {name}
              </span>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}
