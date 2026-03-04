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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <div style={{ fontSize: '9px', color: '#6b7280', letterSpacing: '0.18em', marginBottom: '4px' }}>FRAUD DETECTION ENGINE</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Rajdhani, system-ui, sans-serif', letterSpacing: '0.04em', color: '#111827' }}>ACTIVE ALERTS</h1>
        </div>
        <button onClick={runAnalysis} disabled={loading} style={{
          padding: '9px 20px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: '600',
          background: 'rgba(11,94,215,0.06)',
          border: '1px solid rgba(11,94,215,0.45)',
          color: '#0b5ed7',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer'
        }}>
          {loading ? '◌ Scanning...' : '⚡ Run fraud detection'}
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>◎</div>
          <div style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.1em' }}>NO ALERTS — RUN DETECTION TO ANALYZE</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map((alert, i) => (
            <div key={i} className="card" style={{
              borderLeft: `3px solid ${alert.severity === 'CRITICAL' ? '#b91c1c' : '#d97706'}`,
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setExpanded(expanded === i ? null : i)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: alert.severity === 'CRITICAL' ? '#b91c1c' : '#d97706'
                  }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#111827', letterSpacing: '0.08em' }}>
                      {alert.type?.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>
                      {new Date(alert.timestamp).toLocaleString('en-IN')} · PMLA 2002 SECTION 3
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge badge-${alert.severity === 'CRITICAL' ? 'critical' : 'high'}`}>
                    {alert.severity}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); downloadSTR(alert) }} style={{
                    padding: '4px 10px', borderRadius: '999px', fontSize: '9px', fontWeight: '600',
                    background: 'rgba(11,94,215,0.06)', border: '1px solid rgba(11,94,215,0.45)',
                    color: '#0b5ed7', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer'
                  }}>
                    ↓ STR
                  </button>
                  <span style={{ color: '#5a7fa8', fontSize: '14px' }}>{expanded === i ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === i && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e5e7eb', animation: 'fadeUp 0.3s ease' }}>
                  <pre style={{
                    fontSize: '11px', color: '#111827', whiteSpace: 'pre-wrap',
                    fontFamily: 'JetBrains Mono', lineHeight: '1.8',
                    background: '#f9fafb', padding: '14px', borderRadius: '6px'
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