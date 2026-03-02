import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = 'http://localhost:5001'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/analyze`)
      setAlerts(res.data.alerts || [])
      toast.success(`${res.data.alerts?.length || 0} patterns detected`)
    } catch { toast.error('Analysis failed') }
    setLoading(false)
  }

  const downloadSTR = (alert) => {
    const content = `
SUSPICIOUS TRANSACTION REPORT
Union Bank of India — AML Division
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Report ID    : STR-UBI-${Date.now()}
Generated    : ${new Date().toLocaleString('en-IN')}
Case Type    : ${alert.type?.replace(/_/g, ' ').toUpperCase()}
Severity     : ${alert.severity}
Status       : PENDING FIU SUBMISSION

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVESTIGATION NARRATIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${alert.text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGULATORY REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Prevention of Money Laundering Act (PMLA) 2002 — Section 3
- RBI KYC Master Direction 2016
- FIU India Reporting Format STR-1

Submission Deadline: ${new Date(Date.now() + 7 * 864e5).toLocaleDateString('en-IN')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTHORIZED BY: AML Intelligence System v2.0
    `
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `STR-UBI-${alert.type}-${Date.now()}.txt`
    a.click()
    toast.success('STR report downloaded')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #0f2040' }}>
        <div>
          <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.2em', marginBottom: '4px' }}>FRAUD DETECTION ENGINE</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Rajdhani', letterSpacing: '0.05em' }}>ACTIVE ALERTS</h1>
        </div>
        <button onClick={runAnalysis} disabled={loading} style={{
          padding: '9px 20px', borderRadius: '3px', fontSize: '11px', fontWeight: '700',
          background: 'rgba(255,42,74,0.15)', border: '1px solid rgba(255,42,74,0.4)',
          color: '#ff2a4a', letterSpacing: '0.1em'
        }}>
          {loading ? '◌ SCANNING...' : '⚡ RUN FRAUD DETECTION'}
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>◎</div>
          <div style={{ fontSize: '11px', color: '#2a3f5f', letterSpacing: '0.1em' }}>NO ALERTS — RUN DETECTION TO ANALYZE</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map((alert, i) => (
            <div key={i} className="card" style={{
              borderLeft: `2px solid ${alert.severity === 'CRITICAL' ? '#ff2a4a' : '#ffaa00'}`,
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setExpanded(expanded === i ? null : i)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: alert.severity === 'CRITICAL' ? '#ff2a4a' : '#ffaa00',
                    boxShadow: `0 0 8px ${alert.severity === 'CRITICAL' ? '#ff2a4a' : '#ffaa00'}`
                  }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#e8f4ff', letterSpacing: '0.08em' }}>
                      {alert.type?.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '9px', color: '#5a7fa8', marginTop: '2px' }}>
                      {new Date(alert.timestamp).toLocaleString('en-IN')} · PMLA 2002 SECTION 3
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge badge-${alert.severity === 'CRITICAL' ? 'critical' : 'high'}`}>
                    {alert.severity}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); downloadSTR(alert) }} style={{
                    padding: '4px 10px', borderRadius: '2px', fontSize: '9px', fontWeight: '700',
                    background: 'rgba(0,170,255,0.1)', border: '1px solid rgba(0,170,255,0.3)',
                    color: '#00aaff', letterSpacing: '0.1em'
                  }}>
                    ↓ STR
                  </button>
                  <span style={{ color: '#5a7fa8', fontSize: '14px' }}>{expanded === i ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === i && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #0f2040', animation: 'fadeUp 0.3s ease' }}>
                  <pre style={{
                    fontSize: '11px', color: '#8aafd4', whiteSpace: 'pre-wrap',
                    fontFamily: 'JetBrains Mono', lineHeight: '1.8',
                    background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '3px'
                  }}>
                    {alert.text}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}