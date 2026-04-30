import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Sparkles, Music, RefreshCw, X, Volume2, VolumeX } from 'lucide-react'

const MOODS = [
  { emoji: '🎯', label: 'Focused',     value: 'deeply focused and in a flow state, need concentration music' },
  { emoji: '⚡', label: 'Energetic',   value: 'energetic and pumped up, high energy, ready for anything' },
  { emoji: '😌', label: 'Chill',       value: 'relaxed and chilled out, calm and peaceful' },
  { emoji: '😄', label: 'Happy',       value: 'happy and joyful, in a great uplifting mood' },
  { emoji: '🌧', label: 'Melancholic', value: 'melancholic and reflective, bittersweet and introspective' },
  { emoji: '🔥', label: 'Motivated',   value: 'highly motivated and driven, pushing hard, never giving up' },
  { emoji: '😴', label: 'Sleepy',      value: 'sleepy and winding down, drifting into relaxation' },
  { emoji: '💜', label: 'Romantic',    value: 'romantic and tender, in a soft loving mood' },
  { emoji: '😰', label: 'Anxious',     value: 'anxious and stressed, need calming soothing music' },
  { emoji: '✨', label: 'Creative',    value: 'creative and inspired, in an artistic imaginative state' },
]

const GENRES = [
  'Pop', 'Hip-Hop', 'Lo-fi', 'Classical', 'Rock', 'EDM',
  'R&B', 'Jazz', 'Metal', 'Indie', 'Acoustic', 'Ambient',
  'Country', 'K-Pop', 'Latin', 'Electronic',
]

const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// Determine the best playback mode for a song
const songMode = (song) => {
  if (!song) return null
  if (song.yt_found && song.audio_url) return 'youtube'
  if (song.itunes_found && song.preview_url) return 'itunes'
  return null
}

