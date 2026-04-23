import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save } from 'lucide-react'
import { api } from '../api/client'
import toast from 'react-hot-toast'

export default function Profile() {
  const [form, setForm]     = useState({ name:'', birthdate:'', company:'', role:'', experience_years:0 })
  const [skills, setSkills] = useState({})
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
    </div>
  )
}
