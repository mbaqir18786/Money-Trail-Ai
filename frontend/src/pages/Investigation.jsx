import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = 'http://localhost:5001'

const CASES = [
  { id: 'CASE-UBI-001', type: 'CIRCULAR LAYERING', severity: 'CRITICAL', accounts: ['FRAUD001', 'FRAUD002', 'FRAUD003', 'FRAUD004'], amount: 4700000, window: '12 MIN', status: 'ACTIVE', pmla: 'PMLA 2002 § 3', riskScore: 94 },
  { id: 'CASE-UBI-002', type: 'STRUCTURING', severity: 'HIGH', accounts: ['SBIN0001045'], amount: 1755000, window: '24 HRS', status: 'PENDING', pmla: 'PMLA 2002 § 3', riskScore: 78 },
  { id: 'CASE-UBI-003', type: 'DORMANT ACTIVATION', severity: 'HIGH', accounts: ['SBIN0000892'], amount: 9200000, window: '1 DAY', status: 'NEW', pmla: 'RBI KYC § 38', riskScore: 82 },
  { id: 'CASE-UBI-004', type: 'RAPID LAYERING', severity: 'HIGH', accounts: ['SBIN0001102', 'SBIN0000341'], amount: 2300000, window: '28 MIN', status: 'NEW', pmla: 'PMLA 2002 § 3', riskScore: 87 },
]

const STATUS_COLOR = { ACTIVE: '#ff2a4a', PENDING: '#ffaa00', NEW: '#00aaff' }

