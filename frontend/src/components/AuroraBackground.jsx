// Aurora background — animated glowing orbs
export default function AuroraBackground() {
  return (
    <>
      <div className="aurora-orb" style={{
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
        top: '-150px', left: '-100px',
        animation: 'orb-float-1 25s ease-in-out infinite alternate',
      }} />
      <div className="aurora-orb" style={{
        width: 550, height: 550,
        background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
        top: '15%', right: '-150px',
        animation: 'orb-float-2 28s ease-in-out infinite alternate',
      }} />
      <div className="aurora-orb" style={{
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        bottom: '-100px', left: '5%',
        animation: 'orb-float-3 32s ease-in-out infinite alternate',
      }} />
      <div className="aurora-orb" style={{
        width: 450, height: 450,
        background: 'radial-gradient(circle, rgba(244,63,94,0.14) 0%, transparent 70%)',
        bottom: '20%', right: '10%',
        animation: 'orb-float-4 30s ease-in-out infinite alternate',
      }} />
    </>
  )
}