export default function Relax() {
  // Picker
  const [selectedMood, setSelectedMood] = useState(null)
  const [customMood, setCustomMood]     = useState('')
  const [genres, setGenres]             = useState([])
  const [context, setContext]           = useState('')
  const [model, setModel]               = useState('llama3.2')

  // Results
  const [songs, setSongs]           = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState('')

  // Player
  const [playingIdx, setPlayingIdx]   = useState(null)
  const [isPlaying, setIsPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]       = useState(30)
  const [volume, setVolume]           = useState(1)

  const audioRef     = useRef(null)
  const songsRef     = useRef([])
  const idxRef       = useRef(null)
  const startPlayRef = useRef(null)

  songsRef.current = songs
  idxRef.current   = playingIdx

  // Boot audio element once (for iTunes 30s fallback)
  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio
    audio.volume = 1
    audio.addEventListener('timeupdate',     () => setCurrentTime(audio.currentTime))
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration || 30))
    audio.addEventListener('play',           () => setIsPlaying(true))
    audio.addEventListener('pause',          () => setIsPlaying(false))
    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      setCurrentTime(0)
      // Auto-advance to next playable track
      const curr = idxRef.current
      const list = songsRef.current
      if (curr !== null) {
        for (let i = curr + 1; i < list.length; i++) {
          if (songMode(list[i])) { startPlayRef.current?.(i); return }
        }
      }
      setPlayingIdx(null)
    })
    return () => { audio.pause(); audio.src = '' }
  }, [])

  const startPlay = (idx) => {
    const audio = audioRef.current
    const song  = songsRef.current[idx]
    const mode  = songMode(song)
    const url   = mode === 'youtube' ? song.audio_url : song?.preview_url
    if (!audio || !url) return
    audio.pause()
    audio.src = url
    audio.load()
    audio.play().catch(() => {})
    setPlayingIdx(idx)
    setCurrentTime(0)
  }
  startPlayRef.current = startPlay

  const handlePlayPause = (idx) => {
    const song = songs[idx]
    if (!song) return
    const mode = songMode(song)
    if (!mode) return
    const audio = audioRef.current
    if (!audio) return
    if (playingIdx === idx) {
      isPlaying ? audio.pause() : audio.play().catch(() => {})
    } else {
      startPlay(idx)
    }
  }

  const seekTo = (e, idx) => {
    if (playingIdx !== idx || !audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const toggleGenre = (g) =>
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const activeMood  = selectedMood?.value || customMood.trim()
  const progressPct = duration ? (currentTime / duration) * 100 : 0

  const getSuggestions = async () => {
    if (!activeMood || generating) return
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.src = '' }
    setPlayingIdx(null); setIsPlaying(false)
    setSongs([]); setError(''); setGenerating(true)

    const ctxParts = []
    if (context.trim()) ctxParts.push(context.trim())
    if (genres.length)  ctxParts.push(`Preferred genres: ${genres.join(', ')}`)

    try {
      const res  = await fetch('/api/mood/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: activeMood, context: ctxParts.join('. '), model }),
      })
      const data = await res.json()
      if (data.error && !data.songs?.length) { setError(data.error); setGenerating(false); return }

      const raw = (data.songs || []).slice(0, 8)
      setSongs(raw.map(s => ({ ...s, loading: true })))

      // Fetch YouTube + iTunes in parallel for each song
      raw.forEach(async (s, i) => {
        try {
          const [ytRes, itunesRes] = await Promise.all([
            fetch(`/api/music/youtube?artist=${encodeURIComponent(s.artist)}&title=${encodeURIComponent(s.title)}`).then(r => r.json()),
            fetch(`/api/music/preview?artist=${encodeURIComponent(s.artist)}&title=${encodeURIComponent(s.title)}`).then(r => r.json()),
          ])
          setSongs(prev => {
            const n = [...prev]
            if (n[i]) n[i] = {
              ...n[i],
              // YouTube (audio stream via yt-dlp)
              video_id:    ytRes.found ? ytRes.video_id  : null,
              audio_url:   ytRes.found ? ytRes.audio_url : null,
              channel:     ytRes.found ? ytRes.channel   : '',
              yt_found:    !!ytRes.found && !!ytRes.audio_url,
              watch_url:   ytRes.watch_url || null,
              yt_duration: ytRes.duration  || null,
              // iTunes
              preview_url:  itunesRes.found ? itunesRes.preview_url  : null,
              artwork_url:  itunesRes.found ? itunesRes.artwork_url  : null,
              track_name:   itunesRes.track_name  || s.title,
              artist_name:  itunesRes.artist_name || s.artist,
              genre:        itunesRes.genre       || '',
              itunes_found: !!itunesRes.found,
              // Prefer iTunes album art (square, higher quality) for thumbnails
              thumbnail: itunesRes.artwork_url || ytRes.thumbnail || null,
              loading: false,
            }
            return n
          })
        } catch {
          setSongs(prev => {
            const n = [...prev]
            if (n[i]) n[i] = { ...n[i], loading: false, yt_found: false, itunes_found: false }
            return n
          })
        }
      })
    } catch (err) { setError(err.message) }
    setGenerating(false)
  }

  const activeSong = playingIdx !== null ? songs[playingIdx] : null
  const activeMode = songMode(activeSong)

  return (
    <div className="page" style={{ paddingBottom: activeSong ? (activeMode === 'youtube' ? 215 : 80) : 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relax 🎧</h1>
          <p className="page-sub">Pick your mood · AI picks songs · Full songs via YouTube · 30s previews via iTunes</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          <span>Model:</span>
          <input value={model} onChange={e => setModel(e.target.value)} style={{ width: 130, fontSize: 12 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 22, alignItems: 'start' }}>

        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="glass" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
              How are you feeling?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {MOODS.map(m => {
                const active = selectedMood?.label === m.label
                return (
                  <button key={m.label} onClick={() => { setSelectedMood(m); setCustomMood('') }}
                    style={{
                      padding: '7px 10px', borderRadius: 8, border: '1px solid',
                      textAlign: 'left', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                      background:   active ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.04)',
                      borderColor:  active ? 'rgba(124,58,237,0.5)'  : 'rgba(255,255,255,0.07)',
                      color:        active ? 'white'                  : 'rgba(255,255,255,0.55)',
                    }}>
                    {m.emoji} {m.label}
                  </button>
                )
              })}
            </div>
            <input value={customMood} onChange={e => { setCustomMood(e.target.value); setSelectedMood(null) }}
              placeholder="Or describe your mood…"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, marginTop: 10 }} />
          </motion.div>

          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.05 }}
            className="glass" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
              Genre <span style={{ fontWeight: 400, fontSize: 10 }}>(optional)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {GENRES.map(g => {
                const active = genres.includes(g)
                return (
                  <button key={g} onClick={() => toggleGenre(g)} style={{
                    padding: '3px 9px', borderRadius: 6, border: '1px solid', fontSize: 11,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background:  active ? 'rgba(6,182,212,0.16)' : 'rgba(255,255,255,0.04)',
                    borderColor: active ? 'rgba(6,182,212,0.4)'  : 'rgba(255,255,255,0.07)',
                    color:       active ? '#22d3ee'               : 'rgba(255,255,255,0.45)',
                  }}>{g}</button>
                )
              })}
            </div>
          </motion.div>

          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.1 }}
            className="glass" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              Anything else?
            </div>
            <input value={context} onChange={e => setContext(e.target.value)}
              placeholder='e.g. "no vocals, instrumental only"'
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, marginBottom: 12 }} />
            <button className="btn btn-purple" style={{ width: '100%', justifyContent: 'center' }}
              onClick={getSuggestions} disabled={generating || !activeMood}>
              {generating
                ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite', marginRight: 6 }} />Finding songs…</>
                : <><Sparkles size={13} style={{ marginRight: 6 }} />Get My Playlist</>}
            </button>
          </motion.div>
        </div>

        {/* Right panel — song list */}
        <div>
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="err" initial={{ opacity:0 }} animate={{ opacity:1 }}
                style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 14,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5', fontSize: 14 }}>
                ⚠ {error}
              </motion.div>
            )}

            {songs.length === 0 && !generating && !error && (
              <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="glass" style={{ padding: '60px 40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 56, marginBottom: 14 }}>🎧</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Pick a mood, get a playlist</div>
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                  AI suggests songs → full songs stream from YouTube<br />
                  30-second previews via iTunes as fallback<br />
                  No account or login needed
                </div>
              </motion.div>
            )}

            {(songs.length > 0 || generating) && (
              <motion.div key="list" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {selectedMood && (
                    <span style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.35)',
                      color: '#a78bfa', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                      {selectedMood.emoji} {selectedMood.label}
                    </span>
                  )}
                  {genres.slice(0, 4).map(g => (
                    <span key={g} style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
                      color: '#22d3ee', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}>{g}</span>
                  ))}
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                    {songs.filter(s => s.yt_found).length} YouTube · {songs.filter(s => !s.yt_found && s.itunes_found).length} iTunes
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {songs.map((song, idx) => {
                    const active   = playingIdx === idx
                    const mode     = songMode(song)
                    const hasAudio = !!mode
                    return (
                      <motion.div key={idx}
                        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: idx * 0.05 }}
                        style={{
                          borderRadius: 12, overflow: 'hidden',
                          border: `1px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                          background: active ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>

                          {/* Album art / thumbnail */}
                          <div style={{ width: 72, height: 72, flexShrink: 0, overflow: 'hidden' }}>
                            {song.loading ? (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', background: `hsl(${idx * 43 + 220}deg 35% 18%)`,
                                animation: 'pulse 1.4s ease-in-out infinite' }}>
                                <Music size={18} color="rgba(255,255,255,0.25)" />
                              </div>
                            ) : song.thumbnail ? (
                              <img src={song.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', background: `hsl(${idx * 43 + 220}deg 35% 18%)` }}>
                                <Music size={18} color="rgba(255,255,255,0.35)" />
                              </div>
                            )}
                          </div>

                          {/* Song info */}
                          <div style={{ flex: 1, padding: '10px 14px', minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {song.track_name || song.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#a78bfa', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {song.artist_name || song.artist}
                            </div>
                            <div style={{ display: 'flex', gap: 5, marginTop: 4, alignItems: 'center' }}>
                              {song.loading ? (
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Loading…</span>
                              ) : song.yt_found ? (
                                <>
                                  <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.15)',
                                    color: '#f87171', borderRadius: 4, padding: '1px 6px', border: '1px solid rgba(239,68,68,0.25)' }}>
                                    ▶ YouTube
                                  </span>
                                  {song.yt_duration && (
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>
                                      {fmtTime(song.yt_duration)}
                                    </span>
                                  )}
                                </>
                              ) : song.itunes_found ? (
                                <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(251,146,60,0.12)',
                                  color: '#fb923c', borderRadius: 4, padding: '1px 6px', border: '1px solid rgba(251,146,60,0.2)' }}>
                                  ◑ 30s Preview
                                </span>
                              ) : (
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>No audio found</span>
                              )}
                              {song.genre && !song.loading && (
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{song.genre}</span>
                              )}
                            </div>
                          </div>

                          {/* Play button */}
                          <div style={{ padding: '0 16px', flexShrink: 0 }}>
                            {song.loading ? (
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RefreshCw size={13} color="rgba(255,255,255,0.25)" style={{ animation: 'spin 1s linear infinite' }} />
                              </div>
                            ) : hasAudio ? (
                              <button onClick={() => handlePlayPause(idx)} style={{
                                width: 36, height: 36, borderRadius: '50%', border: 'none',
                                background: active ? '#7c3aed' : (mode === 'youtube' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)'),
                                color: 'white', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                boxShadow: active ? '0 0 18px rgba(124,58,237,0.5)' : 'none',
                              }}>
                                {active && isPlaying
                                  ? <Pause size={14} />
                                  : <Play size={14} style={{ marginLeft: 2 }} />
                                }
                              </button>
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                <Music size={14} color="white" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* iTunes seek bar — only for active iTunes track */}
                        {active && mode === 'itunes' && (
                          <div onClick={e => seekTo(e, idx)}
                            style={{ height: 3, background: 'rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                            <div style={{ height: '100%', background: '#7c3aed',
                              width: `${progressPct}%`, transition: 'width 0.15s linear' }} />
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Persistent player bar ── */}
      <AnimatePresence>
        {activeSong && (
          <motion.div
            key={playingIdx}
            initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            style={{
              position: 'fixed', bottom: 0, left: 220, right: 0, zIndex: 30,
              background: 'rgba(6,6,18,0.98)', backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.09)',
              height: 68, display: 'flex',
            }}>
            <>
              {activeSong.thumbnail
                ? <img src={activeSong.thumbnail} alt=""
                    style={{ width: 68, height: 68, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 68, height: 68, background: 'rgba(124,58,237,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Music size={18} color="white" />
                  </div>
              }
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 14, padding: '0 20px' }}>
                <div style={{ minWidth: 0, flex: '0 0 175px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeSong.track_name || activeSong.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#a78bfa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeSong.artist_name || activeSong.artist}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                    {activeMode === 'youtube' ? '▶ YouTube Audio' : '◑ 30s iTunes Preview'}
                  </div>
                </div>
                <button onClick={() => handlePlayPause(playingIdx)} style={{
                    width: 34, height: 34, borderRadius: '50%', border: 'none',
                    background: '#7c3aed', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: 2 }} />}
                  </button>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', minWidth: 28 }}>{fmtTime(currentTime)}</span>
                    <div onClick={e => seekTo(e, playingIdx)}
                      style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, cursor: 'pointer' }}>
                      <div style={{ height: '100%', background: '#7c3aed', borderRadius: 2,
                        width: `${progressPct}%`, transition: 'width 0.15s linear' }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', minWidth: 28 }}>{fmtTime(duration)}</span>
                  </div>
                  {/* Volume control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => {
                      const v = volume === 0 ? 1 : 0
                      setVolume(v)
                      if (audioRef.current) audioRef.current.volume = v
                    }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <input type="range" min={0} max={1} step={0.02} value={volume}
                      onChange={e => {
                        const v = parseFloat(e.target.value)
                        setVolume(v)
                        if (audioRef.current) audioRef.current.volume = v
                      }}
                      style={{ width: 72, accentColor: '#7c3aed', cursor: 'pointer', height: 3, borderRadius: 2 }}
                    />
                  </div>
                  <button onClick={() => setPlayingIdx(null)} style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', display: 'flex', padding: 4 }}>
                    <X size={15} />
                  </button>
                </div>
              </>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
