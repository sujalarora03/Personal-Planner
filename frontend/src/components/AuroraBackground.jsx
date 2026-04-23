// Aurora background — animated glowing orbs
export default function AuroraBackground() {
  return (
    <>
      <div className="aurora-orb" style={{
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
        top: '-100px', right: '-100px',
        animationDuration: '15s',
      }} />
      <div className="aurora-orb" style={{
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        bottom: '10%', left: '-80px',
        animationDuration: '18s',
        animationDelay: '-6s',
      }} />
      <div className="aurora-orb" style={{
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
        bottom: '20%', right: '20%',
        animationDuration: '20s',
        animationDelay: '-10s',
      }} />
    </>
  )
}
