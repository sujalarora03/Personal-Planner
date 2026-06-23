import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Trash2, CheckCircle, HelpCircle, Award, Sparkles, RefreshCw, GraduationCap } from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

export default function Career() {
  const [resumes, setResumes]   = useState([])
  const [activeId, setActiveId] = useState(null)
  
  // Profile Context states
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileState, setProfileState] = useState(null) // null | { status, summary, refined_context, questions, answers }
  const [answers, setAnswers] = useState(['', '', ''])
  const [refining, setRefining] = useState(false)
  const [refreshingQuestions, setRefreshingQuestions] = useState(false)
  const [showRefineForm, setShowRefineForm] = useState(false)

  // Analysis states
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading]   = useState(false)
  const [prompt, setPrompt]     = useState('Skill Gap Analysis')
  const [delConfirm, setDelConfirm] = useState(null)

  const PROMPT_TYPES = ['Skill Gap Analysis','Role Suggestions','Course Recommendations','ATS Feedback','Career Roadmap']

  const loadResumes = async () => {
    try {
      const data = await api.getResumes()
      setResumes(data)
      if (data.length > 0) {
        if (!activeId) {
          setActiveId(data[0].id)
        }
      } else {
        setActiveId(null)
        setProfileState(null)
      }
    } catch (e) {
      toast.error('Failed to load resumes')
    }
  }

  useEffect(() => { loadResumes() }, [])

  // Fetch career profile & cache whenever the active resume changes
  useEffect(() => {
    if (activeId) {
      fetchProfileContext(activeId)
      fetchCachedSuggestion(activeId, prompt)
    } else {
      setProfileState(null)
      setAnalysis('')
    }
  }, [activeId])

  // Reload cached suggestion when prompt changes
  useEffect(() => {
    if (activeId) {
      fetchCachedSuggestion(activeId, prompt)
    }
  }, [prompt])

  const fetchProfileContext = async (resumeId) => {
    setProfileLoading(true)
    try {
      const data = await api.getCareerProfile(resumeId)
      if (data.status === 'none') {
        await initProfileContext(resumeId)
      } else {
        setProfileState(data)
        if (data.answers && data.answers.length > 0) {
          setAnswers(data.answers)
          setShowRefineForm(false)
        } else {
          setAnswers(['', '', ''])
          setShowRefineForm(true)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setProfileLoading(false)
    }
  }

  const initProfileContext = async (resumeId) => {
    setRefreshingQuestions(true)
    setAnswers(['', '', ''])
    try {
      const data = await api.initCareerProfile(resumeId)
      const state = {
        status: 'extracted',
        summary: data.summary,
        refined_context: '',
        questions: data.questions,
        answers: []
      }
      setProfileState(state)
      setShowRefineForm(true)
      toast.success('Fresh questions generated!')
    } catch (e) {
      toast.error('Failed to analyze resume profile')
    } finally {
      setRefreshingQuestions(false)
    }
  }

  const handleRefineProfile = async () => {
    if (answers.some(a => !a.trim())) {
      toast.error('Please answer all 3 questions to refine your career context')
      return
    }
    setRefining(true)
    try {
      const data = await api.refineCareerProfile(activeId, answers)
      setProfileState(prev => ({
        ...prev,
        status: 'ready',
        refined_context: data.refined_context,
        answers: answers
      }))
      setShowRefineForm(false)
      toast.success('Career context refined successfully!')
      fetchCachedSuggestion(activeId, prompt)
    } catch (e) {
      toast.error('Failed to refine career profile')
    } finally {
      setRefining(false)
    }
  }

  const fetchCachedSuggestion = async (resumeId, promptType) => {
    try {
      const data = await api.getCareerSuggestion(resumeId, promptType)
      setAnalysis(data.content || '')
    } catch (e) {
      setAnalysis('')
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setLoading(true)
    setAnalysis('Uploading and extracting skills...')
    try {
      const res = await fetch('/api/resumes/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const d = await res.json()
        setActiveId(d.id)
        toast.success('Resume uploaded successfully!')
        setAnalysis('✓ Resume uploaded! Extracting profile summary...')
        loadResumes()
      } else {
        toast.error('Upload failed')
        setAnalysis('⚠ Upload failed.')
      }
    } catch (e) {
      toast.error('Upload failed')
      setAnalysis('⚠ Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!activeId) { setAnalysis('⚠ Please select a resume first.'); return }
    setLoading(true)
    setAnalysis('')
    
    try {
      const res = await fetch('/api/resumes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: activeId, prompt_type: prompt }),
      })
      if (!res.ok) { 
        setAnalysis('⚠ Analysis failed — is local AI model downloaded?'); 
        setLoading(false); 
        return 
      }
      
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setAnalysis(text)
      }
    } catch (e) {
      setAnalysis(`⚠ Analysis failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteResume(id)
      if (activeId === id) {
        setActiveId(null)
        setProfileState(null)
      }
      setDelConfirm(null)
      toast.success('Resume deleted')
      loadResumes()
    } catch (e) {
      toast.error('Failed to delete resume')
    }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent, #8b5cf6) 0%, var(--accent-hover, #7c3aed) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 16px var(--accent-glow)'
          }}>
            <GraduationCap size={22} color="white" />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Career Coach</h1>
            <p className="page-sub" style={{ margin: 0 }}>Private Local AI Assistant — custom tailors career strategies based on your resume and goals</p>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'start' }}>
        {/* Left panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Upload */}
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="glass" style={{ padding:18 }}>
            <div style={{ fontWeight:700, marginBottom:12, fontSize:14 }}>Upload Resume</div>
            <label style={{
              display:'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap:8, cursor:'pointer',
              background:'rgba(124,58,237,0.06)', border:'1px dashed rgba(124,58,237,0.3)',
              borderRadius:10, padding:'16px', color:'#a78bfa', fontSize:13, textAlign: 'center',
            }} className="upload-box-hover">
              <Upload size={20} style={{ marginBottom: 4 }}/>
              <span style={{ fontWeight: 600 }}>Choose File</span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>PDF, DOCX, TXT, MD</span>
              <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleUpload} style={{ display:'none' }} />
            </label>
          </motion.div>

          {/* Resume list */}
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
            className="glass" style={{ padding:18 }}>
            <div style={{ fontWeight:700, marginBottom:12, fontSize:14 }}>Your Resumes</div>
            {resumes.length === 0 ? (
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>No resumes uploaded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {resumes.map(r => (
                  <div key={r.id} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 12px', borderRadius:10,
                    background: activeId === r.id ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${activeId === r.id ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.05)'}`,
                    cursor:'pointer',
                  }} onClick={() => setActiveId(r.id)}>
                    <div style={{ flex: 1, marginRight: 8, overflow: 'hidden' }}>
                      <div style={{ fontSize:12, fontWeight:600, color: activeId===r.id?'white':'rgba(255,255,255,0.75)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {r.filename}
                      </div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{r.uploaded_at?.slice(0,10)}</div>
                    </div>
                    <button className="btn btn-danger btn-sm" style={{ padding: '6px', minWidth: 0 }} onClick={e => { e.stopPropagation(); setDelConfirm(r) }}>
                      <Trash2 size={11}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Analysis controls */}
          {activeId && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
              className="glass" style={{ padding:18 }}>
              <div style={{ fontWeight:700, marginBottom:12, fontSize:14 }}>Run Coach Assistant</div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:6, display:'block' }}>Topic</label>
                <select value={prompt} onChange={e => setPrompt(e.target.value)} style={{ width: '100%', fontSize: 13, background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {PROMPT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button 
                className="btn btn-purple btn-shimmer" 
                style={{ width:'100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                onClick={handleAnalyze} 
                disabled={loading || profileLoading || refining}
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="spinner-ring" style={{ animation: 'spin 1s linear infinite' }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Run AI Analysis
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Top Panel: Context Summary */}
          {activeId && (
            <motion.div 
              initial={{ opacity:0, y:10 }} 
              animate={{ opacity:1, y:0 }} 
              className="glass" 
              style={{ padding:22 }}
            >
              {profileLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                  <RefreshCw size={16} className="spinner-ring" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--purple)' }} />
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>AI is initializing your resume profile context...</span>
                </div>
              ) : profileState ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Award size={18} style={{ color: '#c084fc' }} />
                      <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>
                        Target Career Profile Context
                      </h2>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: profileState.status === 'ready' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)',
                      color: profileState.status === 'ready' ? '#34d399' : '#fbbf24',
                      border: `1px solid ${profileState.status === 'ready' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`
                    }}>
                      {profileState.status === 'ready' ? 'REFINED & ACTIVE' : 'INITIAL SUMMARY'}
                    </span>
                  </div>

                  <p style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 0 16px 0',
                    background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)',
                    padding: '12px 14px', borderRadius: 10, whiteSpace: 'pre-wrap'
                  }}>
                    {profileState.status === 'ready' ? profileState.refined_context : profileState.summary}
                  </p>

                  <AnimatePresence>
                    {showRefineForm ? (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          background: 'rgba(124,58,237,0.03)', border: '1px solid rgba(124,58,237,0.15)',
                          borderRadius: 12, padding: 16, marginTop: 12, overflow: 'hidden'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c4b5fd', fontSize: 13, fontWeight: 700 }}>
                            <HelpCircle size={15} />
                            Tell us your career goals — 3 questions to personalize your coaching
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px', opacity: refreshingQuestions ? 1 : 0.7 }}
                            onClick={() => initProfileContext(activeId)}
                            disabled={refreshingQuestions}
                            title="Generate fresh questions from your resume"
                          >
                            {refreshingQuestions ? (
                              <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                            ) : '↺ New Questions'}
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14, lineHeight: 1.5 }}>
                          Your answers help the AI tailor roadmaps and advice specifically to your goals — not just what's on your resume.
                        </div>

                        {profileState.questions && profileState.questions.map((q, idx) => (
                          <div key={idx} style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', display: 'block', marginBottom: 5 }}>
                              {idx + 1}. {q}
                            </label>
                            <textarea
                              value={answers[idx] || ''}
                              onChange={e => {
                                const updated = [...answers]
                                updated[idx] = e.target.value
                                setAnswers(updated)
                              }}
                              rows={2}
                              placeholder="Type your answer here..."
                              style={{
                                width: '100%', fontSize: 12, padding: '8px 10px',
                                background: 'rgba(0,0,0,0.2)', color: 'white',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                                resize: 'none'
                              }}
                            />
                          </div>
                        ))}

                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button className="btn btn-purple btn-sm" onClick={handleRefineProfile} disabled={refining}>
                            {refining ? '⏳ Refining...' : '✨ Refine Context'}
                          </button>
                          {profileState.status === 'ready' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowRefineForm(false)}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      profileState.status === 'ready' && (
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => setShowRefineForm(true)}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          ⚙️ Recalibrate target context & goals
                        </button>
                      )
                    )}
                  </AnimatePresence>
                </div>
              ) : null}
            </motion.div>
          )}

          {/* Output */}
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
            className="glass" style={{ padding:22, minHeight:400, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight:700, fontSize: 15 }}>
                {analysis ? prompt : 'Analysis Output'}
              </div>
              {analysis && !loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#34d399', fontWeight: 600 }}>
                  <CheckCircle size={12} />
                  Cached locally
                </div>
              )}
            </div>
            {!analysis && !loading && (
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>
                {!activeId 
                  ? 'Please upload a resume first to start career planning.'
                  : 'Click "Run AI Analysis" on the left to generate target roadmap, skill gap analysis, or ATS feedback.'}
              </div>
            )}
            {loading && !analysis && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                <RefreshCw size={14} className="spinner-ring" style={{ animation: 'spin 1s linear infinite' }} />
                AI is compiling results...
              </div>
            )}
            <pre style={{
              whiteSpace:'pre-wrap', fontFamily:'inherit', fontSize:13,
              lineHeight:1.7, color:'#e5e7eb',
            }}>{analysis}</pre>
          </motion.div>
        </div>
      </div>

      {delConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDelConfirm(null)}>
          <motion.div className="modal-box" style={{ width:380 }}
            initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#f87171', marginBottom:12 }}>🗑 Delete Resume?</h2>
            <p style={{ color:'rgba(255,255,255,0.6)', marginBottom:24 }}>
              "<strong>{delConfirm.filename}</strong>" and its corresponding analysis history will be permanently deleted.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-danger" style={{ flex:1 }} onClick={() => handleDelete(delConfirm.id)}>Delete</button>
              <button className="btn btn-ghost" onClick={() => setDelConfirm(null)}>Cancel</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
