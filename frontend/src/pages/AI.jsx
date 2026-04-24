import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

const QUICK = [
  { label:'Analyze My Week',   prompt:'Analyse my work hours and tasks for this week. What went well and what slipped?' },
  { label:'Suggest Tasks',     prompt:'Based on my profile and current tasks, use add_task to add 5 actionable tasks for me now.' },
  { label:'Review Year Goals', prompt:'Review my year targets. For ones that are behind, advise what actions to take.' },
  { label:'Plan My Day',       prompt:'Query my tasks and work hours, then create a practical schedule for today.' },
  { label:'Prioritize Tasks',  prompt:'Use query_data to check my tasks, then give me a prioritised list for the next 3 days.' },
  { label:'Recommend Courses', prompt:'Based on my profile and skills, use add_course to add 5 highly relevant courses for me immediately.' },
  { label:'Career Advice',     prompt:'Based on my profile, skills and experience, what should I focus on in the next 6 months to grow my career?' },
  { label:'Fix Overdue',       prompt:'Use query_data to find my overdue tasks, then suggest a concrete plan for each one.' },
]

// Ollama setup banner shown when Ollama is not detected
function OllamaBanner({ onDismiss }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={{
          margin: '0 0 16px',
          padding: '16px 18px',
          borderRadius: 12,
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.25)',
          position: 'relative',
        }}
      >
        <button onClick={onDismiss} style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.35)', padding: 2,
        }}><X size={14} /></button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fbbf24', marginBottom: 4 }}>
              Ollama not detected
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 600,
                background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: 4, padding: '1px 6px', verticalAlign: 'middle',
              }}>OPTIONAL</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 10 }}>
              AI chat requires <strong style={{ color: 'white' }}>Ollama</strong> — a free local AI runtime.
              Install it to run AI models privately on your machine.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Install link */}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>1.</span>
                Download &amp; install from{' '}
                <span
                  onClick={() => { try { window.pywebview?.api?.open_url?.('https://ollama.com') } catch(_) {}; navigator.clipboard?.writeText?.('https://ollama.com') }}
                  style={{ color: '#a78bfa', textDecoration: 'underline', cursor: 'pointer' }}
                  title="Click to copy URL"
                >
                  ollama.com
                </span>
              </div>
              {/* Start service */}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>2.</span>
                Start Ollama:{' '}
                <code style={{
                  background: 'rgba(255,255,255,0.08)', borderRadius: 4,
                  padding: '1px 6px', fontSize: 11, color: '#c4b5fd', cursor: 'pointer',
                }} onClick={() => navigator.clipboard?.writeText?.('ollama serve')} title="Click to copy">
                  ollama serve
                </code>
              </div>
              {/* Pull a model */}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>3.</span>
                Pull a model (choose one):{' '}
                {['ollama pull llama3.2', 'ollama pull mistral', 'ollama pull phi3'].map(cmd => (
                  <code key={cmd}
                    onClick={() => navigator.clipboard?.writeText?.(cmd)}
                    title="Click to copy"
                    style={{
                      background: 'rgba(255,255,255,0.08)', borderRadius: 4,
                      padding: '1px 6px', fontSize: 11, color: '#c4b5fd',
                      cursor: 'pointer', marginRight: 6, display: 'inline-block', marginTop: 2,
                    }}>{cmd}</code>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}


function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const lines  = msg.text.split('\n')

  const rendered = lines.map((line, i) => {
    if (line.trim().startsWith('[Tool]')) {
      const inner = line.trim()
      return (
        <div key={i} style={{
          display:'inline-flex', alignItems:'center', gap:6, margin:'4px 0',
          background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)',
          borderRadius:8, padding:'4px 10px', fontSize:12, color:'#34d399',
        }}>
          <span style={{fontSize:10}}>⚙</span> {inner}
        </div>
      )
    }
    return <span key={i}>{line}{i < lines.length-1 ? '\n' : ''}</span>
  })

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth:'78%', padding:'12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isUser ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
        fontSize:14, lineHeight:1.65, whiteSpace:'pre-wrap', wordBreak:'break-word',
      }}>
        {!isUser && <div style={{ fontSize:11, fontWeight:700, color:'#34d399', marginBottom:6 }}>AI Assistant</div>}
        {rendered}
      </div>
    </motion.div>
  )
}

