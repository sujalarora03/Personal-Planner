import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, ArrowRight, ArrowLeft, Save, Star, AlertTriangle, Lightbulb, RefreshCw, BarChart2 } from 'lucide-react'
import { api } from '../api/client'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function WeeklyReview() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reviewData, setReviewData] = useState({ review: '', stats: { done: 0, hours: 0, targets: 0 } })
  
  // Step 2 Form States
  const [win, setWin] = useState('')
  const [roadblock, setRoadblock] = useState('')
  const [learnings, setLearnings] = useState('')
  
  // Step 3 Form States
  const [goal1, setGoal1] = useState('')
  const [goal2, setGoal2] = useState('')
  const [goal3, setGoal3] = useState('')
  
  const [saving, setSaving] = useState(false)

  const fetchWeeklyData = async () => {
    setLoading(true)
    try {
      const data = await api.getWeeklyReview()
      setReviewData(data)
    } catch (e) {
      toast.error('Failed to generate weekly insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeeklyData()
  }, [])

  const handleNext = () => {
    if (step === 2 && (!win.trim() || !roadblock.trim() || !learnings.trim())) {
      toast.error('Please answer all reflection questions to continue')
      return
    }
    setStep(prev => prev + 1)
  }

  const handleBack = () => {
    setStep(prev => prev - 1)
  }

  const handleSave = async () => {
    if (!goal1.trim() && !goal2.trim() && !goal3.trim()) {
      toast.error('Please set at least one goal for next week')
      return
    }
    setSaving(true)
    
    const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const title = `Weekly Review — ${new Date().toISOString().slice(0, 10)}`
    
    const noteContent = `# Weekly Review & Reflection
*Generated on ${todayStr}*

## 📊 Past Week Stats & Accomplishments
- **Tasks Completed:** ${reviewData.stats.done}
- **Work Time Logged:** ${reviewData.stats.hours} hours
- **Active Year Targets:** ${reviewData.stats.targets}

### 🧠 Local AI Coach Insight
${reviewData.review}

## 🧘 Mindfulness & Reflection
* **What went well & biggest win:**
  ${win}
* **Roadblocks & how to overcome them:**
  ${roadblock}
* **Key learnings & self-improvement focus:**
  ${learnings}

## 🎯 Next Week's Primary Goals
1. ${goal1 || 'No goal set'}
2. ${goal2 || 'No goal set'}
3. ${goal3 || 'No goal set'}
`

    try {
      await api.createNote({
        title,
        content: noteContent,
        note_date: new Date().toISOString().slice(0, 10),
        project_id: null
      })
      toast.success('Weekly Review published to Notes!')
      navigate('/notes')
    } catch (e) {
      toast.error('Failed to save reflection note')
    } finally {
      setSaving(false)
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
            <ClipboardCheck size={22} color="white" />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Weekly Review Wizard</h1>
            <p className="page-sub" style={{ margin: 0 }}>Review accomplishments, reflect on challenges, and set goals for the week ahead</p>
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30, maxWidth: 600 }}>
        {[
          { num: 1, label: 'Analytics & Insight' },
          { num: 2, label: 'Self Reflection' },
          { num: 3, label: 'Goals & Planning' }
        ].map((s) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: s.num < 3 ? 1 : 'none', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: step === s.num 
                ? 'var(--accent, #8b5cf6)' 
                : step > s.num ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${step >= s.num ? 'var(--accent, #8b5cf6)' : 'rgba(255,255,255,0.1)'}`,
              color: step > s.num ? '#10b981' : 'white',
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {step > s.num ? '✓' : s.num}
            </div>
            <span style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              color: step === s.num ? 'white' : 'rgba(255,255,255,0.3)' 
            }}>
              {s.label}
            </span>
            {s.num < 3 && (
              <div style={{ 
                flex: 1, height: 2, 
                background: step > s.num ? '#10b981' : 'rgba(255,255,255,0.08)',
                marginLeft: 8 
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Main Wizard Card */}
      <div className="glass" style={{ padding: 24, maxWidth: 720, minHeight: 460, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14 }}
            >
              <RefreshCw size={36} className="spinner-ring" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--purple)' }} />
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                Compiling weekly statistics and fetching AI coach insights...
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              {/* STEP 1: Analytics & Insight */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'white' }}>Past Week Performance Metrics</h2>
                  
                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {[
                      { icon: Star, label: 'Tasks Completed', value: reviewData.stats.done, color: '#a78bfa' },
                      { icon: BarChart2, label: 'Hours Focused', value: `${reviewData.stats.hours}h`, color: '#60a5fa' },
                      { icon: ClipboardCheck, label: 'Year Targets Active', value: reviewData.stats.targets, color: '#34d399' }
                    ].map((stat, i) => (
                      <div key={i} className="glass" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(0,0,0,0.15)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <stat.icon size={18} style={{ color: stat.color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)' }}>{stat.value}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{stat.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI Coaching Block */}
                  <div style={{ 
                    background: 'rgba(124,58,237,0.03)', 
                    border: '1px solid rgba(124,58,237,0.15)',
                    borderRadius: 14, padding: 20, marginTop: 6
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#c4b5fd' }}>
                      <Lightbulb size={16} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Local AI Coach Insight</span>
                      <span style={{ fontSize: 9, background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '1px 6px', borderRadius: 4, marginLeft: 'auto', fontWeight: 700 }}>
                        SECURE & LOCAL
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {reviewData.review}
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: Mindfulness & Reflection */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'white' }}>Mindful Reflection</h2>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Take a minute to check in with your progress and review your hurdles.</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 5 }}>
                        1. What was your biggest accomplishment or win this week?
                      </label>
                      <textarea 
                        value={win} 
                        onChange={e => setWin(e.target.value)} 
                        rows={2}
                        placeholder="e.g. Completed the frontend styling, stayed focused during deep work..."
                        style={{ width: '100%', fontSize: 12, padding: '10px 12px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, resize: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 5 }}>
                        2. What was the main blocker or source of distraction, and how will you address it?
                      </label>
                      <textarea 
                        value={roadblock} 
                        onChange={e => setRoadblock(e.target.value)} 
                        rows={2}
                        placeholder="e.g. Too much social media, got stuck on a python bug. I will block distracting sites next week..."
                        style={{ width: '100%', fontSize: 12, padding: '10px 12px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, resize: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 5 }}>
                        3. What is one core lesson you learned or focus area you want to improve?
                      </label>
                      <textarea 
                        value={learnings} 
                        onChange={e => setLearnings(e.target.value)} 
                        rows={2}
                        placeholder="e.g. Estimating task complexity needs work, taking breaks keeps productivity high..."
                        style={{ width: '100%', fontSize: 12, padding: '10px 12px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, resize: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Goals & Planning */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'white' }}>Next Week Planning</h2>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Define the top 3 goals that will make next week a success.</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
                    {[
                      { val: goal1, set: setGoal1, placeholder: 'Goal 1: Finish career coach refinements...' },
                      { val: goal2, set: setGoal2, placeholder: 'Goal 2: Complete next module of react course...' },
                      { val: goal3, set: setGoal3, placeholder: 'Goal 3: Log at least 15 hours of study/work...' }
                    ].map((g, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                          width: 24, height: 24, borderRadius: 6, 
                          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                          color: '#a78bfa', fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {idx + 1}
                        </div>
                        <input 
                          type="text" 
                          value={g.val} 
                          onChange={e => g.set(e.target.value)} 
                          placeholder={g.placeholder}
                          style={{ flex: 1, fontSize: 13, padding: '10px 12px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="glass" style={{ padding: '14px 18px', background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: 10, marginTop: 14 }}>
                    <div style={{ fontSize: 12, color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      🔒 Local Journaling
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.5 }}>
                      Saving this review will automatically generate a formatted journal note containing your reflection answers and goals, keeping your personal growth diary 100% private.
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Actions */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button 
              className="btn btn-ghost" 
              onClick={handleBack} 
              disabled={step === 1}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: step === 1 ? 0.3 : 1 }}
            >
              <ArrowLeft size={14} /> Back
            </button>

            {step < 3 ? (
              <button className="btn btn-purple" onClick={handleNext} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button className="btn btn-purple btn-shimmer" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? (
                  <>
                    <RefreshCw size={14} className="spinner-ring" style={{ animation: 'spin 1s linear infinite' }} />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save & Publish
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
