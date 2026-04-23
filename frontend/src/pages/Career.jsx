import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, Trash2 } from 'lucide-react'

// Career page — note: file upload & AI analysis runs through Python backend
// The upload is handled by a direct file POST to FastAPI
export default function Career() {
  const [resumes, setResumes]   = useState([])
  const [activeId, setActiveId] = useState(null)
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading]   = useState(false)
  const [model, setModel]       = useState('llama3.2')
  const [prompt, setPrompt]     = useState('Skill Gap Analysis')

  const loadResumes = async () => {
    const data = await fetch('/api/resumes').then(r => r.json())
    setResumes(data)
    if (!activeId && data.length > 0) setActiveId(data[0].id)
  }

  useState(() => { loadResumes() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setLoading(true)
    setAnalysis('Uploading and extracting skills...')
    const res = await fetch('/api/resumes/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const d = await res.json()
      setActiveId(d.id)
      setAnalysis('✓ Resume uploaded! Skills extracted automatically. Run an analysis below.')
      loadResumes()
    } else {
      setAnalysis('⚠ Upload failed.')
    }
    setLoading(false)
  }

  const handleAnalyze = async () => {
    if (!activeId) { setAnalysis('⚠ Please select a resume first.'); return }
    setLoading(true)
    setAnalysis('')
    const res = await fetch('/api/resumes/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: activeId, prompt_type: prompt, model }),
    })
    if (!res.ok) { setAnalysis('⚠ Analysis failed — is Ollama running?'); setLoading(false); return }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      setAnalysis(text)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete resume?')) return
    await fetch(`/api/resumes/${id}`, { method: 'DELETE' })
    if (activeId === id) setActiveId(null)
    loadResumes()
  }

  const PROMPT_TYPES = ['Skill Gap Analysis','Role Suggestions','Course Recommendations','ATS Feedback','Career Roadmap']

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Career Coach</h1>
        <p className="page-sub">AI-powered resume analysis (runs locally via Ollama)</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'start' }}>
        {/* Left panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Upload */}
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="glass" style={{ padding:18 }}>
            <div style={{ fontWeight:700, marginBottom:12 }}>Upload Resume</div>
            <label style={{
              display:'flex', alignItems:'center', gap:8, cursor:'pointer',
              background:'rgba(124,58,237,0.1)', border:'1px dashed rgba(124,58,237,0.3)',
              borderRadius:10, padding:'14px 16px', color:'#a78bfa', fontSize:14,
            }}>
              <Upload size={16}/> Choose PDF / DOCX / TXT
              <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleUpload} style={{ display:'none' }} />
            </label>
          </motion.div>

          {/* Resume list */}
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
            className="glass" style={{ padding:18 }}>
            <div style={{ fontWeight:700, marginBottom:12 }}>Your Resumes</div>
            {resumes.length === 0 ? (
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>No resumes uploaded yet.</div>
            ) : resumes.map(r => (
              <div key={r.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 12px', borderRadius:10, marginBottom:6,
                background: activeId === r.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeId === r.id ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                cursor:'pointer',
              }} onClick={() => setActiveId(r.id)}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color: activeId===r.id?'white':'rgba(255,255,255,0.7)' }}>{r.filename}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{r.uploaded_at?.slice(0,10)}</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDelete(r.id) }}><Trash2 size={12}/></button>
              </div>
            ))}
          </motion.div>

          {/* Analysis controls */}
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
            className="glass" style={{ padding:18 }}>
            <div style={{ fontWeight:700, marginBottom:12 }}>Run Analysis</div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Analysis Type</label>
              <select value={prompt} onChange={e => setPrompt(e.target.value)}>
                {PROMPT_TYPES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Model</label>
              <input value={model} onChange={e => setModel(e.target.value)} />
            </div>
            <button className="btn btn-purple" style={{ width:'100%' }} onClick={handleAnalyze} disabled={loading}>
              {loading ? '⏳ Analyzing...' : '✨ Analyze Resume'}
            </button>
          </motion.div>
        </div>

        {/* Output */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
          className="glass" style={{ padding:22, minHeight:400 }}>
          <div style={{ fontWeight:700, marginBottom:16 }}>
            {analysis ? prompt : 'Analysis Output'}
          </div>
          {!analysis && !loading && (
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:14 }}>
              Upload a resume and click "Analyze Resume" to get AI-powered insights.
            </div>
          )}
          <pre style={{
            whiteSpace:'pre-wrap', fontFamily:'inherit', fontSize:14,
            lineHeight:1.7, color:'#d1d5db',
          }}>{analysis}</pre>
        </motion.div>
      </div>
    </div>
  )
}
