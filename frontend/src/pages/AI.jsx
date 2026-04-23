import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

const QUICK = [
  { label:'Analyze My Week',   prompt:'Analyse my work hours and tasks for this week. What went well and what slipped?' },
  { label:'Suggest Tasks',     prompt:'Based on my profile and current tasks, use add_task to add 5 actionable tasks for me now.' },
  { label:'Review Year Goals', prompt:'Review my year targets. For ones that are behind, advise what actions to take.' },
  { label:'Plan My Day',       prompt:'Query my tasks and work hours, then create a practical schedule for today.' },
  { label:'Prioritize Tasks',  prompt:'Query my tasks with query_data, then give me a prioritised list for the next 3 days.' },
  { label:'Recommend Courses', prompt:'Use query_data to check my profile and existing courses. Then use add_course to add 5 relevant courses immediately.' },
  { label:'Fix Overdue',       prompt:'Use query_data to find my overdue tasks, then suggest a concrete plan for each one.' },
]

const SYSTEM = `You are an intelligent personal productivity assistant embedded in a desktop planner app. You read and write the user's planner data using tools.

CORE RULES:
0. Only call write tools when the user EXPLICITLY asks to add/create/log something. For casual conversation — respond in plain text ONLY.
1. When explicitly asked to ADD items → call the tool IMMEDIATELY with <tool_call>{"tool":"TOOL_NAME","args":{...}}</tool_call>
2. NEVER output raw SQL in your reply text.
3. After every tool call, wait for <tool_result>, then continue.

Available tools: add_task, update_task_status, add_course, add_project, log_work_hours, update_target, query_data`

export default function AI() {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [model, setModel]       = useState('llama3.2')
  const [ctx, setCtx]           = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    api.getChatHistory().then(hist => {
      if (hist.length > 0) setMessages(hist.map(m => ({ role: m.role, text: m.content })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')

    const userMsg = { role:'user', text: userText }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    let context = '(context sharing off)'
    if (ctx) {
      try { context = (await api.getContext()).context } catch {}
    }

    const systemContent = SYSTEM + `\n\nCurrent planner snapshot:\n${context}`
    const history = [...messages, userMsg].slice(-12)
    const apiMessages = [
      { role:'system', content: systemContent },
      ...history.map(m => ({ role: m.role, content: m.text })),
    ]

    try {
      const res = await fetch('http://localhost:11434/api/chat', {
        method:'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ model, messages: apiMessages, stream: true }),
      })
      if (!res.ok) throw new Error(`Ollama error ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      const aiIdx = messages.length + 1

      setMessages(prev => [...prev, { role:'assistant', text:'' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value, { stream:true }).split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const data  = JSON.parse(line)
            const chunk = data?.message?.content || ''
            full += chunk
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { role:'assistant', text: full }
              return next
            })
          } catch {}
        }
      }

      await api.saveMessage('user', userText).catch(() => {})
      await api.saveMessage('assistant', full).catch(() => {})
    } catch (err) {
      setMessages(prev => [...prev, { role:'assistant', text:`⚠ ${err.message}\n\nMake sure Ollama is running: \`ollama serve\`` }])
    }
    setLoading(false)
  }

  const clearChat = async () => {
    await api.clearChat().catch(() => {})
    setMessages([])
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
              <p className="page-sub">Powered by Ollama (local, private)</p>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <input value={model} onChange={e => setModel(e.target.value)}
                style={{ width:160 }} placeholder="Model name" />
              <button className="btn btn-ghost btn-sm" onClick={clearChat}><Trash2 size={14}/> Clear</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:16, paddingBottom:16 }}>
            {messages.length === 0 && (
              <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', padding:'60px 0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
                <div style={{ fontSize:16, fontWeight:600 }}>Ask me anything about your planner</div>
                <div style={{ fontSize:13, marginTop:6 }}>Try: "Add task: Review Q2 report" or "How am I doing this week?"</div>
              </div>
            )}
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth:'75%', padding:'12px 16px', borderRadius: m.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role==='user' ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${m.role==='user' ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  fontSize:14, lineHeight:1.65, whiteSpace:'pre-wrap', wordBreak:'break-word',
                }}>
                  {m.role==='assistant' && <div style={{ fontSize:11, fontWeight:700, color:'#34d399', marginBottom:6 }}>AI Assistant</div>}
                  {m.text || (loading && i === messages.length-1 ? <span style={{ color:'rgba(255,255,255,0.4)' }}>Thinking...</span> : '')}
                </div>
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="glass" style={{ margin:'0 0 24px', padding:'12px 14px', borderRadius:14 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
              <input type="checkbox" checked={ctx} onChange={e => setCtx(e.target.checked)} />
              Include planner context
            </label>
            <div style={{ display:'flex', gap:10 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask anything, or say 'Add task: ...'"
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
