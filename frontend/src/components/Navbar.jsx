import { Link, useLocation } from 'react-router-dom'

const links = [
    { path: '/', icon: '▦', label: 'COMMAND', sub: 'Dashboard' },
    { path: '/graph', icon: '◎', label: 'NETWORK', sub: 'Graph View' },
    { path: '/map', icon: '🗺', label: 'GEO MAP', sub: 'Money Flow' },
    { path: '/alerts', icon: '⚡', label: 'ALERTS', sub: 'Fraud Feed' },
    { path: '/investigation', icon: '◉', label: 'CASES', sub: 'Investigation' },
    { path: '/intelligence', icon: '◈', label: 'INTEL', sub: 'Flow Analysis' },
  ]

export default function Navbar() {
  const loc = useLocation()

  return (
    <nav style={{
      position: 'fixed', left: 0, top: '32px', bottom: 0,
      width: '200px',
      background: '#040810',
      borderRight: '1px solid #0f2040',
      display: 'flex', flexDirection: 'column',
      zIndex: 100
    }}>
      {/* Bank ID */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #0f2040' }}>
        <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.15em', marginBottom: '6px' }}>
          INSTITUTION
        </div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#e8f4ff', lineHeight: '1.3' }}>
          Union Bank<br />of India
        </div>
        <div style={{ fontSize: '9px', color: '#5a7fa8', marginTop: '4px' }}>
          AML DIVISION · MUMBAI HQ
        </div>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#00e676', flexShrink: 0,
            boxShadow: '0 0 6px #00e676',
            animation: 'ping 2s infinite'
          }} />
          <span style={{ fontSize: '9px', color: '#00e676', letterSpacing: '0.1em' }}>
            LIVE MONITORING
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: '12px 10px', flex: 1 }}>
        {links.map(link => {
          const active = loc.pathname === link.path
          return (
            <Link key={link.path} to={link.path} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 10px', marginBottom: '4px',
              borderRadius: '3px', textDecoration: 'none',
              background: active ? 'rgba(0,170,255,0.08)' : 'transparent',
              border: active ? '1px solid rgba(0,170,255,0.2)' : '1px solid transparent',
              transition: 'all 0.15s',
              position: 'relative'
            }}>
              {active && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: '2px', background: '#00aaff',
                  boxShadow: '0 0 8px #00aaff'
                }} />
              )}
              <span style={{ fontSize: '14px', color: active ? '#00aaff' : '#5a7fa8' }}>
                {link.icon}
              </span>
              <div>
                <div style={{
                  fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em',
                  color: active ? '#00aaff' : '#8aafd4'
                }}>
                  {link.label}
                </div>
                <div style={{ fontSize: '9px', color: '#5a7fa8' }}>{link.sub}</div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Status panel */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #0f2040' }}>
        {[
          { label: 'BACKEND', status: 'OK', color: '#00e676' },
          { label: 'ML ENGINE', status: 'OK', color: '#00e676' },
          { label: 'SOCKET.IO', status: 'LIVE', color: '#00aaff' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: '6px', fontSize: '9px'
          }}>
            <span style={{ color: '#5a7fa8' }}>{s.label}</span>
            <span style={{ color: s.color, fontWeight: '700' }}>● {s.status}</span>
          </div>
        ))}
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#2a3f5f' }}>
          BUILD 2.0.1 · HACKATHON EDITION
        </div>
      </div>
    </nav>
  )
}