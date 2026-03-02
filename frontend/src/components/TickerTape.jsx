import { useState, useEffect } from 'react'

const ITEMS = [
  { label: 'SYSTEM', value: 'ACTIVE', color: '#00e676' },
  { label: 'ML ENGINE', value: 'RUNNING', color: '#00e676' },
  { label: 'MONITORED ACCOUNTS', value: '1,247', color: '#00aaff' },
  { label: 'TRANSACTIONS TODAY', value: '47,832', color: '#00aaff' },
  { label: 'ALERTS ACTIVE', value: '4', color: '#ff2a4a' },
  { label: 'RISK SCORE AVG', value: '23/100', color: '#ffaa00' },
  { label: 'FIU REPORTS PENDING', value: '2', color: '#ff2a4a' },
  { label: 'PMLA THRESHOLD', value: '₹10,00,000', color: '#00aaff' },
  { label: 'NETWORK NODES', value: '142', color: '#00e5ff' },
  { label: 'SUSPICIOUS PATTERNS', value: '7 DETECTED', color: '#ff2a4a' },
  { label: 'UPTIME', value: '99.97%', color: '#00e676' },
  { label: 'UNION BANK AML v2.0', value: 'LIVE', color: '#b44aff' },
]

export default function TickerTape() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '32px',
      background: '#040810', borderBottom: '1px solid #0f2040',
      display: 'flex', alignItems: 'center', zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Left — Logo */}
      <div style={{
        width: '200px', flexShrink: 0,
        padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px',
        borderRight: '1px solid #0f2040', height: '100%'
      }}>
        <span style={{ color: '#ff2a4a', fontSize: '14px' }}>◈</span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#e8f4ff', letterSpacing: '0.1em' }}>
          MONEYTRAIL
        </span>
        <span style={{ fontSize: '9px', color: '#00e676', letterSpacing: '0.1em' }}>AI</span>
      </div>

      {/* Scrolling ticker */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          display: 'flex', gap: '40px', alignItems: 'center',
          animation: 'ticker 40s linear infinite',
          whiteSpace: 'nowrap'
        }}>
          {[...ITEMS, ...ITEMS].map((item, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.1em' }}>
                {item.label}
              </span>
              <span style={{ fontSize: '10px', fontWeight: '700', color: item.color }}>
                {item.value}
              </span>
              <span style={{ color: '#0f2040', margin: '0 8px' }}>│</span>
            </span>
          ))}
        </div>
      </div>

      {/* Right — Time */}
      <div style={{
        padding: '0 16px', borderLeft: '1px solid #0f2040',
        fontSize: '11px', fontWeight: '500', color: '#5a7fa8',
        flexShrink: 0
      }}>
        {time.toLocaleTimeString('en-IN', { hour12: false })}
        <span style={{ color: '#0f2040', margin: '0 6px' }}>│</span>
        <span style={{ color: '#00e676', fontSize: '9px' }}>● LIVE</span>
      </div>
    </div>
  )
}