import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Lock } from 'lucide-react'
import { api } from '../api/client'

const CATEGORY_COLORS = {
  Tasks:    '#a78bfa',
  Habits:   '#f59e0b',
  Notes:    '#22d3ee',
  Projects: '#fb923c',
  Work:     '#34d399',
  Learning: '#818cf8',
}

export default function Achievements() {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAchievements()
      .then(setBadges)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const unlocked = badges.filter(b => b.unlocked)
  const locked   = badges.filter(b => !b.unlocked)

  const grouped = {}
  badges.forEach(b => {
    if (!grouped[b.category]) grouped[b.category] = []
    grouped[b.category].push(b)
  })

  if (loading) return (
    <div className="page">
      <div className="page-loading"><div className="spinner-ring" /><span>Loading achievements…</span></div>
    </div>
  )

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
        }}>
          <Award size={22} color="white" />
        </div>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Achievements</h1>
          <p className="page-sub" style={{ margin: 0 }}>{unlocked.length} of {badges.length} unlocked</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="glass" style={{ padding: '14px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b', minWidth: 52 }}>
          {badges.length > 0 ? Math.round(unlocked.length / badges.length * 100) : 0}%
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
            {unlocked.length === badges.length ? '🎉 All achievements unlocked!' : `${locked.length} remaining`}
          </div>
          <div className="progress-bar">
            <motion.div className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: badges.length > 0 ? `${unlocked.length / badges.length * 100}%` : '0%' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }} />
          </div>
        </div>
      </div>

      {/* Grouped categories */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: CATEGORY_COLORS[category] || '#a78bfa', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: CATEGORY_COLORS[category] || '#a78bfa' }} />
            {category}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {items.map((badge, i) => (
              <motion.div key={badge.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass"
                style={{
                  padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14,
                  opacity: badge.unlocked ? 1 : 0.45,
                  borderLeft: badge.unlocked ? `3px solid ${CATEGORY_COLORS[category] || '#a78bfa'}` : '3px solid rgba(255,255,255,0.08)',
                  position: 'relative', overflow: 'hidden',
                }}>
                {badge.unlocked && (
                  <div style={{
                    position: 'absolute', top: 0, right: 0, width: 40, height: 40,
                    background: `radial-gradient(circle at top right, ${CATEGORY_COLORS[category]}22, transparent)`,
                  }} />
                )}
                <div style={{
                  fontSize: 32, lineHeight: 1, flexShrink: 0,
                  filter: badge.unlocked ? 'none' : 'grayscale(100%)',
                }}>
                  {badge.unlocked ? badge.icon : <Lock size={24} style={{ color: 'rgba(255,255,255,0.2)', marginTop: 4 }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: badge.unlocked ? 'white' : 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                    {badge.title}
                    {badge.unlocked && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: CATEGORY_COLORS[category] || '#a78bfa', background: (CATEGORY_COLORS[category] || '#a78bfa') + '20', padding: '1px 6px', borderRadius: 99 }}>
                        ✓ Unlocked
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{badge.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
