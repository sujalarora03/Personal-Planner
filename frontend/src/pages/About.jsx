import { motion } from 'framer-motion'
import {
  GitBranch, ExternalLink, Heart,
  MessageSquare, Sparkles,
  Star, Cpu, Coffee, ArrowUpRight,
} from 'lucide-react'

const TECH_STACK = [
  { label: 'FastAPI',   color: '#05a87a' },
  { label: 'React',     color: '#38bdf8' },
  { label: 'SQLite',    color: '#f59e0b' },
  { label: 'llama.cpp', color: '#c084fc' },
  { label: 'Vite',      color: '#a78bfa' },
  { label: 'Python',    color: '#fde68a' },
]

const GOOGLE_FORM_URL = 'https://forms.gle/B1TEMZxm2mjPeDu68'

export default function About() {
  return (
    <div className="page" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <h1 className="page-title">About &amp; Feedback 💜</h1>
        <p className="page-sub">The story behind Personal Planner — and how we make it better together</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'start' }}>

        {/* ── Left Column: Developer Profile ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Hero Bio Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{ padding: 32, position: 'relative', overflow: 'hidden' }}
          >
            {/* Ambient backdrop glow */}
            <div style={{
              position: 'absolute', top: -30, right: -30,
              width: 220, height: 220,
              background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
              borderRadius: '50%', pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, flexShrink: 0,
                boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
              }}>👨‍💻</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white' }}>Sujal Arora</div>
                <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600 }}>Solo Developer of Personal Planner</div>
              </div>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} style={{ color: '#a78bfa' }} /> Why I Built This
            </h3>
            
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: 18 }}>
              I built Personal Planner because I wanted a productivity tool that was 100% private, 
              beautifully designed, and capable of running local AI entirely offline.
            </p>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: 28 }}>
              I couldn't find a solution that respected data privacy while offering the power of large language 
              models and focus audio without any cloud dependencies or subscription fees. So, I decided 
              to build one myself. Every feature here is designed to respect your data and help you stay in flow.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <a
                href="https://github.com/sujalarora03"
                target="_blank" rel="noopener noreferrer"
                id="about-github-link"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <GitBranch size={14} /> GitHub @sujalarora03
              </a>
              <a
                href="https://linkedin.com/in/sujalarora03"
                target="_blank" rel="noopener noreferrer"
                id="about-linkedin-link"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 10,
                  background: 'rgba(14,165,233,0.08)',
                  border: '1px solid rgba(14,165,233,0.2)',
                  color: '#38bdf8', fontSize: 12.5, fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(14,165,233,0.08)'}
              >
                <ExternalLink size={14} /> LinkedIn Profile
              </a>
            </div>
          </motion.div>
        </div>

        {/* ── Right Column: Tech Stack & Feedback ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Tech Stack Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="glass"
            style={{ padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Cpu size={16} style={{ color: '#a78bfa' }} />
              <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)' }}>System Architecture</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {TECH_STACK.map(({ label, color }) => (
                <span key={label} style={{
                  background: `${color}14`, color: color,
                  border: `1px solid ${color}33`, borderRadius: 8,
                  padding: '5px 12px', fontSize: 11.5, fontWeight: 700,
                }}>{label}</span>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: Star,     color: '#fbbf24', text: '100% local database storage — zero external telemetry' },
                { icon: Coffee,   color: '#f59e0b', text: 'Independent project, crafted one commit at a time' },
                { icon: Sparkles, color: '#c084fc', text: 'Offline Qwen 2.5 LLM execution on local CPU streams' },
                { icon: Heart,    color: '#f472b6', text: 'Designed to help developers organize, relax, and grow' },
              ].map(({ icon: Icon, color, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Feedback Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="glass"
            style={{
              padding: 28,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center', position: 'relative', overflow: 'hidden'
            }}
          >
            {/* Ambient accent background glow */}
            <div style={{
              position: 'absolute', bottom: -50, left: -50,
              width: 160, height: 160,
              background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
              borderRadius: '50%', pointerEvents: 'none',
            }} />

            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(99,102,241,0.12))',
              border: '1px solid rgba(124,58,237,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 16,
            }}>
              💬
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 850, fontFamily: 'var(--font-display)', marginBottom: 8, color: 'white' }}>
              Share Your Feedback
            </h2>

            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 300, marginBottom: 20 }}>
              Found a bug? Have an idea for a new feature? Or want to request an improvement? I read every response to build what's next.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 24, maxWidth: 320 }}>
              {[
                { emoji: '🐛', label: 'Bugs' },
                { emoji: '💡', label: 'Features' },
                { emoji: '✨', label: 'Tweak UI' },
                { emoji: '👋', label: 'Say Hi' },
              ].map(({ emoji, label }) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 6, padding: '4px 10px',
                  fontSize: 11.5, color: 'rgba(255,255,255,0.45)', fontWeight: 550,
                }}>
                  {emoji} {label}
                </span>
              ))}
            </div>

            <motion.a
              id="feedback-google-form-btn"
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 12,
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: 'white', fontWeight: 700, fontSize: 13.5,
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(124,58,237,0.35)',
                fontFamily: 'var(--font-display)',
                marginBottom: 16,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={15} />
              Open Feedback Form
              <ArrowUpRight size={13} />
            </motion.a>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
              Opens in your browser · Form does not collect your email address
            </p>
          </motion.div>
        </div>

      </div>
    </div>
  )
}
