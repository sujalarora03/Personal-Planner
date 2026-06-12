import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, Sparkles, Music, RefreshCw, X, Volume2, VolumeX,
  Search, CloudRain, Waves, Wind, Radio, Cpu, Download, CheckCircle, AlertTriangle
} from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'
import ScrollReveal from '../components/ScrollReveal'

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

const songMode = (song) => {
  if (!song) return null
  if (song.yt_found && song.audio_url) return 'youtube'
  if (song.itunes_found && song.preview_url) return 'itunes'
  return null
}

export default function Relax({
  globalSongs,
  setGlobalSongs,
  globalPlayingIdx,
  setGlobalPlayingIdx,
  globalIsPlaying,
  globalCurrentTime,
  globalDuration,
  globalVolume,
  handlePlayPause,
  seekTo,
  adjustVolume
}) {
  // Picker
  const [selectedMood, setSelectedMood] = useState(null)
  const [customMood, setCustomMood]     = useState('')
  const [genres, setGenres]             = useState([])
  const [context, setContext]           = useState('')

  // Search
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]       = useState(false)

  // Tabs
  const [activeTab, setActiveTab]       = useState('ai') // 'ai' or 'search'

  // Local AI Model status
  const [llmStatus, setLlmStatus] = useState({
    model_exists: false,
    download: { status: 'idle', progress: 0, error_message: '' }
  })
  const [loadingLlm, setLoadingLlm] = useState(false)
  const llmPollRef = useRef(null)

  // Results
  const [songs, setSongs]           = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState('')

  // Local Synthesis Focus Sounds
  const audioCtxRef = useRef(null)
  const soundNodesRef = useRef({})
  const [activeSounds, setActiveSounds] = useState({ rain: false, waves: false, white: false, brown: false })
  const [soundVolumes, setSoundVolumes] = useState({ rain: 0.3, waves: 0.3, white: 0.2, brown: 0.2 })

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtxRef.current
  }

  const createBrownNoiseBuffer = (ctx) => {
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0.0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + (0.02 * white)) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
    return buffer
  }

  const createWhiteNoiseBuffer = (ctx) => {
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    return buffer
  }

  const startSound = (type) => {
    try {
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      if (soundNodesRef.current[type]) {
        stopSound(type)
      }

      const source = ctx.createBufferSource()
      let noiseBuffer
      if (type === 'brown') {
        noiseBuffer = createBrownNoiseBuffer(ctx)
      } else if (type === 'white') {
        noiseBuffer = createWhiteNoiseBuffer(ctx)
      } else {
        noiseBuffer = createWhiteNoiseBuffer(ctx)
      }

      source.buffer = noiseBuffer
      source.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'

      const gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(0, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(soundVolumes[type], ctx.currentTime + 1.0)

      let lfo, lfoGain
      if (type === 'rain') {
        filter.frequency.setValueAtTime(1200, ctx.currentTime)
        source.connect(filter)
        filter.connect(gainNode)
      } else if (type === 'waves') {
        const brownBuffer = createBrownNoiseBuffer(ctx)
        source.buffer = brownBuffer
        filter.type = 'lowpass'
        filter.Q.setValueAtTime(2.0, ctx.currentTime)

        lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.setValueAtTime(0.08, ctx.currentTime)

        lfoGain = ctx.createGain()
        lfoGain.gain.setValueAtTime(200, ctx.currentTime)

        lfo.connect(lfoGain)
        lfoGain.connect(filter.frequency)
        lfo.start()

        filter.frequency.setValueAtTime(350, ctx.currentTime)

        source.connect(filter)
        filter.connect(gainNode)
      } else if (type === 'brown') {
        filter.frequency.setValueAtTime(300, ctx.currentTime)
        source.connect(filter)
        filter.connect(gainNode)
      } else {
        source.connect(gainNode)
      }

      gainNode.connect(ctx.destination)
      source.start()

      soundNodesRef.current[type] = { source, gainNode, filter, lfo, lfoGain }
      setActiveSounds(prev => ({ ...prev, [type]: true }))
    } catch (_) {}
  }

  const stopSound = (type) => {
    const nodeObj = soundNodesRef.current[type]
    if (nodeObj) {
      try {
        nodeObj.source.stop()
        if (nodeObj.lfo) nodeObj.lfo.stop()
      } catch (_) {}
      delete soundNodesRef.current[type]
    }
    setActiveSounds(prev => ({ ...prev, [type]: false }))
  }

  const toggleSound = (type) => {
    if (activeSounds[type]) {
      stopSound(type)
    } else {
      startSound(type)
    }
  }

  const adjustSoundVolume = (type, vol) => {
    setSoundVolumes(prev => ({ ...prev, [type]: vol }))
    const nodeObj = soundNodesRef.current[type]
    if (nodeObj && audioCtxRef.current) {
      nodeObj.gainNode.gain.setValueAtTime(vol, audioCtxRef.current.currentTime)
    }
  }

  // ── Local AI Model checks ─────────────────────────────────────

  const loadLlmStatus = async () => {
    setLoadingLlm(true)
    try {
      const status = await api.getLlmStatus()
      setLlmStatus(status)
      if (status.download?.status === 'downloading') {
        startLlmPolling()
      }
    } catch (_) {}
    finally {
      setLoadingLlm(false)
    }
  }

  const handleStartLlmDownload = async () => {
    try {
      await api.startLlmDownload()
      toast.success('Downloading local AI model in background...')
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
        if (status.download?.status === 'completed' || status.model_exists) {
          toast.success('Local AI Engine is ready!')
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

  useEffect(() => {
    loadLlmStatus()
    return () => {
      if (llmPollRef.current) clearInterval(llmPollRef.current)
      // Cleanup soundscapes
      Object.keys(soundNodesRef.current).forEach(type => {
        try {
          soundNodesRef.current[type].source.stop()
          if (soundNodesRef.current[type].lfo) soundNodesRef.current[type].lfo.stop()
        } catch (_) {}
      })
      soundNodesRef.current = {}
    }
  }, [])

  // ── Song Actions ─────────────────────────────────────────────

  const handlePlaySong = async (idx, songsList, setSongsList) => {
    const song = songsList[idx]
    if (!song) return

    // If YouTube link is already resolved, play it instantly
    if (song.yt_found && song.audio_url) {
      handlePlayPause(idx, songsList)
      return
    }

    // Set loading state for this specific song
    const updated = [...songsList]
    updated[idx] = { ...song, loading: true }
    setSongsList(updated)

    try {
      const artist = song.artist_name || song.artist || ''
      const title = song.track_name || song.title || ''
      const res = await fetch(`/api/music/youtube?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`)
      const data = await res.json()

      if (data.found && data.audio_url) {
        const finalSongs = [...songsList]
        finalSongs[idx] = {
          ...song,
          audio_url: data.audio_url,
          video_id: data.video_id,
          yt_found: true,
          loading: false,
          thumbnail: data.thumbnail || song.thumbnail
        }
        setSongsList(finalSongs)
        handlePlayPause(idx, finalSongs)
      } else if (song.preview_url) {
        // Fallback to 30-sec iTunes preview
        const finalSongs = [...songsList]
        finalSongs[idx] = {
          ...song,
          loading: false,
          itunes_found: true,
          yt_failed: true
        }
        setSongsList(finalSongs)
        handlePlayPause(idx, finalSongs)
        toast('YouTube audio unavailable — playing 30s preview fallback', { icon: '◑' })
      } else {
        const finalSongs = [...songsList]
        finalSongs[idx] = { ...song, loading: false, yt_failed: true }
        setSongsList(finalSongs)
        toast.error("Could not resolve audio streams for this song.")
      }
    } catch (_) {
      const finalSongs = [...songsList]
      if (song.preview_url) {
        finalSongs[idx] = { ...song, loading: false, yt_failed: true }
        setSongsList(finalSongs)
        handlePlayPause(idx, finalSongs)
      } else {
        finalSongs[idx] = { ...song, loading: false }
        setSongsList(finalSongs)
        toast.error("Connection error while searching audio streams.")
      }
    }
  }

  const toggleGenre = (g) =>
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const activeMood  = selectedMood?.value || customMood.trim()

  const getSuggestions = async () => {
    if (!activeMood || generating) return
    handlePlayPause(null) // Stop global playing
    setSongs([]); setError(''); setGenerating(true)
    setActiveTab('ai')

    const ctxParts = []
    if (context.trim()) ctxParts.push(context.trim())
    if (genres.length)  ctxParts.push(`Preferred genres: ${genres.join(', ')}`)

    try {
      const res  = await fetch('/api/mood/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: activeMood, context: ctxParts.join('. ') }),
      })
      const data = await res.json()
      if (data.error && !data.songs?.length) { 
        setError(data.error)
        setGenerating(false)
        return 
      }

      // Songs loaded, but keep loading: true for individual lazy resolving
      const raw = (data.songs || []).slice(0, 8)
      setSongs(raw.map(s => ({
        ...s,
        loading: false,
        yt_found: false,
        itunes_found: false
      })))

      // Pre-fetch iTunes previews silently for thumbnails & metadata
      raw.forEach(async (s, i) => {
        try {
          const itunesRes = await fetch(`/api/music/preview?artist=${encodeURIComponent(s.artist)}&title=${encodeURIComponent(s.title)}`).then(r => r.json())
          if (itunesRes.found) {
            setSongs(prev => {
              const n = [...prev]
              if (n[i]) n[i] = {
                ...n[i],
                preview_url:  itunesRes.preview_url,
                artwork_url:  itunesRes.artwork_url,
                track_name:   itunesRes.track_name,
                artist_name:  itunesRes.artist_name,
                genre:        itunesRes.genre,
                itunes_found: true,
                thumbnail:    itunesRes.artwork_url
              }
              return n
            })
          }
        } catch (_) {}
      })

    } catch (e) {
      setError('Could not connect to suggestion server.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim() || searching) return
    setSearching(true)
    setActiveTab('search')
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch (_) {
      toast.error('Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const getSuggestionsFromSearch = async () => {
    if (!searchQuery.trim() || generating) return
    handlePlayPause(null)
    setSongs([]); setError(''); setGenerating(true)
    setActiveTab('ai')

    try {
      const res = await fetch('/api/mood/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mood: `songs similar to and inspired by: ${searchQuery}`, 
          context: 'Focus on tracks with a similar vibe, artist style, or musical genre.' 
        }),
      })
      const data = await res.json()
      if (data.error && !data.songs?.length) { 
        setError(data.error)
        setGenerating(false)
        return 
      }

      const raw = (data.songs || []).slice(0, 8)
      setSongs(raw.map(s => ({
        ...s,
        loading: false,
        yt_found: false,
        itunes_found: false
      })))

      raw.forEach(async (s, i) => {
        try {
          const itunesRes = await fetch(`/api/music/preview?artist=${encodeURIComponent(s.artist)}&title=${encodeURIComponent(s.title)}`).then(r => r.json())
          if (itunesRes.found) {
            setSongs(prev => {
              const n = [...prev]
              if (n[i]) n[i] = {
                ...n[i],
                preview_url:  itunesRes.preview_url,
                artwork_url:  itunesRes.artwork_url,
                track_name:   itunesRes.track_name,
                artist_name:  itunesRes.artist_name,
                genre:        itunesRes.genre,
                itunes_found: true,
                thumbnail:    itunesRes.artwork_url
              }
              return n
            })
          }
        } catch (_) {}
      })

    } catch (e) {
      setError('Could not connect to suggestion server.')
    } finally {
      setGenerating(false)
    }
  }

  const renderSongList = (list, setListState) => {
    if (list.length === 0) {
      return (
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 12 }}>
          <Music size={24} style={{ marginBottom: 8, opacity: 0.6 }} />
          <div>No songs in list. Generate recommendations or search above.</div>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((song, idx) => {
          const active   = globalPlayingIdx === idx && globalSongs === list
          const mode     = songMode(song)
          const hasAudio = !!mode || (song.preview_url) || (!song.yt_found && !song.audio_url)
          return (
            <ScrollReveal key={idx} delay={idx * 0.04} duration={0.4}>
              <div 
                style={{
                  borderRadius: 12, overflow: 'hidden',
                  border: `1px solid ${active ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  background: active ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                  transition: 'border-color 0.2s, background 0.2s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>

                  {/* Album art / thumbnail */}
                  <div style={{ width: 64, height: 64, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                    {song.loading ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                        <RefreshCw size={16} className="spinner-ring" style={{ animation: 'spin 1s linear infinite' }} />
                      </div>
                    ) : song.thumbnail ? (
                      <img src={song.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: `hsl(${idx * 43 + 220}deg 30% 15%)` }}>
                        <Music size={18} color="rgba(255,255,255,0.3)" />
                      </div>
                    )}
                  </div>

                  {/* Song info */}
                  <div style={{ flex: 1, padding: '8px 14px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}>
                      {song.track_name || song.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.artist_name || song.artist}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      {song.loading ? (
                        <span style={{ fontSize: 10, color: '#c084fc', fontWeight: 600 }}>Resolving YouTube stream...</span>
                      ) : song.yt_found ? (
                        <>
                          <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,0.15)',
                            color: '#f87171', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(239,68,68,0.2)' }}>
                            ▶ YouTube
                          </span>
                          {song.yt_duration && (
                            <span className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                              {fmtTime(song.yt_duration)}
                            </span>
                          )}
                        </>
                      ) : (song.itunes_found && song.yt_failed) ? (
                        <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(251,146,60,0.12)',
                          color: '#fb923c', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(251,146,60,0.15)' }}>
                          ◑ 30s Preview
                        </span>
                      ) : (
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Online stream available</span>
                      )}
                      {song.genre && !song.loading && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>· {song.genre}</span>
                      )}
                    </div>
                  </div>

                  {/* Play button */}
                  <div style={{ padding: '0 16px', flexShrink: 0 }}>
                    {song.loading ? (
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={13} color="rgba(255,255,255,0.2)" style={{ animation: 'spin 1s linear infinite' }} />
                      </div>
                    ) : hasAudio ? (
                      <button 
                        onClick={() => handlePlaySong(idx, list, setListState)} 
                        style={{
                          width: 34, height: 34, borderRadius: '50%', border: 'none',
                          background: active ? '#7c3aed' : (song.yt_found ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'),
                          color: 'white', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                          boxShadow: active ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                        }}>
                        {active && globalIsPlaying
                          ? <Pause size={13} />
                          : <Play size={13} style={{ marginLeft: 2 }} />
                        }
                      </button>
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.02)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25 }}>
                        <Music size={13} color="white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* iTunes seek bar — only for active iTunes track */}
                {active && mode === 'itunes' && (
                  <div onClick={seekTo}
                    style={{ height: 3, background: 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                    <div style={{ height: '100%', background: '#7c3aed',
                      width: `${(globalCurrentTime / globalDuration) * 100}%`, transition: 'width 0.15s linear' }} />
                  </div>
                )}
              </div>
            </ScrollReveal>
          )
        })}
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Relax & Focus Music</h1>
        <p className="page-sub">Custom AI recommendations and organic focus soundscapes</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32, alignItems: 'flex-start' }}>
        
        {/* Left config column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Direct Search Card */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
              Direct Track Search
            </div>
            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  placeholder="Search artist, song, album..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button type="submit" className="btn btn-purple btn-shimmer" style={{ padding: '0 12px' }} disabled={searching}>
                  {searching ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
                </button>
              </div>
              {llmStatus.model_exists && searchQuery.trim() && (
                <button 
                  type="button" 
                  onClick={getSuggestionsFromSearch} 
                  className="btn btn-ghost btn-sm" 
                  style={{ width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0' }}
                  disabled={generating}
                >
                  <Sparkles size={12} color="#a78bfa" /> Get AI Suggestions for "{searchQuery}"
                </button>
              )}
            </form>
          </div>

          {/* Mood Recommendations Card */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)' }}>
                AI Recommendations
              </div>
              <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                LOCAL QWEN 2.5
              </span>
            </div>

            {/* If model missing, show in-app download panel */}
            {!llmStatus.model_exists ? (
              <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fca5a5', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  <Cpu size={15} /> Local AI Offline
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 12 }}>
                  The 2.0 GB local AI model must be downloaded to enable mood recommendation playlists.
                </p>

                {llmStatus.download?.status === 'idle' && (
                  <button className="btn btn-purple btn-sm btn-shimmer" style={{ width: '100%' }} onClick={handleStartLlmDownload}>
                    <Download size={12} /> Download Model (2.0 GB)
                  </button>
                )}

                {llmStatus.download?.status === 'downloading' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Downloading...</span>
                      <span style={{ fontWeight: 700, color: '#c084fc' }}>{llmStatus.download.progress}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 4 }}>
                      <div className="progress-fill" style={{ width: `${llmStatus.download.progress}%`, background: 'var(--purple)' }} />
                    </div>
                  </div>
                )}

                {llmStatus.download?.status === 'error' && (
                  <div>
                    <div style={{ fontSize: 10, color: '#fca5a5', marginBottom: 6 }}>Download failed.</div>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 10, padding: '4px 8px' }} onClick={handleStartLlmDownload}>
                      Retry
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
                  {MOODS.map(m => {
                    const sel = selectedMood?.label === m.label
                    return (
                      <button 
                        key={m.label}
                        onClick={() => { setSelectedMood(m); setCustomMood('') }}
                        title={m.label}
                        style={{
                          fontSize: 20, height: 38, borderRadius: 10,
                          background: sel ? 'var(--purple-glow)' : 'rgba(255,255,255,0.03)',
                          boxShadow: sel ? '0 0 12px var(--purple-glow)' : 'none',
                          border: sel ? '1px solid var(--purple-border)' : '1px solid rgba(255,255,255,0.04)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {m.emoji}
                      </button>
                    )
                  })}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input 
                    placeholder="Or type custom activity..." 
                    value={customMood} 
                    onChange={e => { setCustomMood(e.target.value); setSelectedMood(null) }}
                    style={{ fontSize: 13 }}
                  />

                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)' }}>
                    Filter by Genres
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {GENRES.map(g => {
                      const active = genres.includes(g)
                      return (
                        <button 
                          key={g} 
                          onClick={() => toggleGenre(g)}
                          style={{
                            padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none',
                            background: active ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.03)',
                            color: active ? '#22d3ee' : 'rgba(255,255,255,0.5)',
                            border: active ? '1px solid rgba(6,182,212,0.35)' : '1px solid rgba(255,255,255,0.04)',
                            cursor: 'pointer', transition: 'all 0.1s'
                          }}
                        >
                          {g}
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    Specific context (Optional)
                  </div>
                  <input 
                    placeholder="e.g. coding, reading, gym..." 
                    value={context} 
                    onChange={e => setContext(e.target.value)}
                    style={{ fontSize: 13 }}
                  />

                  <button 
                    onClick={getSuggestions} 
                    className="btn btn-purple btn-shimmer" 
                    style={{ width: '100%', marginTop: 6 }}
                    disabled={generating || !activeMood}
                  >
                    {generating ? 'Finding...' : <><Sparkles size={14} /> Recommend</>}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Local Focus Sounds */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
              Focus Soundscapes (Offline)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { type: 'rain', icon: CloudRain, label: 'Rain Forest' },
                { type: 'waves', icon: Waves, label: 'Ocean Waves' },
                { type: 'white', icon: Radio, label: 'White Noise' },
                { type: 'brown', icon: Wind, label: 'Brownian Wind' },
              ].map(({ type, icon: Icon, label }) => {
                const active = activeSounds[type]
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <button 
                      onClick={() => toggleSound(type)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', border: 'none',
                        background: active ? 'var(--purple)' : 'rgba(255,255,255,0.08)',
                        color: 'white', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: 7, transition: 'all 0.15s'
                      }}
                    >
                      <Icon size={14} />
                    </button>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: active ? 'white' : 'rgba(255,255,255,0.6)' }}>{label}</div>
                    
                    {/* Increased width to 90px for improved usability */}
                    <input 
                      type="range" min={0} max={1} step={0.05} 
                      value={soundVolumes[type]} 
                      onChange={e => adjustSoundVolume(type, parseFloat(e.target.value))}
                      style={{ width: 90, accentColor: 'var(--purple)', height: 4, cursor: 'pointer' }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right panel — song list & tabs */}
        <div>
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 16, gap: 24 }}>
            <button 
              onClick={() => setActiveTab('ai')}
              style={{
                background: 'none', border: 'none', borderBottom: activeTab === 'ai' ? '2px solid #8b5cf6' : '2px solid transparent',
                color: activeTab === 'ai' ? 'white' : 'rgba(255,255,255,0.4)',
                padding: '8px 4px', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                transition: 'all 0.15s'
              }}
            >
              AI Suggestions {songs.length > 0 && `(${songs.length})`}
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              style={{
                background: 'none', border: 'none', borderBottom: activeTab === 'search' ? '2px solid #8b5cf6' : '2px solid transparent',
                color: activeTab === 'search' ? 'white' : 'rgba(255,255,255,0.4)',
                padding: '8px 4px', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                transition: 'all 0.15s'
              }}
            >
              Search Results {searchResults.length > 0 && `(${searchResults.length})`}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="err" initial={{ opacity:0 }} animate={{ opacity:1 }}
                style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 14,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5', fontSize: 13 }}>
                ⚠ {error}
              </motion.div>
            )}

            {generating && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
                <RefreshCw size={24} className="spinner-ring" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Generating mood suggestions using Qwen 2.5...</span>
              </div>
            )}

            {!generating && activeTab === 'ai' && (
              <motion.div key="ai-list" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                {songs.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {selectedMood && (
                      <span style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)',
                        color: '#a78bfa', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>
                        {selectedMood.emoji} {selectedMood.label}
                      </span>
                    )}
                    {genres.slice(0, 4).map(g => (
                      <span key={g} style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                        color: '#22d3ee', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}>{g}</span>
                    ))}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
                      Click any song to play — streams full audio dynamically
                    </span>
                  </div>
                )}
                {renderSongList(songs, setSongs)}
              </motion.div>
            )}

            {!generating && activeTab === 'search' && (
              <motion.div key="search-list" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                {searching ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
                    <RefreshCw size={24} className="spinner-ring" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Searching iTunes library...</span>
                  </div>
                ) : (
                  renderSongList(searchResults, setSearchResults)
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