export default function AI() {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [model, setModel]       = useState('llama3.2')
  const [ctx, setCtx]           = useState(true)
  const [ollamaOk, setOllamaOk] = useState(null)   // null = checking, true/false = result
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const bottomRef = useRef(null)
  const msgRef    = useRef([])

  useEffect(() => {
    api.getChatHistory().then(hist => {
      if (hist.length > 0) {
        const loaded = hist.map(m => ({ role: m.role, text: m.content }))
        setMessages(loaded)
        msgRef.current = loaded
      }
    }).catch(() => {})

    api.ollamaStatus()
      .then(s => setOllamaOk(s?.running === true))
      .catch(() => setOllamaOk(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')

    const userMsg = { role:'user', text: userText }
    const newMessages = [...msgRef.current, userMsg]
    msgRef.current = newMessages
    setMessages([...newMessages])
    setLoading(true)

    // Build the messages array for the API (last 14 turns)
    const apiMessages = newMessages.slice(-14).map(m => ({ role: m.role, content: m.text }))

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model, include_context: ctx }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `HTTP ${res.status}`)
      }

      // Add empty AI bubble to stream into
      const aiMsg = { role:'assistant', text:'' }
      msgRef.current = [...newMessages, aiMsg]
      setMessages([...msgRef.current])

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream:true })
        full += chunk
        msgRef.current = [...newMessages, { role:'assistant', text: full }]
        setMessages([...msgRef.current])
      }
    } catch (err) {
      const errMsg = { role:'assistant', text:`⚠ ${err.message}` }
      msgRef.current = [...newMessages, errMsg]
      setMessages([...msgRef.current])
    }
    setLoading(false)
  }

  const clearChat = async () => {
    await api.clearChat().catch(() => {})
    setMessages([])
    msgRef.current = []
    toast('Chat cleared')
  }

  return (
    <div className="page" style={{ display:'flex', flexDirection:'column', padding:0 }}>
      <div style={{ display:'flex', flex:1, minHeight:0 }}>
        {/* Chat area */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, padding:'24px 24px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <h1 className="page-title">AI Assistant</h1>
              <p className="page-sub">Powered by Ollama (local, private) — knows your profile & career</p>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <input value={model} onChange={e => setModel(e.target.value)}
                style={{ width:160 }} placeholder="Model name" />
              <button className="btn btn-ghost btn-sm" onClick={clearChat}><Trash2 size={14}/> Clear</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:16, paddingBottom:16 }}>
            {ollamaOk === false && !bannerDismissed && (
              <OllamaBanner onDismiss={() => setBannerDismissed(true)} />
            )}
            {messages.length === 0 && (
              <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', padding:'60px 0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
                <div style={{ fontSize:16, fontWeight:600 }}>Ask me anything about your planner or career</div>
                <div style={{ fontSize:13, marginTop:6 }}>
                  "Add task: Review Q2 report" · "What should I learn next?" · "How am I doing this week?"
                </div>
              </div>
            )}
            {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
            {loading && messages[messages.length-1]?.role !== 'assistant' && (
              <div style={{ display:'flex' }}>
                <div style={{ padding:'12px 16px', borderRadius:'16px 16px 16px 4px',
                  background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)',
                  fontSize:14, color:'rgba(255,255,255,0.4)' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#34d399', display:'block', marginBottom:4 }}>AI Assistant</span>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="glass" style={{ margin:'0 0 24px', padding:'12px 14px', borderRadius:14 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
              <input type="checkbox" checked={ctx} onChange={e => setCtx(e.target.checked)} />
              Include planner context (profile, tasks, courses, goals)
            </label>
            <div style={{ display:'flex', gap:10 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
                placeholder='Ask anything — "Add task: ..." or "What should I focus on?"'
                style={{ flex:1 }} disabled={loading} />
              <button className="btn btn-purple" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                <Send size={15}/>
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions sidebar */}
        <div style={{
          width:220, padding:'88px 16px 24px', borderLeft:'1px solid rgba(255,255,255,0.06)',
          display:'flex', flexDirection:'column', gap:8, overflowY:'auto',
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
            Quick Actions
          </div>
          {QUICK.map(({ label, prompt }) => (
            <button key={label} className="btn btn-ghost btn-sm"
              style={{ justifyContent:'flex-start', fontSize:12, textAlign:'left', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}
              onClick={() => sendMessage(prompt)}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}