export default function Investigation() {
  const [selected, setSelected] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState(null)
  const [notes, setNotes] = useState('')

  const generateReport = async (c) => {
    setGenerating(true)
    try {
      const res = await axios.post(`${API}/api/report`, {
        caseId: c.id,
        fraudType: c.type.toLowerCase().replace(/ /g, '_'),
        findings: { accounts: c.accounts, amount: c.amount, timeWindow: c.window }
      })
      setReport(res.data)
      toast.success('FIU Report generated')
    } catch { toast.error('Generation failed') }
    setGenerating(false)
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #0f2040' }}>
        <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.2em', marginBottom: '4px' }}>CASE MANAGEMENT</div>
        <h1 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Rajdhani', letterSpacing: '0.05em' }}>INVESTIGATION PANEL</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '380px 1fr' : '1fr', gap: '12px' }}>

        {/* Case list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {CASES.map(c => (
            <div key={c.id} className="card" onClick={() => { setSelected(c); setReport(null) }}
              style={{
                cursor: 'pointer', transition: 'all 0.15s',
                borderLeft: `2px solid ${c.severity === 'CRITICAL' ? '#ff2a4a' : '#ffaa00'}`,
                background: selected?.id === c.id ? '#0c1525' : '#080f1e'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '9px', color: '#5a7fa8', fontFamily: 'JetBrains Mono' }}>{c.id}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className={`badge badge-${c.severity === 'CRITICAL' ? 'critical' : 'high'}`}>{c.severity}</span>
                  <span className="badge badge-info" style={{ color: STATUS_COLOR[c.status], borderColor: STATUS_COLOR[c.status] + '44', background: STATUS_COLOR[c.status] + '15' }}>
                    {c.status}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'Rajdhani', letterSpacing: '0.05em', marginBottom: '6px', color: '#e8f4ff' }}>
                {c.type}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#5a7fa8' }}>AMOUNT</div>
                  <div style={{ fontSize: '11px', color: '#00aaff', fontWeight: '700' }}>₹{(c.amount / 100000).toFixed(1)}L</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#5a7fa8' }}>WINDOW</div>
                  <div style={{ fontSize: '11px', color: '#e8f4ff', fontWeight: '700' }}>{c.window}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#5a7fa8' }}>RISK</div>
                  <div style={{ fontSize: '11px', color: '#ff2a4a', fontWeight: '700' }}>{c.riskScore}/100</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#5a7fa8' }}>ACCOUNTS</div>
                  <div style={{ fontSize: '11px', color: '#e8f4ff', fontWeight: '700' }}>{c.accounts.length}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Case detail */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'slideRight 0.3s ease' }}>

            {/* Case header */}
            <div className="card card-red">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.15em', marginBottom: '4px' }}>{selected.id}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Rajdhani' }}>{selected.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '36px', fontWeight: '700', fontFamily: 'JetBrains Mono', color: '#ff2a4a', lineHeight: 1 }}>{selected.riskScore}</div>
                  <div style={{ fontSize: '9px', color: '#5a7fa8' }}>RISK / 100</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                {[
                  { label: 'TOTAL AMOUNT', value: `₹${selected.amount.toLocaleString('en-IN')}` },
                  { label: 'TIME WINDOW', value: selected.window },
                  { label: 'REGULATORY', value: selected.pmla },
                  { label: 'ACCOUNTS', value: selected.accounts.length + ' involved' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '3px', border: '1px solid #0f2040' }}>
                    <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '11px', color: '#e8f4ff', fontFamily: 'JetBrains Mono' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Accounts involved */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.1em', marginBottom: '6px' }}>ACCOUNTS INVOLVED</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selected.accounts.map(acc => (
                    <span key={acc} style={{
                      padding: '3px 8px', borderRadius: '2px', fontSize: '10px',
                      fontFamily: 'JetBrains Mono', color: '#ff2a4a',
                      background: 'rgba(255,42,74,0.08)', border: '1px solid rgba(255,42,74,0.2)'
                    }}>{acc}</span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => generateReport(selected)} disabled={generating} style={{
                  flex: 1, padding: '9px', borderRadius: '3px', fontSize: '10px', fontWeight: '700',
                  background: 'rgba(180,74,255,0.15)', border: '1px solid rgba(180,74,255,0.4)',
                  color: '#b44aff', letterSpacing: '0.1em'
                }}>
                  {generating ? '◌ GENERATING...' : '◈ GENERATE FIU REPORT'}
                </button>
                <button onClick={() => toast.success('Account freeze order sent to core banking')} style={{
                  flex: 1, padding: '9px', borderRadius: '3px', fontSize: '10px', fontWeight: '700',
                  background: 'rgba(255,42,74,0.15)', border: '1px solid rgba(255,42,74,0.4)',
                  color: '#ff2a4a', letterSpacing: '0.1em'
                }}>
                  ◉ FREEZE ACCOUNTS
                </button>
                <button onClick={() => toast('Case escalated to CISO', { icon: '📤' })} style={{
                  flex: 1, padding: '9px', borderRadius: '3px', fontSize: '10px', fontWeight: '700',
                  background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)',
                  color: '#ffaa00', letterSpacing: '0.1em'
                }}>
                  ⚡ ESCALATE TO CISO
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.15em', marginBottom: '8px' }}>INVESTIGATOR NOTES</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add investigation notes..."
                style={{
                  width: '100%', minHeight: '80px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid #0f2040', borderRadius: '3px', padding: '10px',
                  color: '#8aafd4', fontSize: '11px', fontFamily: 'JetBrains Mono',
                  resize: 'vertical', outline: 'none', lineHeight: '1.6'
                }}
              />
            </div>

            {/* FIU Report */}
            {report && (
              <div className="card card-purple" style={{ animation: 'fadeUp 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#b44aff', letterSpacing: '0.15em', marginBottom: '2px' }}>FIU REPORT GENERATED</div>
                    <div style={{ fontSize: '11px', color: '#e8f4ff', fontFamily: 'JetBrains Mono' }}>{report.reportId}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: '#5a7fa8' }}>DEADLINE</div>
                    <div style={{ fontSize: '11px', color: '#ff2a4a', fontWeight: '700' }}>
                      {new Date(report.fiuSubmissionDeadline).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>
                <pre style={{
                  fontSize: '11px', color: '#8aafd4', whiteSpace: 'pre-wrap',
                  fontFamily: 'JetBrains Mono', lineHeight: '1.7',
                  background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '3px',
                  maxHeight: '200px', overflowY: 'auto'
                }}>
                  {report.alertNarrative}
                </pre>
                <div style={{ fontSize: '9px', color: '#2a3f5f', marginTop: '8px', textAlign: 'right' }}>
                  STATUS: {report.status}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}