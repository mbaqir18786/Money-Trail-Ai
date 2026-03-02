import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = 'http://localhost:5001'

// Major Indian cities with coordinates mapped to SVG viewBox 0 0 800 900
const CITIES = {
  Mumbai:     { x: 185, y: 520, state: 'Maharashtra' },
  Delhi:      { x: 310, y: 235, state: 'Delhi' },
  Bengaluru:  { x: 280, y: 660, state: 'Karnataka' },
  Chennai:    { x: 330, y: 690, state: 'Tamil Nadu' },
  Hyderabad:  { x: 300, y: 580, state: 'Telangana' },
  Kolkata:    { x: 490, y: 370, state: 'West Bengal' },
  Pune:       { x: 210, y: 545, state: 'Maharashtra' },
  Ahmedabad:  { x: 185, y: 390, state: 'Gujarat' },
  Jaipur:     { x: 255, y: 295, state: 'Rajasthan' },
  Lucknow:    { x: 375, y: 285, state: 'Uttar Pradesh' },
  Bhopal:     { x: 305, y: 390, state: 'Madhya Pradesh' },
  Patna:      { x: 430, y: 320, state: 'Bihar' },
  Surat:      { x: 195, y: 450, state: 'Gujarat' },
  Nagpur:     { x: 340, y: 460, state: 'Maharashtra' },
  Chandigarh: { x: 295, y: 185, state: 'Punjab' },
}

// Fraud flow scenarios
const FRAUD_FLOWS = [
  { from: 'Mumbai', to: 'Delhi', amount: 4700000, type: 'CIRCULAR', delay: 0 },
  { from: 'Delhi', to: 'Kolkata', amount: 3200000, type: 'LAYERING', delay: 800 },
  { from: 'Kolkata', to: 'Chennai', amount: 2800000, type: 'LAYERING', delay: 1600 },
  { from: 'Chennai', to: 'Hyderabad', amount: 1900000, type: 'STRUCTURING', delay: 2400 },
  { from: 'Hyderabad', to: 'Mumbai', amount: 4500000, type: 'CIRCULAR', delay: 3200 },
  { from: 'Bengaluru', to: 'Pune', amount: 2100000, type: 'ROUND_TRIP', delay: 1000 },
  { from: 'Pune', to: 'Ahmedabad', amount: 1800000, type: 'LAYERING', delay: 2000 },
  { from: 'Ahmedabad', to: 'Jaipur', amount: 1500000, type: 'STRUCTURING', delay: 3000 },
  { from: 'Jaipur', to: 'Lucknow', amount: 900000, type: 'STRUCTURING', delay: 3800 },
]

const TYPE_COLOR = {
  CIRCULAR: '#ff2a4a',
  LAYERING: '#ffaa00',
  STRUCTURING: '#b44aff',
  ROUND_TRIP: '#00e5ff',
}

// Simplified India outline paths (major regions)
const INDIA_PATH = `
M 295 60 L 320 55 L 355 70 L 390 65 L 420 80 L 460 75 L 490 90 L 510 110
L 530 130 L 545 160 L 550 190 L 540 220 L 555 240 L 560 270 L 545 300
L 530 320 L 520 350 L 530 380 L 520 410 L 500 430 L 490 460 L 470 480
L 450 510 L 430 530 L 410 560 L 390 590 L 370 620 L 350 650 L 340 680
L 330 710 L 320 730 L 310 750 L 295 760 L 280 750 L 265 730 L 250 700
L 240 670 L 230 640 L 215 610 L 200 580 L 185 555 L 170 530 L 155 510
L 145 480 L 140 450 L 130 420 L 125 390 L 130 360 L 140 330 L 135 300
L 140 270 L 150 245 L 160 220 L 155 195 L 160 170 L 175 150 L 185 130
L 195 110 L 210 95 L 230 80 L 255 68 L 280 62 L 295 60 Z
M 490 90 L 510 85 L 535 95 L 555 115 L 565 140 L 560 165 L 550 190 Z
M 310 750 L 325 770 L 315 790 L 300 800 L 285 790 L 275 770 L 280 750 Z
`

