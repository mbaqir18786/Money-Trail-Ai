import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell, LineChart, Line, ReferenceLine
} from 'recharts'

const API = 'http://localhost:5001'

const SEV_COLOR = { CRITICAL: '#ff2a4a', HIGH: '#ffaa00', MEDIUM: '#00aaff', LOW: '#00e676' }

const fmt = (n) => n >= 10000000
  ? `₹${(n/10000000).toFixed(1)}Cr`
  : n >= 100000
  ? `₹${(n/100000).toFixed(1)}L`
  : `₹${Math.round(n).toLocaleString('en-IN')}`

const fmtSec = (s) => s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`

export default function Intelligence() {
  const [tab, setTab]             = useState('timelayer')
  const [amountData, setAmount]   = useState(null)
  const [freqData, setFreq]       = useState(null)
  const [timeData, setTime]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [selectedChain, setChain] = useState(null)
  const [selectedAccount, setAcc] = useState(null)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/amount-flow`),
      axios.get(`${API}/api/frequency`),
      axios.get(`${API}/api/time-layer`)
    ]).then(([a, f, t]) => {
      setAmount(a.data)
      setFreq(f.data)
      setTime(t.data)
      setChain(t.data.rapid_chains?.[0] || null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const tabs = [
    { id: 'timelayer', label: '⏱ TIME LAYER',   sub: 'Rapid transfers' },
    { id: 'frequency', label: '📊 FREQUENCY',    sub: 'Burst detection' },
    { id: 'amount',    label: '₹ AMOUNT FLOW',   sub: 'Volume analysis' },
  ]

  return (
    <div style={{ maxWidth: 1600 }}>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.2em', marginBottom:4 }}>TRANSACTION INTELLIGENCE</div>
          <h1 style={{ fontSize:22, fontWeight:700, fontFamily:'Rajdhani, sans-serif', letterSpacing:'0.05em', color:'#111827' }}>
            FLOW INTELLIGENCE ENGINE
          </h1>
        </div>
        {!loading && timeData && (
          <div style={{ display:'flex', gap:10 }}>
            {[
              { label:'RAPID CHAINS',    val: timeData.summary.total_chains,    color:'#0b5ed7' },
              { label:'CRITICAL',        val: timeData.summary.critical_chains,  color:'#b91c1c' },
              { label:'BURST ACCOUNTS',  val: freqData?.summary.total_burst_accounts || 0, color:'#d97706' },
              { label:'FASTEST (MIN)',   val: timeData.summary.fastest_chain_minutes, color:'#6d28d9' },
            ].map(s => (
              <div
                key={s.label}
                style={{
                  padding: '8px 14px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  textAlign: 'center',
                  boxShadow: '0 4px 10px rgba(15,23,42,0.05)',
                }}
              >
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono', color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:8, color:'#6b7280', letterSpacing:'0.1em', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              background: tab === t.id ? '#e0f2fe' : '#ffffff',
              border: `1px solid ${tab === t.id ? '#60a5fa' : '#d1d5db'}`,
              color: tab === t.id ? '#1d4ed8' : '#4b5563',
            }}
          >
            {t.label}
            <div style={{ fontSize:9, color:'#6b7280', fontWeight:400, marginTop:2 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:60, color:'#6b7280', fontSize:13 }}>
          LOADING INTELLIGENCE DATA...
        </div>
      )}

      {!loading && tab === 'timelayer' && timeData && (
        <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:12 }}>

          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:'calc(100vh - 220px)', overflowY:'auto' }}>
            <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:4 }}>
              {timeData.rapid_chains.length} RAPID CHAINS DETECTED
            </div>
            {timeData.rapid_chains.map((chain) => (
              <div key={chain.chain_id}
                onClick={() => setChain(chain)}
                style={{
                  padding:'10px 12px',
                  borderRadius:8,
                  cursor:'pointer',
                  background: selectedChain?.chain_id === chain.chain_id ? '#e0f2fe' : '#ffffff',
                  border: `1px solid ${selectedChain?.chain_id === chain.chain_id ? SEV_COLOR[chain.severity] : '#e5e7eb'}`,
                  borderLeft: `3px solid ${SEV_COLOR[chain.severity]}`
                }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:9, fontFamily:'JetBrains Mono', color:'#6b7280' }}>{chain.chain_id}</span>
                  <span style={{ fontSize:9, fontWeight:700, color: SEV_COLOR[chain.severity],
                    background: SEV_COLOR[chain.severity] + '20', padding:'1px 6px', borderRadius:999 }}>
                    {chain.severity}
                  </span>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:'#111827', marginBottom:4 }}>{chain.city}</div>
                <div style={{ display:'flex', gap:12 }}>
                  <div>
                    <div style={{ fontSize:8, color:'#6b7280' }}>HOPS</div>
                    <div style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono', color:'#00aaff' }}>{chain.hops}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:8, color:'#6b7280' }}>TIME</div>
                    <div style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono', color:'#ffaa00' }}>{chain.time_span_minutes}m</div>
                  </div>
                  <div>
                    <div style={{ fontSize:8, color:'#6b7280' }}>AMOUNT</div>
                    <div style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono', color:'#ff2a4a' }}>{fmt(chain.total_amount)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedChain && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              <div className="card" style={{ borderLeft:`3px solid ${SEV_COLOR[selectedChain.severity]}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:4 }}>RAPID TRANSFER CHAIN</div>
                    <div style={{ fontSize:18, fontWeight:700, fontFamily:'Rajdhani, sans-serif', color:'#111827' }}>
                      {selectedChain.city} — {selectedChain.hops} HOP CHAIN
                    </div>
                    <div style={{ fontSize:11, color:'#6b7280', marginTop:4 }}>
                      {selectedChain.start_time} → {selectedChain.end_time}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    {[
                      { label:'TOTAL AMOUNT', val: fmt(selectedChain.total_amount), color:'#ff2a4a' },
                      { label:'TIME WINDOW',  val: `${selectedChain.time_span_minutes} min`, color:'#ffaa00' },
                      { label:'HOPS',         val: selectedChain.hops, color:'#00aaff' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign:'center', padding:'8px 14px', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:6 }}>
                        <div style={{ fontSize:20, fontWeight:700, fontFamily:'JetBrains Mono', color:s.color }}>{s.val}</div>
                        <div style={{ fontSize:8, color:'#5a7fa8', letterSpacing:'0.1em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

                <div className="card">
                <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:16 }}>TRANSFER TIMELINE</div>

                <div style={{ position:'relative', paddingBottom:20 }}>
                  <div style={{ position:'absolute', top:28, left:30, right:30, height:2, background:'#e5e7eb' }} />
                  <div style={{ position:'absolute', top:28, left:30,
                    width: `${Math.min(90, 90)}%`,
                    height:2, background:'linear-gradient(90deg, #b91c1c, #d97706)', opacity:0.7 }} />

                  <div style={{ display:'flex', justifyContent:'space-between', position:'relative', zIndex:1 }}>
                    {selectedChain.steps.map((step, i) => (
                      <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                        <div style={{
                          width:56, height:56, borderRadius:'50%',
                          background: i === 0 ? '#fee2e2' :
                                      i === selectedChain.steps.length-1 && selectedChain.has_fraud ? '#fee2e2' :
                                      '#e0f2fe',
                          border: `2px solid ${i === 0 ? '#b91c1c' : i === selectedChain.steps.length-1 && selectedChain.has_fraud ? '#b91c1c' : '#0b5ed7'}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          flexDirection:'column',
                          boxShadow: `0 0 0 ${i === 0 ? 'rgba(248,113,113,0.4)' : 'rgba(59,130,246,0.2)'}`,
                          marginBottom:8
                        }}>
                          <div style={{ fontSize:9, fontWeight:700, fontFamily:'JetBrains Mono',
                            color: i === 0 ? '#b91c1c' : '#0b5ed7' }}>
                            {step.account_id.slice(-4)}
                          </div>
                          <div style={{ fontSize:8, color:'#6b7280' }}>#{step.step}</div>
                        </div>

                        <div style={{ fontSize:11, fontWeight:700, color:'#111827', fontFamily:'JetBrains Mono', textAlign:'center' }}>
                          {fmt(step.amount)}
                        </div>

                        <div style={{ fontSize:8, color:'#6b7280', marginTop:2, textAlign:'center' }}>
                          {step.timestamp.split('T')[1]?.slice(0,8)}
                        </div>

                        <div style={{ fontSize:8, color:'#0b5ed7', background:'#eff6ff',
                          border:'1px solid #bfdbfe', padding:'1px 6px', borderRadius:999, marginTop:3 }}>
                          {step.channel}
                        </div>

                        {i > 0 && (
                          <div style={{ fontSize:9, color: step.gap_from_prev < 300 ? '#b91c1c' : '#d97706',
                            fontWeight:700, marginTop:4, fontFamily:'JetBrains Mono' }}>
                            +{fmtSec(step.gap_from_prev)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:12 }}>AMOUNT PER HOP</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={selectedChain.steps} barSize={40}>
                    <XAxis dataKey="account_id" tickFormatter={v => v.slice(-6)}
                      stroke="#e5e7eb" tick={{ fontSize:9, fill:'#6b7280', fontFamily:'JetBrains Mono' }} />
                    <YAxis stroke="#e5e7eb" tick={{ fontSize:9, fill:'#6b7280', fontFamily:'JetBrains Mono' }}
                      tickFormatter={v => fmt(v)} />
                    <Tooltip formatter={(v) => fmt(v)}
                      contentStyle={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:6,
                        fontFamily:'JetBrains Mono', fontSize:11 }} />
                    <Bar dataKey="amount" radius={[2,2,0,0]}>
                      {selectedChain.steps.map((_, i) => (
                        <Cell key={i}
                          fill={i === 0 ? '#ff2a4a' : i === selectedChain.steps.length-1 ? '#b44aff' : '#00aaff'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'frequency' && freqData && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

          <div className="card">
            <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:12 }}>
              HOURLY TRANSACTION DISTRIBUTION
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={freqData.hourly_distribution} barSize={18}>
                <XAxis dataKey="label" stroke="#e5e7eb"
                  tick={{ fontSize:8, fill:'#6b7280', fontFamily:'JetBrains Mono' }}
                  interval={2} />
                <YAxis stroke="#e5e7eb" tick={{ fontSize:9, fill:'#6b7280', fontFamily:'JetBrains Mono' }} />
                <Tooltip contentStyle={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:6,
                  fontFamily:'JetBrains Mono', fontSize:11 }} />
                <Bar dataKey="count" name="Transactions" radius={[2,2,0,0]}>
                  {freqData.hourly_distribution.map((h, i) => (
                    <Cell key={i} fill={h.fraud_count > 0 ? '#ff2a4a' : h.count > 80 ? '#ffaa00' : '#00aaff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:12, marginTop:8, justifyContent:'center' }}>
              {[['#ff2a4a','Fraud activity'],['#ffaa00','High volume'],['#00aaff','Normal']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:c }} />
                  <span style={{ fontSize:9, color:'#5a7fa8' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:12 }}>
              DAILY TRANSACTION VOLUME
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={freqData.daily_volume.slice(-30)}>
                <defs>
                  <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00aaff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00aaff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff2a4a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff2a4a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#e5e7eb"
                  tick={{ fontSize:8, fill:'#6b7280', fontFamily:'JetBrains Mono' }}
                  tickFormatter={v => v.slice(5)} interval={4} />
                <YAxis stroke="#e5e7eb" tick={{ fontSize:9, fill:'#6b7280', fontFamily:'JetBrains Mono' }} />
                <Tooltip contentStyle={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:6,
                  fontFamily:'JetBrains Mono', fontSize:11 }} />
                <Area type="monotone" dataKey="count" stroke="#00aaff" fill="url(#dailyGrad)"
                  strokeWidth={1.5} name="Transactions" />
                <Area type="monotone" dataKey="fraud" stroke="#ff2a4a" fill="url(#fraudGrad)"
                  strokeWidth={1.5} name="Fraud" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ gridColumn:'span 2' }}>
            <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:12 }}>
              BURST ACCOUNTS — {freqData.burst_accounts.length} ACCOUNTS WITH RAPID TRANSACTION SPIKES
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {freqData.burst_accounts.slice(0, 8).map((acc, i) => (
                <div key={i} style={{
                  padding:'12px', borderRadius:8,
                  background: acc.severity === 'CRITICAL' ? '#fef2f2' :
                               acc.severity === 'HIGH' ? '#fffbeb' : '#eff6ff',
                  border: `1px solid ${SEV_COLOR[acc.severity]}40`
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:9, fontFamily:'JetBrains Mono', color:'#6b7280' }}>
                      {acc.account_id.slice(-8)}
                    </span>
                    <span style={{ fontSize:9, fontWeight:700, color: SEV_COLOR[acc.severity] }}>
                      {acc.severity}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:'#4b5563', marginBottom:6 }}>{acc.city}</div>
                  <div style={{ display:'flex', gap:10 }}>
                    <div>
                      <div style={{ fontSize:8, color:'#6b7280' }}>MAX BURST</div>
                      <div style={{ fontSize:18, fontWeight:700, fontFamily:'JetBrains Mono',
                        color: SEV_COLOR[acc.severity] }}>{acc.max_burst}</div>
                      <div style={{ fontSize:8, color:'#5a7fa8' }}>txns/hour</div>
                    </div>
                    <div>
                      <div style={{ fontSize:8, color:'#6b7280' }}>TOTAL TXN</div>
                      <div style={{ fontSize:18, fontWeight:700, fontFamily:'JetBrains Mono',
                        color:'#e8f4ff' }}>{acc.txn_count}</div>
                      <div style={{ fontSize:8, color:'#5a7fa8' }}>all time</div>
                    </div>
                  </div>
                  {acc.burst_window && (
                    <div style={{ fontSize:8, color:'#6b7280', marginTop:6, fontFamily:'JetBrains Mono' }}>
                      {new Date(acc.burst_window.start).toLocaleTimeString('en-IN', {hour12:false})}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'amount' && amountData && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:12 }}>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {[
                { label:'TOTAL CREDITED',  val: fmt(amountData.summary.total_credit),   color:'#00e676' },
                { label:'TOTAL DEBITED',   val: fmt(amountData.summary.total_debit),    color:'#ff2a4a' },
                { label:'NET FLOW',        val: fmt(Math.abs(amountData.summary.net_system_flow)), color:'#ffaa00' },
                { label:'HIGH RISK ACCTS', val: amountData.summary.high_risk_count,      color:'#ff2a4a' },
              ].map(s => (
                <div key={s.label} className="card">
                  <div style={{ fontSize:9, color:'#6b7280', marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono', color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:12 }}>
                TOP 10 ACCOUNTS BY TRANSACTION VOLUME
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={amountData.summary.top_by_volume}
                  layout="vertical" barSize={14}>
                  <XAxis type="number" stroke="#e5e7eb"
                    tick={{ fontSize:9, fill:'#6b7280', fontFamily:'JetBrains Mono' }}
                    tickFormatter={v => fmt(v)} />
                  <YAxis type="category" dataKey="account_id"
                    tickFormatter={v => v.slice(-8)}
                    stroke="#e5e7eb"
                    tick={{ fontSize:9, fill:'#6b7280', fontFamily:'JetBrains Mono' }}
                    width={80} />
                  <Tooltip formatter={v => fmt(v)}
                    contentStyle={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:6,
                      fontFamily:'JetBrains Mono', fontSize:11 }} />
                  <Bar dataKey="total_credit" name="Credit" stackId="a" fill="#00e676" radius={[0,2,2,0]} />
                  <Bar dataKey="total_debit" name="Debit" stackId="a" fill="#ff2a4a" radius={[0,2,2,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:12 }}>
                NET FLOW PER ACCOUNT (TOP 10) — LARGE NEGATIVES = MONEY LEAVING SYSTEM
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={amountData.summary.top_by_volume} barSize={28}>
                  <XAxis dataKey="account_id" tickFormatter={v => v.slice(-6)}
                    stroke="#e5e7eb" tick={{ fontSize:9, fill:'#6b7280', fontFamily:'JetBrains Mono' }} />
                  <YAxis stroke="#e5e7eb" tick={{ fontSize:9, fill:'#6b7280', fontFamily:'JetBrains Mono' }}
                    tickFormatter={v => fmt(Math.abs(v))} />
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
                  <Tooltip formatter={v => fmt(v)}
                    contentStyle={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:6,
                      fontFamily:'JetBrains Mono', fontSize:11 }} />
                  <Bar dataKey="net_flow" name="Net Flow" radius={[2,2,0,0]}>
                    {amountData.summary.top_by_volume.map((a, i) => (
                      <Cell key={i} fill={a.net_flow < 0 ? '#ff2a4a' : '#00e676'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            <div className="card">
              <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:10 }}>
                HIGH RISK ACCOUNTS — CLICK TO INSPECT
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:480, overflowY:'auto' }}>
                {amountData.accounts
                  .filter(a => a.risk_flag === 'HIGH')
                  .sort((a,b) => (b.total_credit+b.total_debit) - (a.total_credit+a.total_debit))
                  .slice(0, 15)
                  .map((acc, i) => (
                    <div key={i}
                      onClick={() => setAcc(acc)}
                      style={{
                        padding:'10px',
                        borderRadius:8,
                        cursor:'pointer',
                        background: selectedAccount?.account_id === acc.account_id ? '#fee2e2' : '#ffffff',
                        border: `1px solid ${selectedAccount?.account_id === acc.account_id ? '#fecaca' : 'rgba(248,113,113,0.35)'}`,
                      }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:10, fontFamily:'JetBrains Mono', color:'#111827' }}>
                          {acc.account_id}
                        </span>
                        <span style={{ fontSize:9, color:'#b91c1c', fontWeight:700 }}>HIGH RISK</span>
                      </div>
                      <div style={{ fontSize:10, color:'#4b5563', marginBottom:4 }}>{acc.city}, {acc.state}</div>
                      <div style={{ display:'flex', gap:10 }}>
                        <div>
                          <div style={{ fontSize:8, color:'#6b7280' }}>CREDITED</div>
                          <div style={{ fontSize:11, fontWeight:700, color:'#00e676', fontFamily:'JetBrains Mono' }}>
                            {fmt(acc.total_credit)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize:8, color:'#6b7280' }}>DEBITED</div>
                          <div style={{ fontSize:11, fontWeight:700, color:'#ff2a4a', fontFamily:'JetBrains Mono' }}>
                            {fmt(acc.total_debit)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize:8, color:'#6b7280' }}>NET</div>
                          <div style={{ fontSize:11, fontWeight:700,
                            color: acc.net_flow < 0 ? '#ff2a4a' : '#00e676',
                            fontFamily:'JetBrains Mono' }}>
                            {acc.net_flow < 0 ? '-' : '+'}{fmt(Math.abs(acc.net_flow))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {selectedAccount && (
              <div className="card card-red" style={{ animation:'fadeUp 0.3s ease' }}>
                <div style={{ fontSize:9, color:'#b91c1c', letterSpacing:'0.15em', marginBottom:10 }}>
                  ACCOUNT DEEP DIVE
                </div>
                {[
                  { label:'ACCOUNT ID',    val: selectedAccount.account_id },
                  { label:'LOCATION',      val: `${selectedAccount.city}, ${selectedAccount.state}` },
                  { label:'TOTAL CREDIT',  val: fmt(selectedAccount.total_credit),   color:'#00e676' },
                  { label:'TOTAL DEBIT',   val: fmt(selectedAccount.total_debit),    color:'#ff2a4a' },
                  { label:'NET FLOW',      val: (selectedAccount.net_flow < 0 ? '-' : '+') + fmt(Math.abs(selectedAccount.net_flow)),
                    color: selectedAccount.net_flow < 0 ? '#ff2a4a' : '#00e676' },
                  { label:'AVG TXN',       val: fmt(selectedAccount.avg_amount) },
                  { label:'MAX TXN',       val: fmt(selectedAccount.max_amount),     color:'#ffaa00' },
                  { label:'TXN COUNT',     val: selectedAccount.txn_count },
                  { label:'FRAUD TXN',     val: selectedAccount.fraud_count,         color: selectedAccount.fraud_count > 0 ? '#ff2a4a' : '#00e676' },
                  { label:'TOP CHANNEL',   val: Object.entries(selectedAccount.channels || {}).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:8,
                    paddingBottom:8, borderBottom:'1px solid #e5e7eb' }}>
                    <span style={{ fontSize:9, color:'#6b7280' }}>{label}</span>
                    <span style={{ fontSize:11, fontWeight:700, fontFamily:'JetBrains Mono',
                      color: color || '#111827' }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}