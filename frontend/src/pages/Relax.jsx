import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Music, Sparkles, RefreshCw } from 'lucide-react'

const MOODS = [
  { label: 'Focused 🎯',      value: 'focused and in deep work mode, need to concentrate' },
  { label: 'Energetic ⚡',    value: 'energetic and pumped up, ready to take on anything' },
  { label: 'Chill 😌',        value: 'relaxed and chilled out, unwinding after a long day' },
  { label: 'Happy 😄',        value: 'happy and cheerful, in a great mood' },
  { label: 'Melancholic 🌧',  value: 'melancholic and reflective, feeling introspective' },
  { label: 'Motivated 🔥',    value: 'highly motivated and ambitious, pushing hard toward goals' },
  { label: 'Sleepy 😴',       value: 'sleepy and winding down, almost ready to sleep' },
  { label: 'Romantic 💜',     value: 'romantic and in a soft emotional mood' },
  { label: 'Anxious 😰',      value: 'anxious and stressed, need calming music to settle nerves' },
  { label: 'Creative ✨',     value: 'creative and inspired, in an artistic flow state' },
]

// Parse "Artist - Title | reason" lines from streamed text
function parseSongs(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const songs = []
  for (const line of lines) {
    // match:  possibly a number/bullet, then [Artist] - [Song] | [reason]
    const m = line.match(/^(?:\d+\.|[-•*])?\s*(.+?)\s*[-–—]\s*(.+?)\s*\|\s*(.+)$/)
    if (m) {
      songs.push({ artist: m[1].trim(), title: m[2].trim(), reason: m[3].trim() })
    }
  }
  return songs
}

export default function Relax() {
  const [selectedMood, setSelectedMood] = useState(null)
  const [customMood, setCustomMood]     = useState('')
  const [context, setContext]           = useState('')
  const [model, setModel]               = useState('llama3.2')
  const [loading, setLoading]           = useState(false)
  const [rawText, setRawText]           = useState('')
  const readerRef = useRef(null)

  const activeMoodValue = selectedMood?.value || customMood.trim()

  const getSuggestions = async () => {
    if (!activeMoodValue || loading) return
    // Cancel previous stream if still running
    try { readerRef.current?.cancel() } catch (_) {}
    setRawText('')
    setLoading(true)

    try {
      const res = await fetch('/api/mood/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: activeMoodValue, context, model }),
      })
      if (!res.ok) {
        const err = await res.text()
        setRawText(`⚠ Error: ${err}`)
        setLoading(false)
        return
      }

      const reader  = res.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setRawText(full)
      }
    } catch (err) {
      if (err.name !== 'AbortError') setRawText(`⚠ ${err.message}`)
    }
    setLoading(false)
  }

  const songs  = parseSongs(rawText)
  const hasSongs = songs.length > 0

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Relax</h1>
        <p className="page-sub">Tell us your mood — get a personalised song list from AI</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* Left — mood picker */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Preset moods */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>How are you feeling?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {MOODS.map(m => (
                <button key={m.label}
                  onClick={() => { setSelectedMood(m); setCustomMood('') }}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: '1px solid',
                    textAlign: 'left', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: selectedMood?.label === m.label
                      ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.04)',
                    borderColor: selectedMood?.label === m.label
                      ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)',
                    color: selectedMood?.label === m.label ? 'white' : 'rgba(255,255,255,0.65)',
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom mood */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Or describe your mood</div>
            <input
              value={customMood}
              onChange={e => { setCustomMood(e.target.value); setSelectedMood(null) }}
              placeholder='e.g. "nostalgic, rainy afternoon, thinking about old memories"'
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Extra context */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              Anything else? <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>(optional)</span>
            </div>
            <input
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder='e.g. "prefer lo-fi, no vocals, something calming"'
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 14 }}
            />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
              Model:{' '}
              <input value={model} onChange={e => setModel(e.target.value)}
                style={{ width: 130, fontSize: 12, padding: '3px 8px', display: 'inline-block' }} />
            </div>
            <button className="btn btn-purple" style={{ width: '100%' }}
              onClick={getSuggestions}
              disabled={loading || !activeMoodValue}>
              {loading
                ? <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Generating…</>
                : <><Sparkles size={14} /> Suggest Songs</>}
            </button>
          </div>
        </motion.div>

        {/* Right — results */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.05 } }}>
          <AnimatePresence mode="wait">
            {!rawText && !loading && (
              <motion.div key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="glass"
                style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>🎵</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Pick a mood, get a vibe</div>
                <div style={{ fontSize: 13 }}>AI will suggest 8 songs tailored to how you feel right now</div>
              </motion.div>
            )}

            {(rawText || loading) && (
              <motion.div key="results"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                {/* Selected mood badge */}
                {activeMoodValue && (
                  <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.35)',
                      color: '#a78bfa', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                    }}>
                      {selectedMood?.label || `"${customMood}"`}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>mood playlist</span>
                  </div>
                )}

                {/* Parsed song cards */}
                {hasSongs ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {songs.map((s, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="glass"
                        style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: `hsl(${(i * 47 + 260) % 360},55%,30%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                        }}>
                          <Music size={16} color="white" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.title}
                          </div>
                          <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 2 }}>{s.artist}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{s.reason}</div>
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.2)',
                          minWidth: 20, textAlign: 'right',
                        }}>#{i + 1}</div>
                      </motion.div>
                    ))}
                    {loading && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '4px 8px' }}>
                        Finding more…
                      </div>
                    )}
                  </div>
                ) : (
                  /* Raw text fallback while streaming before enough lines to parse */
                  <div className="glass" style={{ padding: 20, fontSize: 14, lineHeight: 1.8, color: '#d1d5db', whiteSpace: 'pre-wrap' }}>
                    {rawText || 'Thinking…'}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