export default function IndiaMap() {
  const [activeFlows, setActiveFlows] = useState([])
  const [cityRisks, setCityRisks] = useState({})
  const [selectedCity, setSelectedCity] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [totalFlowed, setTotalFlowed] = useState(0)
  const [flowLog, setFlowLog] = useState([])
  const animRef = useRef(null)
  const particlesRef = useRef([])
  const canvasRef = useRef(null)

  useEffect(() => {
    // Init city risks
    const risks = {}
    Object.keys(CITIES).forEach(city => {
      risks[city] = { risk: Math.floor(Math.random() * 40) + 10, txnCount: Math.floor(Math.random() * 50) + 5, amount: 0 }
    })
    // Boost fraud cities
    ;['Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata'].forEach(c => {
      risks[c].risk = Math.floor(Math.random() * 30) + 65
      risks[c].amount = Math.floor(Math.random() * 5000000) + 1000000
    })
    setCityRisks(risks)
  }, [])

  const startAnimation = () => {
    setIsPlaying(true)
    setActiveFlows([])
    setFlowLog([])
    setTotalFlowed(0)

    FRAUD_FLOWS.forEach((flow, i) => {
      setTimeout(() => {
        setActiveFlows(prev => [...prev, { ...flow, id: `${flow.from}-${flow.to}-${Date.now()}`, progress: 0 }])
        setFlowLog(prev => [{
          time: new Date().toLocaleTimeString('en-IN', { hour12: false }),
          from: flow.from,
          to: flow.to,
          amount: flow.amount,
          type: flow.type
        }, ...prev].slice(0, 12))
        setTotalFlowed(prev => prev + flow.amount)
        setCityRisks(prev => ({
          ...prev,
          [flow.from]: { ...prev[flow.from], risk: Math.min(98, (prev[flow.from]?.risk || 0) + 8) },
          [flow.to]: { ...prev[flow.to], risk: Math.min(98, (prev[flow.to]?.risk || 0) + 12) },
        }))
      }, flow.delay)
    })

    setTimeout(() => setIsPlaying(false), 6000)
  }

  const getRiskColor = (risk) => {
    if (risk >= 70) return '#ff2a4a'
    if (risk >= 45) return '#ffaa00'
    return '#00aaff'
  }

  const getCityTotal = (city) => {
    const flows = FRAUD_FLOWS.filter(f => f.from === city || f.to === city)
    return flows.reduce((s, f) => s + f.amount, 0)
  }

  return (
    <div style={{ height: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.2em', marginBottom: '4px' }}>GEOGRAPHIC INTELLIGENCE</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>
            INDIA MONEY FLOW MAP
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ padding: '8px 16px', background: '#080f1e', border: '1px solid #0f2040', borderRadius: '3px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'JetBrains Mono', color: '#ff2a4a' }}>
              ₹{(totalFlowed / 100000).toFixed(0)}L
            </div>
            <div style={{ fontSize: '9px', color: '#5a7fa8' }}>TOTAL FLOWED</div>
          </div>
          <button onClick={startAnimation} disabled={isPlaying} style={{
            padding: '10px 24px', borderRadius: '3px', fontSize: '11px', fontWeight: '700',
            background: isPlaying ? 'rgba(255,42,74,0.05)' : 'rgba(255,42,74,0.15)',
            border: '1px solid rgba(255,42,74,0.4)', color: '#ff2a4a', letterSpacing: '0.1em'
          }}>
            {isPlaying ? '◌ ANIMATING...' : '▶ SIMULATE FLOW'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 300px', gap: '12px', minHeight: 0 }}>

        {/* MAP */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', background: '#040d1a' }}>

          {/* Grid background */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
            <defs>
              <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00aaff" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mapgrid)" />
          </svg>

          <svg viewBox="0 0 800 900" style={{ width: '100%', height: '100%', position: 'relative' }}
            preserveAspectRatio="xMidYMid meet">

            {/* India shape */}
            <path d={INDIA_PATH}
              fill="rgba(0,170,255,0.04)"
              stroke="rgba(0,170,255,0.2)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Flow lines with animation */}
            {activeFlows.map(flow => {
              const from = CITIES[flow.from]
              const to = CITIES[flow.to]
              if (!from || !to) return null
              const color = TYPE_COLOR[flow.type] || '#00aaff'
              const id = `flow-${flow.id}`

              return (
                <g key={flow.id}>
                  {/* Glowing line */}
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={color} strokeWidth="2" strokeOpacity="0.6"
                    strokeDasharray="8,4"
                    style={{ animation: 'none' }}
                  />
                  {/* Animated particle */}
                  <circle r="5" fill={color} opacity="0.9"
                    filter={`drop-shadow(0 0 6px ${color})`}>
                    <animateMotion dur="1.5s" repeatCount="3" fill="freeze">
                      <mpath href={`#path-${flow.id}`} />
                    </animateMotion>
                  </circle>
                  <path id={`path-${flow.id}`}
                    d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 60} ${to.x} ${to.y}`}
                    fill="none" />
                  {/* Curved arc */}
                  <path
                    d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 60} ${to.x} ${to.y}`}
                    fill="none" stroke={color} strokeWidth="2.5" strokeOpacity="0.5"
                    strokeDasharray="6,3"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-100" dur="1s" repeatCount="indefinite" />
                  </path>
                  {/* Amount label */}
                  <text
                    x={(from.x + to.x) / 2}
                    y={Math.min(from.y, to.y) - 68}
                    textAnchor="middle" fontSize="9"
                    fill={color} fontFamily="JetBrains Mono"
                    opacity="0.9"
                  >
                    ₹{(flow.amount / 100000).toFixed(0)}L
                  </text>
                </g>
              )
            })}

            {/* City nodes */}
            {Object.entries(CITIES).map(([city, pos]) => {
              const risk = cityRisks[city]?.risk || 20
              const color = getRiskColor(risk)
              const isSelected = selectedCity === city
              const hasFlow = activeFlows.some(f => f.from === city || f.to === city)

              return (
                <g key={city} style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedCity(city === selectedCity ? null : city)}>

                  {/* Pulse ring for high risk */}
                  {(risk >= 70 || hasFlow) && (
                    <circle cx={pos.x} cy={pos.y} r="16" fill="none"
                      stroke={color} strokeWidth="1" opacity="0.4"
                      style={{ animation: 'ping 2s infinite' }}
                    />
                  )}

                  {/* Node */}
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={isSelected ? 10 : risk >= 70 ? 8 : 6}
                    fill={`${color}22`}
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter={risk >= 70 ? `drop-shadow(0 0 8px ${color})` : undefined}
                  />

                  {/* Inner dot */}
                  <circle cx={pos.x} cy={pos.y} r="3" fill={color} opacity="0.9" />

                  {/* City label */}
                  <text x={pos.x} y={pos.y - 14}
                    textAnchor="middle" fontSize="9"
                    fill={risk >= 70 ? color : '#5a7fa8'}
                    fontFamily="JetBrains Mono"
                    fontWeight={risk >= 70 ? '700' : '400'}
                  >
                    {city}
                  </text>

                  {/* Risk score */}
                  <text x={pos.x} y={pos.y + 22}
                    textAnchor="middle" fontSize="8"
                    fill={color} fontFamily="JetBrains Mono"
                  >
                    {risk}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', gap: '12px' }}>
            {Object.entries(TYPE_COLOR).map(([type, color]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '20px', height: '2px', background: color, boxShadow: `0 0 4px ${color}` }} />
                <span style={{ fontSize: '8px', color: '#5a7fa8', fontFamily: 'JetBrains Mono' }}>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>

          {/* Selected city detail */}
          {selectedCity && cityRisks[selectedCity] && (
            <div className="card" style={{
              borderLeft: `2px solid ${getRiskColor(cityRisks[selectedCity].risk)}`,
              animation: 'fadeUp 0.3s ease'
            }}>
              <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.15em', marginBottom: '6px' }}>CITY PROFILE</div>
              <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'Rajdhani, sans-serif', marginBottom: '10px' }}>
                {selectedCity}
              </div>
              {[
                { label: 'RISK SCORE', value: `${cityRisks[selectedCity].risk}/100`, color: getRiskColor(cityRisks[selectedCity].risk) },
                { label: 'STATE', value: CITIES[selectedCity].state },
                { label: 'FLAGGED FLOWS', value: FRAUD_FLOWS.filter(f => f.from === selectedCity || f.to === selectedCity).length },
                { label: 'TOTAL EXPOSURE', value: `₹${(getCityTotal(selectedCity) / 100000).toFixed(1)}L` },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #0a1828' }}>
                  <span style={{ fontSize: '9px', color: '#5a7fa8' }}>{label}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', fontFamily: 'JetBrains Mono', color: color || '#e8f4ff' }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Flow log */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.15em', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span>LIVE FLOW LOG</span>
              {isPlaying && <span style={{ color: '#ff2a4a', animation: 'blink 0.8s infinite' }}>● LIVE</span>}
            </div>
            {flowLog.length === 0 ? (
              <div style={{ color: '#2a3f5f', fontSize: '10px', textAlign: 'center', padding: '20px' }}>
                PRESS SIMULATE TO START
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {flowLog.map((log, i) => (
                  <div key={i} style={{
                    padding: '8px', borderRadius: '3px',
                    background: 'rgba(255,42,74,0.04)',
                    border: '1px solid rgba(255,42,74,0.1)',
                    animation: 'fadeUp 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '8px', color: '#5a7fa8', fontFamily: 'JetBrains Mono' }}>{log.time}</span>
                      <span style={{ fontSize: '8px', fontWeight: '700', color: TYPE_COLOR[log.type] || '#00aaff' }}>{log.type}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8aafd4', fontFamily: 'JetBrains Mono' }}>
                      <span style={{ color: '#ff2a4a' }}>{log.from}</span>
                      <span style={{ color: '#2a3f5f' }}> ──▶ </span>
                      <span style={{ color: '#ffaa00' }}>{log.to}</span>
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#e8f4ff', marginTop: '2px' }}>
                      ₹{log.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* City risk leaderboard */}
          <div className="card">
            <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.15em', marginBottom: '10px' }}>HIGHEST RISK CITIES</div>
            {Object.entries(cityRisks)
              .sort((a, b) => b[1].risk - a[1].risk)
              .slice(0, 6)
              .map(([city, data], i) => (
                <div key={city} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', color: '#2a3f5f', width: '12px' }}>#{i + 1}</span>
                  <span style={{ fontSize: '10px', color: '#8aafd4', flex: 1, fontFamily: 'JetBrains Mono' }}>{city}</span>
                  <div style={{ width: '60px', height: '4px', background: '#0a1828', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      width: `${data.risk}%`,
                      background: getRiskColor(data.risk),
                      boxShadow: `0 0 6px ${getRiskColor(data.risk)}`
                    }} />
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: getRiskColor(data.risk), fontFamily: 'JetBrains Mono', width: '28px', textAlign: 'right' }}>
                    {data.risk}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}