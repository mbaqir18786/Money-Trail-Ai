import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

const API = 'http://localhost:5001'
const socket = io(API)

const VOLUME_DATA = [
  { t: '06', v: 89, s: 2 }, { t: '07', v: 134, s: 1 }, { t: '08', v: 312, s: 4 },
  { t: '09', v: 521, s: 8 }, { t: '10', v: 689, s: 12 }, { t: '11', v: 743, s: 7 },
  { t: '12', v: 698, s: 15 }, { t: '13', v: 812, s: 21 }, { t: '14', v: 934, s: 31 },
  { t: '15', v: 756, s: 9 }, { t: '16', v: 623, s: 6 }, { t: '17', v: 445, s: 3 },
]

const RISK_DATA = [
  { name: 'Mumbai', risk: 78 }, { name: 'Delhi', risk: 62 }, { name: 'Bengaluru', risk: 45 },
  { name: 'Chennai', risk: 38 }, { name: 'Hyderabad', risk: 55 }, { name: 'Kolkata', risk: 29 },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [liveTxns, setLiveTxns] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [demoRunning, setDemoRunning] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const [demoData, setDemoData] = useState(null)
  const [riskScore, setRiskScore] = useState(0)
  const [alertText, setAlertText] = useState('')
  const alertRef = useRef(null)

  useEffect(() => {
    axios.get(`${API}/api/stats`).then(r => setStats(r.data))
    socket.on('transaction:live', txn => {
      setLiveTxns(p => [txn, ...p].slice(0, 10))
      if (txn.suspicious) toast('⚠️ Suspicious transaction', { icon: '🔴' })
    })
    socket.on('alert:generated', alert => {
      setAlerts(p => [alert, ...p])
      toast.error(`🚨 ${alert.type.replace(/_/g, ' ').toUpperCase()}`)
    })
    return () => socket.off()
  }, [])

  const typewriterAlert = (text) => {
    setAlertText('')
    let i = 0
    const interval = setInterval(() => {
      setAlertText(text.slice(0, i))
      i++
      if (i > text.length) clearInterval(interval)
    }, 18)
  }

  const runDemo = async () => {
    setDemoRunning(true)
    setDemoStep(0)
    setRiskScore(0)
    setAlertText('')
    const res = await axios.get(`${API}/api/demo`)
    setDemoData(res.data)

    const steps = [1000, 3000, 7000, 12000, 17000, 22000]
    steps.forEach((delay, i) => setTimeout(() => {
      setDemoStep(i + 1)
      if (i === 3) {
        let s = 0
        const c = setInterval(() => { s += 2; setRiskScore(s); if (s >= 94) clearInterval(c) }, 30)
      }
      if (i === 4) typewriterAlert(res.data.alert)
      if (i === 5) { toast.success('📄 Evidence package ready'); setDemoRunning(false) }
    }, delay))
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await axios.post(`${API}/api/analyze`)
      setAlerts(res.data.alerts || [])
      toast.success(`✅ ${res.data.alerts?.length || 0} fraud patterns detected`)
    } catch { toast.error('Analysis failed') }
    setAnalyzing(false)
  }

  return (
    <div style={{ maxWidth: '1600px' }}>

      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #0f2040'
      }}>
        <div>
          <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.2em', marginBottom: '4px' }}>
            AML INTELLIGENCE PLATFORM
          </div>
          <h1 style={{
            fontSize: '22px', fontWeight: '700', color: '#e8f4ff',
            fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em'
          }}>
            COMMAND CENTER
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', marginRight: '8px' }}>
            <div style={{ fontSize: '9px', color: '#5a7fa8' }}>THREAT LEVEL</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#ff2a4a' }}>HIGH</div>
          </div>
          <button onClick={runAnalysis} disabled={analyzing} style={{
            padding: '8px 16px', borderRadius: '3px', fontSize: '11px', fontWeight: '700',
            background: 'rgba(0,170,255,0.1)', border: '1px solid rgba(0,170,255,0.3)',
            color: '#00aaff', letterSpacing: '0.1em'
          }}>
            {analyzing ? '◌ ANALYZING...' : '◈ RUN ANALYSIS'}
          </button>
          <button onClick={runDemo} disabled={demoRunning} style={{
            padding: '8px 20px', borderRadius: '3px', fontSize: '11px', fontWeight: '700',
            background: demoRunning ? 'rgba(255,42,74,0.05)' : 'rgba(255,42,74,0.15)',
            border: '1px solid rgba(255,42,74,0.4)',
            color: '#ff2a4a', letterSpacing: '0.1em',
            animation: demoRunning ? 'borderPulse 1s infinite' : 'none'
          }}>
            {demoRunning ? `◌ DEMO ${demoStep}/6` : '▶ LIVE DEMO'}
          </button>
        </div>
      </div>

      {/* DEMO PANEL */}
      {(demoRunning || demoStep > 0) && demoData && (
        <div style={{
          background: '#080f1e', border: '1px solid rgba(255,42,74,0.3)',
          borderRadius: '4px', padding: '20px', marginBottom: '20px',
          animation: 'fadeUp 0.4s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '9px', color: '#ff2a4a', letterSpacing: '0.2em', marginBottom: '4px' }}>
                ● LIVE DETECTION SEQUENCE
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Rajdhani, sans-serif', color: '#e8f4ff' }}>
                CIRCULAR LAYERING — ₹47,00,000
              </div>
            </div>
            {demoStep >= 4 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '48px', fontWeight: '700', fontFamily: 'JetBrains Mono',
                  color: '#ff2a4a', lineHeight: 1,
                  textShadow: '0 0 30px rgba(255,42,74,0.6)',
                  animation: 'countup 0.3s ease'
                }}>
                  {riskScore}
                </div>
                <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.1em' }}>RISK SCORE / 100</div>
              </div>
            )}
          </div>

          {/* Step timeline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'INIT', desc: 'Surveillance active' },
              { label: 'SCAN', desc: 'Processing 1000 txns' },
              { label: 'FLAG', desc: '4 accounts flagged' },
              { label: 'SCORE', desc: 'Risk: 94/100' },
              { label: 'ALERT', desc: 'Pattern confirmed' },
              { label: 'REPORT', desc: 'STR ready' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '8px', borderRadius: '3px', textAlign: 'center',
                background: demoStep > i ? 'rgba(255,42,74,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${demoStep > i ? 'rgba(255,42,74,0.3)' : '#0f2040'}`,
                transition: 'all 0.4s ease'
              }}>
                <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', color: demoStep > i ? '#ff2a4a' : '#2a3f5f' }}>{s.label}</div>
                <div style={{ fontSize: '9px', color: demoStep > i ? '#8aafd4' : '#2a3f5f', marginTop: '2px' }}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Fraud accounts */}
          {demoStep >= 3 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {demoData.accounts.map((acc, i) => (
                <div key={acc.id} style={{
                  padding: '10px 14px', borderRadius: '3px',
                  background: 'rgba(255,42,74,0.08)',
                  border: '1px solid rgba(255,42,74,0.3)',
                  animation: `pulse-red 1.5s ${i * 0.2}s infinite`,
                  minWidth: '140px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#ff2a4a', marginBottom: '2px' }}>{acc.id}</div>
                  <div style={{ fontSize: '10px', color: '#8aafd4', marginBottom: '4px' }}>{acc.name}</div>
                  <div style={{ fontSize: '9px', color: '#5a7fa8' }}>ROLE: <span style={{ color: '#ffaa00' }}>{acc.role.toUpperCase()}</span></div>
                  <div style={{ fontSize: '9px', color: '#5a7fa8' }}>RISK: <span style={{ color: '#ff2a4a', fontWeight: '700' }}>{acc.risk}/100</span></div>
                </div>
              ))}
              <div style={{ padding: '10px 14px', borderRadius: '3px', background: 'rgba(255,42,74,0.04)', border: '1px solid #0f2040', minWidth: '140px' }}>
                <div style={{ fontSize: '9px', color: '#5a7fa8', marginBottom: '6px' }}>TRANSACTION FLOW</div>
                {demoData.transactions.map((t, i) => (
                  <div key={i} style={{ fontSize: '9px', color: '#8aafd4', marginBottom: '3px', fontFamily: 'JetBrains Mono' }}>
                    <span style={{ color: '#ff2a4a' }}>{t.from}</span>
                    <span style={{ color: '#2a3f5f' }}> →→ </span>
                    <span style={{ color: '#ffaa00' }}>{t.to}</span>
                    <span style={{ color: '#5a7fa8' }}> ₹{(t.amount/100000).toFixed(0)}L</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Alert typewriter */}
          {demoStep >= 5 && alertText && (
            <div style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,42,74,0.2)',
              borderRadius: '3px', padding: '14px'
            }}>
              <div style={{ fontSize: '9px', color: '#ff2a4a', fontWeight: '700', letterSpacing: '0.15em', marginBottom: '8px' }}>
                ◈ AI INVESTIGATION BRIEF — GPT-4o
              </div>
              <pre style={{
                fontSize: '11px', color: '#8aafd4', whiteSpace: 'pre-wrap',
                fontFamily: 'JetBrains Mono', lineHeight: '1.7'
              }}>
                {alertText}
                <span style={{ animation: 'blink 0.8s infinite', color: '#00aaff' }}>█</span>
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'TRANSACTIONS', value: stats?.totalTransactions?.toLocaleString() || '1,000', sub: 'Total monitored', color: '#00aaff', icon: '◈' },
          { label: 'ACCOUNTS', value: stats?.totalAccounts?.toLocaleString() || '142', sub: 'Unique accounts', color: '#00e5ff', icon: '◉' },
          { label: 'SUSPICIOUS', value: stats?.suspiciousCount || 47, sub: 'Fraud flagged', color: '#ffaa00', icon: '⚡' },
          { label: 'HIGH RISK', value: stats?.highRiskAccounts || 12, sub: 'Under investigation', color: '#ff2a4a', icon: '◎' },
          { label: 'ALERTS', value: alerts.length || stats?.alertsGenerated || 4, sub: 'AI generated', color: '#b44aff', icon: '▦' },
        ].map((s, i) => (
          <div key={i} className={`card card-${['', '', 'amber', 'red', 'purple'][i] || ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.15em', marginBottom: '8px' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'JetBrains Mono', color: s.color, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '9px', color: '#5a7fa8', marginTop: '6px' }}>{s.sub}</div>
              </div>
              <span style={{ fontSize: '20px', color: s.color, opacity: 0.4 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '12px', marginBottom: '16px' }}>

        {/* Volume chart */}
        <div className="card">
          <div className="section-label">TRANSACTION VOLUME — HOURLY</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={VOLUME_DATA}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00aaff" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00aaff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="susGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff2a4a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff2a4a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" stroke="#0f2040" tick={{ fontSize: 9, fill: '#5a7fa8', fontFamily: 'JetBrains Mono' }} />
              <YAxis stroke="#0f2040" tick={{ fontSize: 9, fill: '#5a7fa8', fontFamily: 'JetBrains Mono' }} />
              <Tooltip contentStyle={{ background: '#080f1e', border: '1px solid #0f2040', borderRadius: '3px', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
              <Area type="monotone" dataKey="v" stroke="#00aaff" strokeWidth={1.5} fill="url(#volGrad)" name="Volume" />
              <Area type="monotone" dataKey="s" stroke="#ff2a4a" strokeWidth={1.5} fill="url(#susGrad)" name="Suspicious" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* City risk */}
        <div className="card">
          <div className="section-label">CITY RISK INDEX</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={RISK_DATA} layout="vertical">
              <XAxis type="number" stroke="#0f2040" tick={{ fontSize: 9, fill: '#5a7fa8', fontFamily: 'JetBrains Mono' }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" stroke="#0f2040" tick={{ fontSize: 9, fill: '#5a7fa8', fontFamily: 'JetBrains Mono' }} width={60} />
              <Tooltip contentStyle={{ background: '#080f1e', border: '1px solid #0f2040', borderRadius: '3px', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
              <Bar dataKey="risk" radius={[0, 2, 2, 0]}>
                {RISK_DATA.map((d, i) => (
                  <Cell key={i} fill={d.risk > 70 ? '#ff2a4a' : d.risk > 50 ? '#ffaa00' : '#00aaff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '12px' }}>

        {/* Alerts feed */}
        <div className="card card-red">
          <div className="section-label">ACTIVE FRAUD ALERTS</div>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#2a3f5f', fontSize: '12px' }}>
              NO ALERTS — RUN ANALYSIS TO DETECT PATTERNS
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {alerts.map((alert, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: '3px',
                  background: 'rgba(255,42,74,0.05)', border: '1px solid rgba(255,42,74,0.15)',
                  animation: 'fadeUp 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#ff2a4a', letterSpacing: '0.1em' }}>
                      {alert.type?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className={`badge badge-${alert.severity === 'CRITICAL' ? 'critical' : 'high'}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#8aafd4', lineHeight: '1.5' }}>
                    {alert.text?.slice(0, 120)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live feed */}
        <div className="card">
          <div className="section-label">LIVE TRANSACTION STREAM</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {liveTxns.length === 0 ? (
              <div style={{ color: '#2a3f5f', fontSize: '11px' }}>AWAITING STREAM...</div>
            ) : liveTxns.map((txn, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 8px', borderRadius: '2px', fontSize: '10px',
                background: txn.suspicious ? 'rgba(255,42,74,0.06)' : 'rgba(255,255,255,0.01)',
                border: `1px solid ${txn.suspicious ? 'rgba(255,42,74,0.2)' : '#0a1828'}`,
                animation: 'fadeUp 0.2s ease'
              }}>
                <span style={{ color: '#2a3f5f', fontFamily: 'JetBrains Mono', fontSize: '9px' }}>
                  {txn.id?.slice(-8)}
                </span>
                <span style={{ color: txn.suspicious ? '#ff2a4a' : '#00e676', fontWeight: '700' }}>
                  ₹{txn.amount?.toLocaleString('en-IN')}
                </span>
                <span style={{ color: '#5a7fa8', fontSize: '9px' }}>{txn.type}</span>
                {txn.suspicious && <span className="badge badge-critical">!</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}