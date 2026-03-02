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

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, paddingBottom:16, borderBottom:'1px solid #0f2040' }}>
        <div>
          <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.2em', marginBottom:4 }}>TRANSACTION INTELLIGENCE</div>
          <h1 style={{ fontSize:22, fontWeight:700, fontFamily:'Rajdhani, sans-serif', letterSpacing:'0.05em' }}>
            FLOW INTELLIGENCE ENGINE
          </h1>
        </div>
        {!loading && timeData && (
          <div style={{ display:'flex', gap:10 }}>
            {[
              { label:'RAPID CHAINS',    val: timeData.summary.total_chains,    color:'#ff2a4a' },
              { label:'CRITICAL',        val: timeData.summary.critical_chains,  color:'#ff2a4a' },
              { label:'BURST ACCOUNTS',  val: freqData?.summary.total_burst_accounts || 0, color:'#ffaa00' },
              { label:'FASTEST (MIN)',   val: timeData.summary.fastest_chain_minutes, color:'#b44aff' },
            ].map(s => (
              <div key={s.label} style={{ padding:'8px 14px', background:'#080f1e', border:'1px solid #0f2040', borderRadius:3, textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono', color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:8, color:'#5a7fa8', letterSpacing:'0.1em', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'10px 20px', borderRadius:3, fontSize:11, fontWeight:700,
            letterSpacing:'0.08em', cursor:'pointer',
            background: tab === t.id ? 'rgba(0,170,255,0.15)' : 'transparent',
            border: `1px solid ${tab === t.id ? 'rgba(0,170,255,0.4)' : '#0f2040'}`,
            color: tab === t.id ? '#00aaff' : '#5a7fa8'
          }}>
            {t.label}
            <div style={{ fontSize:9, color:'#5a7fa8', fontWeight:400, marginTop:2 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:60, color:'#5a7fa8', fontSize:13 }}>
          LOADING INTELLIGENCE DATA...
        </div>
      )}

      {/* ═══ TAB: TIME LAYER ═══ */}
      {!loading && tab === 'timelayer' && timeData && (
        <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:12 }}>

          {/* Chain list */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:'calc(100vh - 220px)', overflowY:'auto' }}>
            <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:4 }}>
              {timeData.rapid_chains.length} RAPID CHAINS DETECTED
            </div>
            {timeData.rapid_chains.map((chain) => (
              <div key={chain.chain_id}
                onClick={() => setChain(chain)}
                style={{
                  padding:'10px 12px', borderRadius:3, cursor:'pointer',
                  background: selectedChain?.chain_id === chain.chain_id ? '#0c1525' : '#080f1e',
                  border: `1px solid ${selectedChain?.chain_id === chain.chain_id ? SEV_COLOR[chain.severity] : '#0f2040'}`,
                  borderLeft: `3px solid ${SEV_COLOR[chain.severity]}`
                }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:9, fontFamily:'JetBrains Mono', color:'#5a7fa8' }}>{chain.chain_id}</span>
                  <span style={{ fontSize:9, fontWeight:700, color: SEV_COLOR[chain.severity],
                    background: SEV_COLOR[chain.severity] + '20', padding:'1px 6px', borderRadius:2 }}>
                    {chain.severity}
                  </span>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:'#e8f4ff', marginBottom:4 }}>{chain.city}</div>
                <div style={{ display:'flex', gap:12 }}>
                  <div>
                    <div style={{ fontSize:8, color:'#5a7fa8' }}>HOPS</div>
                    <div style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono', color:'#00aaff' }}>{chain.hops}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:8, color:'#5a7fa8' }}>TIME</div>
                    <div style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono', color:'#ffaa00' }}>{chain.time_span_minutes}m</div>
                  </div>
                  <div>
                    <div style={{ fontSize:8, color:'#5a7fa8' }}>AMOUNT</div>
                    <div style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono', color:'#ff2a4a' }}>{fmt(chain.total_amount)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chain detail — timeline */}
          {selectedChain && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              {/* Chain header */}
              <div className="card" style={{ borderLeft:`3px solid ${SEV_COLOR[selectedChain.severity]}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:4 }}>RAPID TRANSFER CHAIN</div>
                    <div style={{ fontSize:18, fontWeight:700, fontFamily:'Rajdhani, sans-serif' }}>
                      {selectedChain.city} — {selectedChain.hops} HOP CHAIN
                    </div>
                    <div style={{ fontSize:11, color:'#8aafd4', marginTop:4 }}>
                      {selectedChain.start_time} → {selectedChain.end_time}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    {[
                      { label:'TOTAL AMOUNT', val: fmt(selectedChain.total_amount), color:'#ff2a4a' },
                      { label:'TIME WINDOW',  val: `${selectedChain.time_span_minutes} min`, color:'#ffaa00' },
                      { label:'HOPS',         val: selectedChain.hops, color:'#00aaff' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign:'center', padding:'8px 14px', background:'rgba(0,0,0,0.3)', border:'1px solid #0f2040', borderRadius:3 }}>
                        <div style={{ fontSize:20, fontWeight:700, fontFamily:'JetBrains Mono', color:s.color }}>{s.val}</div>
                        <div style={{ fontSize:8, color:'#5a7fa8', letterSpacing:'0.1em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visual timeline */}
              <div className="card">
                <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:16 }}>TRANSFER TIMELINE</div>

                {/* Timeline track */}
                <div style={{ position:'relative', paddingBottom:20 }}>
                  {/* Track line */}
                  <div style={{ position:'absolute', top:28, left:30, right:30, height:2, background:'#0f2040' }} />
                  <div style={{ position:'absolute', top:28, left:30,
                    width: `${Math.min(90, 90)}%`,
                    height:2, background:'linear-gradient(90deg, #ff2a4a, #ffaa00)', opacity:0.6 }} />

                  {/* Steps */}
                  <div style={{ display:'flex', justifyContent:'space-between', position:'relative', zIndex:1 }}>
                    {selectedChain.steps.map((step, i) => (
                      <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                        {/* Node */}
                        <div style={{
                          width:56, height:56, borderRadius:'50%',
                          background: i === 0 ? 'rgba(255,42,74,0.15)' :
                                      i === selectedChain.steps.length-1 && selectedChain.has_fraud ? 'rgba(255,42,74,0.15)' :
                                      'rgba(0,170,255,0.1)',
                          border: `2px solid ${i === 0 ? '#ff2a4a' : i === selectedChain.steps.length-1 && selectedChain.has_fraud ? '#ff2a4a' : '#00aaff'}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          flexDirection:'column',
                          boxShadow: `0 0 12px ${i === 0 ? 'rgba(255,42,74,0.4)' : 'rgba(0,170,255,0.2)'}`,
                          marginBottom:8
                        }}>
                          <div style={{ fontSize:9, fontWeight:700, fontFamily:'JetBrains Mono',
                            color: i === 0 ? '#ff2a4a' : '#00aaff' }}>
                            {step.account_id.slice(-4)}
                          </div>
                          <div style={{ fontSize:8, color:'#5a7fa8' }}>#{step.step}</div>
                        </div>

                        {/* Amount */}
                        <div style={{ fontSize:11, fontWeight:700, color:'#e8f4ff', fontFamily:'JetBrains Mono', textAlign:'center' }}>
                          {fmt(step.amount)}
                        </div>

                        {/* Timestamp */}
                        <div style={{ fontSize:8, color:'#5a7fa8', marginTop:2, textAlign:'center' }}>
                          {step.timestamp.split('T')[1]?.slice(0,8)}
                        </div>

                        {/* Channel badge */}
                        <div style={{ fontSize:8, color:'#00e5ff', background:'rgba(0,229,255,0.1)',
                          border:'1px solid rgba(0,229,255,0.2)', padding:'1px 6px', borderRadius:2, marginTop:3 }}>
                          {step.channel}
                        </div>

                        {/* Gap from prev */}
                        {i > 0 && (
                          <div style={{ fontSize:9, color: step.gap_from_prev < 300 ? '#ff2a4a' : '#ffaa00',
                            fontWeight:700, marginTop:4, fontFamily:'JetBrains Mono' }}>
                            +{fmtSec(step.gap_from_prev)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Amount bar chart per step */}
              <div className="card">
                <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:12 }}>AMOUNT PER HOP</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={selectedChain.steps} barSize={40}>
                    <XAxis dataKey="account_id" tickFormatter={v => v.slice(-6)}
                      stroke="#0f2040" tick={{ fontSize:9, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }} />
                    <YAxis stroke="#0f2040" tick={{ fontSize:9, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }}
                      tickFormatter={v => fmt(v)} />
                    <Tooltip formatter={(v) => fmt(v)}
                      contentStyle={{ background:'#080f1e', border:'1px solid #0f2040', borderRadius:3,
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

      {/* ═══ TAB: FREQUENCY ═══ */}
      {!loading && tab === 'frequency' && freqData && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

          {/* Hourly heatmap */}
          <div className="card">
            <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:12 }}>
              HOURLY TRANSACTION DISTRIBUTION
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={freqData.hourly_distribution} barSize={18}>
                <XAxis dataKey="label" stroke="#0f2040"
                  tick={{ fontSize:8, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }}
                  interval={2} />
                <YAxis stroke="#0f2040" tick={{ fontSize:9, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }} />
                <Tooltip contentStyle={{ background:'#080f1e', border:'1px solid #0f2040', borderRadius:3,
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

          {/* Daily volume line chart */}
          <div className="card">
            <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:12 }}>
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
                <XAxis dataKey="date" stroke="#0f2040"
                  tick={{ fontSize:8, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }}
                  tickFormatter={v => v.slice(5)} interval={4} />
                <YAxis stroke="#0f2040" tick={{ fontSize:9, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }} />
                <Tooltip contentStyle={{ background:'#080f1e', border:'1px solid #0f2040', borderRadius:3,
                  fontFamily:'JetBrains Mono', fontSize:11 }} />
                <Area type="monotone" dataKey="count" stroke="#00aaff" fill="url(#dailyGrad)"
                  strokeWidth={1.5} name="Transactions" />
                <Area type="monotone" dataKey="fraud" stroke="#ff2a4a" fill="url(#fraudGrad)"
                  strokeWidth={1.5} name="Fraud" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Burst accounts table */}
          <div className="card" style={{ gridColumn:'span 2' }}>
            <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:12 }}>
              BURST ACCOUNTS — {freqData.burst_accounts.length} ACCOUNTS WITH RAPID TRANSACTION SPIKES
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {freqData.burst_accounts.slice(0, 8).map((acc, i) => (
                <div key={i} style={{
                  padding:'12px', borderRadius:3,
                  background: acc.severity === 'CRITICAL' ? 'rgba(255,42,74,0.06)' :
                               acc.severity === 'HIGH' ? 'rgba(255,170,0,0.06)' : 'rgba(0,170,255,0.06)',
                  border: `1px solid ${SEV_COLOR[acc.severity]}40`
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:9, fontFamily:'JetBrains Mono', color:'#5a7fa8' }}>
                      {acc.account_id.slice(-8)}
                    </span>
                    <span style={{ fontSize:9, fontWeight:700, color: SEV_COLOR[acc.severity] }}>
                      {acc.severity}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:'#8aafd4', marginBottom:6 }}>{acc.city}</div>
                  <div style={{ display:'flex', gap:10 }}>
                    <div>
                      <div style={{ fontSize:8, color:'#5a7fa8' }}>MAX BURST</div>
                      <div style={{ fontSize:18, fontWeight:700, fontFamily:'JetBrains Mono',
                        color: SEV_COLOR[acc.severity] }}>{acc.max_burst}</div>
                      <div style={{ fontSize:8, color:'#5a7fa8' }}>txns/hour</div>
                    </div>
                    <div>
                      <div style={{ fontSize:8, color:'#5a7fa8' }}>TOTAL TXN</div>
                      <div style={{ fontSize:18, fontWeight:700, fontFamily:'JetBrains Mono',
                        color:'#e8f4ff' }}>{acc.txn_count}</div>
                      <div style={{ fontSize:8, color:'#5a7fa8' }}>all time</div>
                    </div>
                  </div>
                  {acc.burst_window && (
                    <div style={{ fontSize:8, color:'#5a7fa8', marginTop:6, fontFamily:'JetBrains Mono' }}>
                      {new Date(acc.burst_window.start).toLocaleTimeString('en-IN', {hour12:false})}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: AMOUNT FLOW ═══ */}
      {!loading && tab === 'amount' && amountData && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:12 }}>

          {/* Top accounts by volume */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Summary row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {[
                { label:'TOTAL CREDITED',  val: fmt(amountData.summary.total_credit),   color:'#00e676' },
                { label:'TOTAL DEBITED',   val: fmt(amountData.summary.total_debit),    color:'#ff2a4a' },
                { label:'NET FLOW',        val: fmt(Math.abs(amountData.summary.net_system_flow)), color:'#ffaa00' },
                { label:'HIGH RISK ACCTS', val: amountData.summary.high_risk_count,      color:'#ff2a4a' },
              ].map(s => (
                <div key={s.label} className="card">
                  <div style={{ fontSize:9, color:'#5a7fa8', marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono', color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Top accounts bar chart */}
            <div className="card">
              <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:12 }}>
                TOP 10 ACCOUNTS BY TRANSACTION VOLUME
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={amountData.summary.top_by_volume}
                  layout="vertical" barSize={14}>
                  <XAxis type="number" stroke="#0f2040"
                    tick={{ fontSize:9, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }}
                    tickFormatter={v => fmt(v)} />
                  <YAxis type="category" dataKey="account_id"
                    tickFormatter={v => v.slice(-8)}
                    stroke="#0f2040"
                    tick={{ fontSize:9, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }}
                    width={80} />
                  <Tooltip formatter={v => fmt(v)}
                    contentStyle={{ background:'#080f1e', border:'1px solid #0f2040', borderRadius:3,
                      fontFamily:'JetBrains Mono', fontSize:11 }} />
                  <Bar dataKey="total_credit" name="Credit" stackId="a" fill="#00e676" radius={[0,2,2,0]} />
                  <Bar dataKey="total_debit" name="Debit" stackId="a" fill="#ff2a4a" radius={[0,2,2,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Net flow chart */}
            <div className="card">
              <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:12 }}>
                NET FLOW PER ACCOUNT (TOP 10) — LARGE NEGATIVES = MONEY LEAVING SYSTEM
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={amountData.summary.top_by_volume} barSize={28}>
                  <XAxis dataKey="account_id" tickFormatter={v => v.slice(-6)}
                    stroke="#0f2040" tick={{ fontSize:9, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }} />
                  <YAxis stroke="#0f2040" tick={{ fontSize:9, fill:'#5a7fa8', fontFamily:'JetBrains Mono' }}
                    tickFormatter={v => fmt(Math.abs(v))} />
                  <ReferenceLine y={0} stroke="#1a3a6b" strokeWidth={1} />
                  <Tooltip formatter={v => fmt(v)}
                    contentStyle={{ background:'#080f1e', border:'1px solid #0f2040', borderRadius:3,
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

          {/* Account detail panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            <div className="card">
              <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:10 }}>
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
                        padding:'10px', borderRadius:3, cursor:'pointer',
                        background: selectedAccount?.account_id === acc.account_id ? '#0c1525' : 'rgba(255,42,74,0.04)',
                        border: `1px solid ${selectedAccount?.account_id === acc.account_id ? '#ff2a4a' : 'rgba(255,42,74,0.15)'}`,
                      }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:10, fontFamily:'JetBrains Mono', color:'#e8f4ff' }}>
                          {acc.account_id}
                        </span>
                        <span style={{ fontSize:9, color:'#ff2a4a', fontWeight:700 }}>HIGH RISK</span>
                      </div>
                      <div style={{ fontSize:10, color:'#8aafd4', marginBottom:4 }}>{acc.city}, {acc.state}</div>
                      <div style={{ display:'flex', gap:10 }}>
                        <div>
                          <div style={{ fontSize:8, color:'#5a7fa8' }}>CREDITED</div>
                          <div style={{ fontSize:11, fontWeight:700, color:'#00e676', fontFamily:'JetBrains Mono' }}>
                            {fmt(acc.total_credit)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize:8, color:'#5a7fa8' }}>DEBITED</div>
                          <div style={{ fontSize:11, fontWeight:700, color:'#ff2a4a', fontFamily:'JetBrains Mono' }}>
                            {fmt(acc.total_debit)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize:8, color:'#5a7fa8' }}>NET</div>
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

            {/* Selected account deep dive */}
            {selectedAccount && (
              <div className="card card-red" style={{ animation:'fadeUp 0.3s ease' }}>
                <div style={{ fontSize:9, color:'#ff2a4a', letterSpacing:'0.15em', marginBottom:10 }}>
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
                    paddingBottom:8, borderBottom:'1px solid #0a1828' }}>
                    <span style={{ fontSize:9, color:'#5a7fa8' }}>{label}</span>
                    <span style={{ fontSize:11, fontWeight:700, fontFamily:'JetBrains Mono',
                      color: color || '#e8f4ff' }}>{val}</span>
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