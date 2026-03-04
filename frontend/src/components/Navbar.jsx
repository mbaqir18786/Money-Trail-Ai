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
      position: 'fixed',
      left: 0,
      top: '32px',
      bottom: 0,
      width: '200px',
      background: '#ffffff',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: '2px 0 12px rgba(15,23,42,0.06)',
    }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '9px', color: '#6b7280', letterSpacing: '0.12em', marginBottom: '6px' }}>
          INSTITUTION
        </div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', lineHeight: '1.3' }}>
          Union Bank<br />of India
        </div>
        <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>
          AML DIVISION · MUMBAI HQ
        </div>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#16a34a',
            flexShrink: 0,
            animation: 'ping 2s infinite'
          }} />
          <span style={{ fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em', fontWeight: 600 }}>
            LIVE MONITORING
          </span>
        </div>
      </div>

      <div style={{ padding: '12px 10px', flex: 1 }}>
        {links.map(link => {
          const active = loc.pathname === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 10px',
                marginBottom: '4px',
                borderRadius: '6px',
                textDecoration: 'none',
                background: active ? 'rgba(11,94,215,0.08)' : 'transparent',
                border: active ? '1px solid rgba(11,94,215,0.35)' : '1px solid transparent',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '18%',
                    bottom: '18%',
                    width: '3px',
                    background: '#0b5ed7',
                    borderRadius: '0 4px 4px 0',
                  }}
                />
              )}
              <span style={{ fontSize: '14px', color: active ? '#0b5ed7' : '#9ca3af' }}>
                {link.icon}
              </span>
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    letterSpacing: '0.1em',
                    color: active ? '#0b5ed7' : '#4b5563',
                  }}
                >
                  {link.label}
                </div>
                <div style={{ fontSize: '9px', color: '#6b7280' }}>{link.sub}</div>
              </div>
            </Link>
          )
        })}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
        {[
          { label: 'BACKEND', status: 'OK', color: '#00e676' },
          { label: 'ML ENGINE', status: 'OK', color: '#00e676' },
          { label: 'SOCKET.IO', status: 'LIVE', color: '#00aaff' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: '6px', fontSize: '9px'
          }}>
            <span style={{ color: '#6b7280' }}>{s.label}</span>
            <span style={{ color: s.color, fontWeight: 600 }}>● {s.status}</span>
          </div>
        ))}
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#9ca3af' }}>
          BUILD 2.0.1 · HACKATHON EDITION
        </div>
      </div>
    </nav>
  )
}