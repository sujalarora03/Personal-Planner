import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Key, Eye, EyeOff, ExternalLink, CheckCircle } from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

const YT_STEPS = [
  {
    n: 1,
    title: 'Open Google Cloud Console',
    detail: 'Go to console.cloud.google.com and sign in with your Google account.',
    link: 'https://console.cloud.google.com',
    linkLabel: 'Open Google Cloud →',
  },
  {
    n: 2,
    title: 'Create or select a project',
    detail: 'Click the project dropdown at the top → "New Project" → give it any name → Create.',
  },
  {
    n: 3,
    title: 'Enable YouTube Data API v3',
    detail: 'Go to APIs & Services → Library → search "YouTube Data API v3" → click Enable.',
  },
  {
    n: 4,
    title: 'Create an API Key',
    detail: 'Go to APIs & Services → Credentials → "+ Create Credentials" → API Key. Copy the key shown.',
  },
  {
    n: 5,
    title: 'Set API Restrictions (recommended)',
    detail: 'Click "Edit API key" → under "API restrictions" choose "Restrict key" → select "YouTube Data API v3" → Save. This limits the key so it can only be used for YouTube searches.',
  },
  {
    n: 6,
    title: 'Paste the key below and save',
    detail: 'Paste the key in the field below and click Save Profile. YouTube full songs will activate in the Relax tab immediately.',
  },
]

export default function Profile() {
  const [form, setForm]       = useState({ name:'', birthdate:'', company:'', role:'', experience_years:0, youtube_api_key:'' })
  const [skills, setSkills]   = useState({})
  const [showKey, setShowKey] = useState(false)
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.getProfile().then(p => { if (p?.name) setForm(p) }).catch(() => {})
    api.getSkills().then(setSkills).catch(() => {})
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    await api.saveProfile({ ...form, experience_years: +form.experience_years })
    toast.success('Profile saved!')
  }

  const PILL_COLORS = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ec4899','#8b5cf6']

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">Your identity in the planner</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>
        {/* Form */}
        <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} className="glass" style={{ padding:24 }}>
          <h2 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Personal Info</h2>
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Full Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" /></div>
            <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Date of Birth</label>
              <input type="date" value={form.birthdate || ''} onChange={e => set('birthdate', e.target.value)} /></div>
            <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Company</label>
              <input value={form.company || ''} onChange={e => set('company', e.target.value)} placeholder="Where do you work?" /></div>
            <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Role / Title</label>
              <input value={form.role || ''} onChange={e => set('role', e.target.value)} placeholder="e.g. Software Engineer" /></div>
            <div><label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'block' }}>Years of Experience</label>
              <input type="number" min={0} step={0.5} value={form.experience_years || 0} onChange={e => set('experience_years', e.target.value)} /></div>

            {/* YouTube API Key */}
            <div style={{ marginTop: 4 }}>
              <label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                <Key size={11} /> YouTube API Key
                <span style={{ fontSize:10, background:'rgba(239,68,68,0.12)', color:'#f87171', borderRadius:4, padding:'1px 6px', border:'1px solid rgba(239,68,68,0.2)' }}>Relax tab · Full Songs</span>
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.youtube_api_key || ''}
                  onChange={e => set('youtube_api_key', e.target.value)}
                  placeholder="AIza..."
                  style={{ paddingRight: 36 }}
                />
                <button type="button" onClick={() => setShowKey(v => !v)} style={{
                  position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', padding:0,
                }}>
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {form.youtube_api_key && (
                <div style={{ fontSize:10, color:'#4ade80', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                  <CheckCircle size={10} /> Key saved — YouTube full songs enabled in Relax tab
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-purple" style={{ marginTop:6 }}><Save size={15}/> Save Profile</button>
          </form>
        </motion.div>

        {/* Skills */}
        <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="glass" style={{ padding:24 }}>
          <h2 style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Skills</h2>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:20 }}>Extracted from your resume in the Career tab</p>
          {Object.keys(skills).length === 0 ? (
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:14, textAlign:'center', padding:'40px 0' }}>
              No skills yet. Upload a resume in the Career tab.
            </div>
          ) : (
            Object.entries(skills).map(([cat, skillList], ci) => (
              <div key={cat} style={{ marginBottom:16 }}>
                <div style={{
                  fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1,
                  color: PILL_COLORS[ci % PILL_COLORS.length], marginBottom:8,
                }}>{cat}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {skillList.map(s => (
                    <span key={s} className="badge" style={{
                      background: `${PILL_COLORS[ci % PILL_COLORS.length]}18`,
                      color: PILL_COLORS[ci % PILL_COLORS.length],
                      border: `1px solid ${PILL_COLORS[ci % PILL_COLORS.length]}33`,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>

      {/* YouTube API Key Setup Guide */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
        className="glass" style={{ padding:24, marginTop:22 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(239,68,68,0.15)',
            border:'1px solid rgba(239,68,68,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Key size={15} color="#f87171" />
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>How to get a free YouTube API Key</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:1 }}>
              Unlocks full-length song streaming in the Relax tab · Free · 100 song lookups/day
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
          {YT_STEPS.map(step => (
            <div key={step.n} style={{
              borderRadius:10, padding:'14px 16px',
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
              display:'flex', gap:12,
            }}>
              <div style={{
                width:24, height:24, borderRadius:'50%', flexShrink:0,
                background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:800, color:'#f87171',
              }}>{step.n}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{step.title}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.6 }}>{step.detail}</div>
                {step.link && (
                  <a href={step.link} target="_blank" rel="noreferrer" style={{
                    display:'inline-flex', alignItems:'center', gap:4, marginTop:8,
                    fontSize:11, color:'#60a5fa', textDecoration:'none', fontWeight:600,
                  }}>
                    {step.linkLabel} <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:16, padding:'10px 14px', borderRadius:8,
          background:'rgba(251,191,36,0.07)', border:'1px solid rgba(251,191,36,0.18)',
          fontSize:12, color:'rgba(251,191,36,0.8)', lineHeight:1.6 }}>
          💡 <strong>API Restrictions tip:</strong> When Google asks for "API restrictions" during key creation,
          choose <strong>"Restrict key"</strong> and select <strong>"YouTube Data API v3"</strong> from the list.
          This is the recommended setting — it limits the key to only YouTube searches so it can't be misused if shared.
        </div>
      </motion.div>
    </div>
  )
}
