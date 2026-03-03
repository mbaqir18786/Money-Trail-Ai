import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import BankApp, { ALL_ACCOUNTS } from '../components/BankApp'
import { useSoundEngine } from '../hooks/useSoundEngine'

const API = 'http://localhost:5001'
const socket = io(API)

// Helper — given an account id, return a short display label
const accName = id => {
  const a = ALL_ACCOUNTS.find(x => x.id === id)
  return a ? `${a.id} (${a.name})` : id
}

const VOLUME_DATA = [
  { t:'06',v:89,s:2  },{t:'07',v:134,s:1 },{t:'08',v:312,s:4 },
  { t:'09',v:521,s:8 },{t:'10',v:689,s:12},{t:'11',v:743,s:7 },
  { t:'12',v:698,s:15},{t:'13',v:812,s:21},{t:'14',v:934,s:31},
  { t:'15',v:756,s:9 },{t:'16',v:623,s:6 },{t:'17',v:445,s:3 },
]
const RISK_DATA = [
  {name:'Mumbai',   risk:78},{name:'Delhi',    risk:62},
  {name:'Bengaluru',risk:45},{name:'Chennai',  risk:38},
  {name:'Hyderabad',risk:55},{name:'Kolkata',  risk:29},
]

export default function Dashboard() {
  const [stats,       setStats]      = useState(null)
  const [alerts,      setAlerts]     = useState([])
  const [liveTxns,    setLiveTxns]   = useState([])
  const [analyzing,   setAnalyzing]  = useState(false)
  const [demoRunning, setDemoRunning]= useState(false)
  const [demoStep,    setDemoStep]   = useState(0)
  const [demoData,    setDemoData]   = useState(null)
  const [riskScore,   setRiskScore]  = useState(0)
  const [alertText,   setAlertText]  = useState('')

  const [muted,       setMuted]      = useState(false)
  const [fullscreen,  setFullscreen] = useState(false)
  const [showBank,    setShowBank]   = useState(false)
  const [fraudState,  setFraudState] = useState(null)
  const [confidence,  setConfidence] = useState(0)
  const [timer,       setTimer]      = useState(0)
  const [timerActive, setTimerActive]= useState(false)
  const [frozen,      setFrozen]     = useState(false)
  const [transfers,   setTransfers]  = useState([])
  const [cycleInfo,   setCycleInfo]  = useState(null)

  const transfersRef  = useRef([])
  const timerRef      = useRef(null)
  const containerRef  = useRef(null)
  const confIntervalRef = useRef(null)
  const sound         = useSoundEngine()

  // ── socket + stats ─────────────────────────────────────────
  useEffect(() => {
    axios.get(`${API}/api/stats`).then(r => setStats(r.data)).catch(() => {})
    socket.on('transaction:live', txn => {
      setLiveTxns(p => [txn, ...p].slice(0, 10))
    })
    socket.on('alert:generated', alert => {
      setAlerts(p => [alert, ...p])
      toast.error(`🚨 ${alert.type?.replace(/_/g, ' ').toUpperCase()}`)
    })
    return () => { socket.off(); clearInterval(timerRef.current) }
  }, []) // eslint-disable-line

  // ── timer ──────────────────────────────────────────────────
  const startTimer = () => {
    setTimer(0); setTimerActive(true)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }
  const stopTimer = () => {
    clearInterval(timerRef.current); setTimerActive(false)
  }
  const fmtTimer = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── confidence — cancel previous before starting new ───────
  const animateConfidence = useCallback((target) => {
    clearInterval(confIntervalRef.current)
    setConfidence(0)
    let v = 0
    confIntervalRef.current = setInterval(() => {
      v += 2
      setConfidence(Math.min(v, target))
      if (v >= target) clearInterval(confIntervalRef.current)
    }, 25)
  }, [])

  // ── demo helpers ───────────────────────────────────────────
  const typewriterAlert = text => {
    setAlertText('')
    let i = 0
    const iv = setInterval(() => {
      setAlertText(text.slice(0, i++))
      if (i > text.length) { clearInterval(iv); sound.playSuccess() }
    }, 18)
  }

  const runDemo = async () => {
    setDemoRunning(true); setDemoStep(0); setRiskScore(0); setAlertText('')
    const res = await axios.get(`${API}/api/demo`)
    setDemoData(res.data)
    ;[1000,3000,7000,12000,17000,22000].forEach((delay, i) => setTimeout(() => {
      setDemoStep(i + 1)
      if (i === 3) {
        sound.playFraudAlarm()
        let s = 0
        const c = setInterval(() => { s += 2; setRiskScore(s); if (s >= 94) clearInterval(c) }, 30)
      }
      if (i === 4) typewriterAlert(res.data.alert)
      if (i === 5) { sound.playSuccess(); toast.success('📄 Evidence package ready'); setDemoRunning(false) }
    }, delay))
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await axios.post(`${API}/api/analyze`)
      setAlerts(res.data.alerts || [])
      sound.playSuccess()
      toast.success(`✅ ${res.data.alerts?.length || 0} patterns detected`)
    } catch { toast.error('Analysis failed') }
    setAnalyzing(false)
  }

  // ── handleTransfer ─────────────────────────────────────────
  const handleTransfer = useCallback((txnData) => {
    const next = [...transfersRef.current, txnData]
    transfersRef.current = next
    setTransfers([...next])

    const cycle = txnData.cycle ?? null

    if (!cycle) {
      // No cycle yet — monitor only, zero confidence
      setFraudState('building')
      setConfidence(0)
      clearInterval(confIntervalRef.current)
      sound.playWarning()
      toast(
        `${accName(txnData.from_account)} → ${accName(txnData.to_account)} — no cycle yet`,
        { icon: '👁', duration: 2500 }
      )
    } else {
      // Real directed cycle confirmed by DFS
      stopTimer()
      setCycleInfo(cycle)
      setFraudState('detected')
      sound.playFraudAlarm()       // once
      animateConfidence(94)        // only now

      toast.error(`🚨 LOOP: ${cycle.join(' → ')}`)

      axios.post(`${API}/api/analyze`).then(r => {
        setAlerts(r.data.alerts || [])
        sound.playSuccess()
        toast.success('📄 STR Report ready for FIU-IND')
      }).catch(() => {})
    }
  }, [sound, animateConfidence])

  // ── freeze ─────────────────────────────────────────────────
  const freezeAccounts = () => {
    setFrozen(true)
    sound.playFreeze()
    setFraudState('frozen')
    const accs = cycleInfo ? [...new Set(cycleInfo)].map(accName).join(', ') : '—'
    toast.success(`🔒 Frozen: ${accs}`)
  }

  // ── reset ──────────────────────────────────────────────────
  const resetBankDemo = () => {
    transfersRef.current = []
    setTransfers([])
    setFraudState(null); setConfidence(0)
    setFrozen(false); setTimer(0); setCycleInfo(null)
    clearInterval(confIntervalRef.current)
    stopTimer()
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen(); setFullscreen(true)
    } else {
      document.exitFullscreen(); setFullscreen(false)
    }
  }

  return (
    <div ref={containerRef} style={{ maxWidth: 1600 }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, paddingBottom:16, borderBottom:'1px solid #0f2040', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.2em', marginBottom:4 }}>AML INTELLIGENCE PLATFORM</div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#e8f4ff', fontFamily:'Rajdhani, sans-serif', letterSpacing:'0.05em' }}>
            COMMAND CENTER
          </h1>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>

          {timerActive && (
            <div style={{ padding:'6px 12px', borderRadius:3, background:'rgba(255,42,74,0.1)', border:'1px solid rgba(255,42,74,0.4)', fontFamily:'JetBrains Mono', fontSize:16, fontWeight:700, color:'#ff2a4a', minWidth:80, textAlign:'center' }}>
              ⏱ {fmtTimer(timer)}
            </div>
          )}
          {!timerActive && timer > 0 && (
            <div style={{ padding:'6px 12px', borderRadius:3, background:'rgba(0,230,118,0.1)', border:'1px solid rgba(0,230,118,0.3)', fontFamily:'JetBrains Mono', fontSize:13, fontWeight:700, color:'#00e676' }}>
              ✓ {fmtTimer(timer)}
            </div>
          )}

          <button onClick={() => { const n = !muted; setMuted(n); sound.setMuted(n) }}
            style={{ padding:'7px 12px', borderRadius:3, fontSize:18, cursor:'pointer', background: muted?'rgba(255,170,0,0.15)':'rgba(0,170,255,0.1)', border:`1px solid ${muted?'rgba(255,170,0,0.5)':'rgba(0,170,255,0.3)'}`, color: muted?'#ffaa00':'#00aaff' }}>
            {muted ? '🔇' : '🔊'}
          </button>

          <button onClick={toggleFullscreen} style={{ padding:'7px 12px', borderRadius:3, fontSize:14, cursor:'pointer', background:'rgba(0,170,255,0.05)', border:'1px solid #0f2040', color:'#e8f4ff' }}>
            {fullscreen ? '⊡' : '⛶'}
          </button>

          <button onClick={() => toast.success('📸 Ctrl+P → Save as PDF')} style={{ padding:'7px 12px', borderRadius:3, fontSize:11, fontWeight:700, cursor:'pointer', background:'rgba(180,74,255,0.1)', border:'1px solid rgba(180,74,255,0.3)', color:'#b44aff', letterSpacing:'0.08em' }}>
            📸 CAPTURE
          </button>

          <button onClick={() => { const o = !showBank; setShowBank(o); if (o) resetBankDemo() }}
            style={{ padding:'8px 16px', borderRadius:3, fontSize:11, fontWeight:700, cursor:'pointer', background: showBank?'rgba(0,230,118,0.15)':'rgba(0,230,118,0.08)', border:`1px solid rgba(0,230,118,${showBank?'0.5':'0.25'})`, color:'#00e676', letterSpacing:'0.08em' }}>
            🏦 {showBank ? 'CLOSE APP' : 'LAUNCH BANK APP'}
          </button>

          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, color:'#5a7fa8' }}>THREAT LEVEL</div>
            <div style={{ fontSize:16, fontWeight:700, color:'#ff2a4a' }}>HIGH</div>
          </div>

          <button onClick={runAnalysis} disabled={analyzing} style={{ padding:'8px 16px', borderRadius:3, fontSize:11, fontWeight:700, background:'rgba(0,170,255,0.1)', border:'1px solid rgba(0,170,255,0.3)', color:'#00aaff', letterSpacing:'0.1em', cursor:'pointer' }}>
            {analyzing ? '◌ ANALYZING...' : '◈ RUN ANALYSIS'}
          </button>

          <button onClick={runDemo} disabled={demoRunning} style={{ padding:'8px 20px', borderRadius:3, fontSize:11, fontWeight:700, background: demoRunning?'rgba(255,42,74,0.05)':'rgba(255,42,74,0.15)', border:'1px solid rgba(255,42,74,0.4)', color:'#ff2a4a', letterSpacing:'0.1em', cursor:'pointer', animation: demoRunning?'borderPulse 1s infinite':'none' }}>
            {demoRunning ? `◌ DEMO ${demoStep}/6` : '▶ LIVE DEMO'}
          </button>
        </div>
      </div>

      {/* ── BANK APP SPLIT VIEW ────────────────────────────── */}
      {showBank && (
        <div style={{ display:'grid', gridTemplateColumns:'310px 1fr', gap:16, marginBottom:20, animation:'fadeUp 0.4s ease' }}>

          {/* Phone */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:8, alignSelf:'flex-start' }}>
              UNION BANK — CUSTOMER APP
            </div>
            <div style={{ width:280, height:560, background:'#111', borderRadius:36, padding:'10px 6px', boxShadow:'0 0 0 2px #333, 0 30px 60px rgba(0,0,0,0.8)', position:'relative', flexShrink:0 }}>
              <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', width:70, height:16, background:'#111', borderRadius:10, zIndex:10 }} />
              <div style={{ width:'100%', height:'100%', borderRadius:28, overflow:'hidden', background:'#fff' }}>
                <BankApp onTransfer={handleTransfer} soundEngine={sound} />
              </div>
              <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', width:70, height:4, background:'#444', borderRadius:2 }} />
            </div>

            {/* Transfer edges */}
            {transfers.length > 0 && (
              <div style={{ marginTop:10, width:280, padding:'10px 12px',
                background: fraudState==='detected'||fraudState==='frozen' ? 'rgba(255,42,74,0.08)' : 'rgba(255,170,0,0.06)',
                border:`1px solid ${fraudState==='detected'||fraudState==='frozen' ? 'rgba(255,42,74,0.35)' : 'rgba(255,170,0,0.25)'}`,
                borderRadius:6 }}>
                <div style={{ fontSize:9, color:'#5a7fa8', marginBottom:6, letterSpacing:'0.1em' }}>
                  GRAPH EDGES ({transfers.length})
                </div>
                {transfers.map((t, i) => (
                  <div key={i} style={{ fontSize:10, fontFamily:'JetBrains Mono', marginBottom:4,
                    color: t.cycle ? '#ff2a4a' : '#8aafd4', display:'flex', gap:4, alignItems:'center' }}>
                    <span style={{ color:'#5a7fa8', fontSize:9 }}>#{i+1}</span>
                    <span style={{ color:'#00aaff' }}>{t.from_account}</span>
                    <span style={{ color:'#2a3f5f' }}>→</span>
                    <span style={{ color: t.cycle ? '#ff2a4a' : '#ffaa00' }}>{t.to_account}</span>
                    {t.cycle && <span style={{ fontSize:9, color:'#ff2a4a', marginLeft:'auto' }}>🔴</span>}
                  </div>
                ))}
                {cycleInfo && (
                  <div style={{ marginTop:8, padding:'6px 8px', background:'rgba(255,42,74,0.1)', borderRadius:4, border:'1px solid rgba(255,42,74,0.3)' }}>
                    <div style={{ fontSize:8, color:'#ff2a4a', fontWeight:700, marginBottom:3 }}>CONFIRMED CYCLE</div>
                    <div style={{ fontSize:9, fontFamily:'JetBrains Mono', color:'#ff2a4a', wordBreak:'break-all', animation:'blink 0.8s infinite' }}>
                      {cycleInfo.join(' → ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SENTINEL panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ padding:20, borderRadius:4,
              background: fraudState==='detected'||fraudState==='frozen' ? 'rgba(255,42,74,0.06)' : fraudState==='building' ? 'rgba(255,170,0,0.04)' : '#080f1e',
              border:`1px solid ${fraudState==='detected'||fraudState==='frozen' ? 'rgba(255,42,74,0.4)' : fraudState==='building' ? 'rgba(255,170,0,0.25)' : '#0f2040'}`,
              animation: fraudState==='detected' ? 'borderPulse 1s infinite' : 'none' }}>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:4 }}>REAL-TIME FRAUD DETECTION</div>
                  <div style={{ fontSize:18, fontWeight:700, fontFamily:'Rajdhani, sans-serif', color:'#e8f4ff' }}>
                    {fraudState==='frozen'    ? '🔒 ACCOUNTS FROZEN'
                    : fraudState==='detected' ? '🚨 CIRCULAR LOOP CONFIRMED'
                    : fraudState==='building' ? '👁  MONITORING — NO CYCLE YET'
                    :                           '👁  MONITORING ALL TRANSACTIONS'}
                  </div>
                  {fraudState === 'building' && (
                    <div style={{ fontSize:11, color:'#ffaa00', marginTop:6 }}>
                      {transfers.length} edge{transfers.length !== 1 ? 's' : ''} recorded — waiting for cycle to close
                    </div>
                  )}
                </div>

                {/* Score — only on confirmed cycle */}
                {confidence > 0 && (fraudState==='detected'||fraudState==='frozen') && (
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:52, fontWeight:700, fontFamily:'JetBrains Mono', lineHeight:1, color:'#ff2a4a', textShadow:'0 0 30px rgba(255,42,74,0.6)' }}>
                      {confidence}
                    </div>
                    <div style={{ fontSize:9, color:'#5a7fa8' }}>RISK SCORE / 100</div>
                  </div>
                )}
              </div>

              {/* Confidence bar — only on confirmed cycle */}
              {confidence > 0 && (fraudState==='detected'||fraudState==='frozen') && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:9, color:'#5a7fa8' }}>FRAUD CONFIDENCE</span>
                    <span style={{ fontSize:9, fontWeight:700, color:'#ff2a4a' }}>{confidence}%</span>
                  </div>
                  <div style={{ height:6, background:'#0f2040', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${confidence}%`,
                      background:'linear-gradient(90deg,#ffaa00,#ff2a4a)',
                      boxShadow:'0 0 12px rgba(255,42,74,0.6)', transition:'width 0.1s linear' }} />
                  </div>
                </div>
              )}

              {/* Details — only on confirmed cycle */}
              {(fraudState==='detected'||fraudState==='frozen') && cycleInfo && (
                <>
                  <div style={{ padding:'10px 14px', background:'rgba(255,42,74,0.06)', border:'1px solid rgba(255,42,74,0.25)', borderRadius:4, marginBottom:14 }}>
                    <div style={{ fontSize:8, color:'#ff2a4a', fontWeight:700, letterSpacing:'0.1em', marginBottom:5 }}>CONFIRMED LOOP PATH</div>
                    <div style={{ fontSize:12, fontFamily:'JetBrains Mono', color:'#ff2a4a', wordBreak:'break-all' }}>
                      {cycleInfo.join(' → ')}
                    </div>
                    <div style={{ fontSize:10, color:'#8aafd4', marginTop:6 }}>
                      {cycleInfo.map(accName).join(' → ')}
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                    {[
                      { label:'PATTERN', val:'CIRCULAR LAYERING',                                        color:'#ff2a4a' },
                      { label:'HOPS',    val:`${cycleInfo.length - 1} HOP${cycleInfo.length-1!==1?'S':''}`, color:'#ffaa00' },
                      { label:'TIME',    val: fmtTimer(timer),                                           color:'#b44aff' },
                      { label:'PMLA',    val:'SECTION 3',                                                color:'#00aaff' },
                    ].map(s => (
                      <div key={s.label} style={{ padding:10, background:'rgba(0,0,0,0.3)', borderRadius:3, border:'1px solid #0f2040' }}>
                        <div style={{ fontSize:8, color:'#5a7fa8', marginBottom:4 }}>{s.label}</div>
                        <div style={{ fontSize:11, fontWeight:700, color:s.color, fontFamily:'JetBrains Mono' }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {fraudState==='detected' && !frozen && (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={freezeAccounts} style={{ flex:1, padding:10, borderRadius:3, fontSize:11, fontWeight:700, cursor:'pointer', background:'rgba(255,42,74,0.15)', border:'1px solid rgba(255,42,74,0.4)', color:'#ff2a4a', letterSpacing:'0.1em' }}>
                    🔒 FREEZE ACCOUNTS
                  </button>
                  <button onClick={() => { sound.playSuccess(); toast.success('📄 STR filed with FIU India') }} style={{ flex:1, padding:10, borderRadius:3, fontSize:11, fontWeight:700, cursor:'pointer', background:'rgba(180,74,255,0.15)', border:'1px solid rgba(180,74,255,0.4)', color:'#b44aff', letterSpacing:'0.1em' }}>
                    📄 FILE STR REPORT
                  </button>
                </div>
              )}

              {fraudState==='frozen' && (
                <div style={{ textAlign:'center', padding:20, background:'rgba(0,230,118,0.05)', border:'1px solid rgba(0,230,118,0.25)', borderRadius:3 }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>🔒</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'#00e676', marginBottom:4 }}>ACCOUNTS FROZEN</div>
                  <div style={{ fontSize:11, color:'#8aafd4', marginBottom:8 }}>
                    {cycleInfo ? [...new Set(cycleInfo)].join(' · ') : '—'}
                  </div>
                  <div style={{ fontSize:10, color:'#5a7fa8' }}>Detected in {fmtTimer(timer)} · STR filed · FIU notified</div>
                </div>
              )}

              {fraudState && (
                <button onClick={resetBankDemo} style={{ marginTop:10, padding:6, width:'100%', borderRadius:3, background:'transparent', border:'1px solid #0f2040', color:'#5a7fa8', fontSize:10, cursor:'pointer' }}>
                  ↺ RESET DEMO
                </button>
              )}
            </div>

            {/* Instructions */}
            {!fraudState && (
              <div style={{ padding:16, borderRadius:4, background:'#080f1e', border:'1px solid #0f2040' }}>
                <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:12 }}>HOW TO TRIGGER LOOP DETECTION</div>
                {[
                  { n:'1', text:'ACC001 → ACC002  (Transfer)' },
                  { n:'2', text:'ACC002 → ACC003  (Transfer)' },
                  { n:'3', text:'ACC003 → ACC001  → 🚨 LOOP CONFIRMED' },
                ].map(s => (
                  <div key={s.n} style={{ display:'flex', gap:10, marginBottom:10 }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, background:'rgba(0,170,255,0.12)', border:'1px solid rgba(0,170,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#00aaff' }}>{s.n}</div>
                    <div style={{ fontSize:11, color:'#8aafd4', paddingTop:4, fontFamily:'JetBrains Mono' }}>{s.text}</div>
                  </div>
                ))}
                <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(0,170,255,0.05)', border:'1px solid rgba(0,170,255,0.15)', borderRadius:4, fontSize:10, color:'#5a7fa8' }}>
                  Unrelated transfers (A→B, C→D) or fan-out (A→B, A→C) = NOT fraud
                </div>
              </div>
            )}

            {alerts.length > 0 && fraudState && (
              <div style={{ padding:14, borderRadius:4, background:'#080f1e', border:'1px solid #0f2040' }}>
                <div style={{ fontSize:9, color:'#ff2a4a', letterSpacing:'0.15em', marginBottom:8 }}>◈ AI INVESTIGATION BRIEF</div>
                <pre style={{ fontSize:11, color:'#8aafd4', whiteSpace:'pre-wrap', fontFamily:'JetBrains Mono', lineHeight:1.7, background:'rgba(0,0,0,0.3)', padding:12, borderRadius:3, maxHeight:140, overflowY:'auto' }}>
                  {alerts[0]?.text?.slice(0, 350)}...
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EXISTING DEMO PANEL ────────────────────────────── */}
      {(demoRunning || demoStep > 0) && demoData && (
        <div style={{ background:'#080f1e', border:'1px solid rgba(255,42,74,0.3)', borderRadius:4, padding:20, marginBottom:20, animation:'fadeUp 0.4s ease' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:9, color:'#ff2a4a', letterSpacing:'0.2em', marginBottom:4 }}>● LIVE DETECTION SEQUENCE</div>
              <div style={{ fontSize:18, fontWeight:700, fontFamily:'Rajdhani, sans-serif', color:'#e8f4ff' }}>CIRCULAR LAYERING — ₹47,00,000</div>
            </div>
            {demoStep >= 4 && (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:48, fontWeight:700, fontFamily:'JetBrains Mono', color:'#ff2a4a', lineHeight:1, textShadow:'0 0 30px rgba(255,42,74,0.6)' }}>{riskScore}</div>
                <div style={{ fontSize:9, color:'#5a7fa8' }}>RISK SCORE / 100</div>
              </div>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:16 }}>
            {[
              {label:'INIT', desc:'Surveillance active'},{label:'SCAN',  desc:'Processing 1000 txns'},
              {label:'FLAG', desc:'4 accounts flagged'}, {label:'SCORE', desc:'Risk: 94/100'},
              {label:'ALERT',desc:'Pattern confirmed'},  {label:'REPORT',desc:'STR ready'},
            ].map((s,i) => (
              <div key={i} style={{ padding:8, borderRadius:3, textAlign:'center', background: demoStep>i?'rgba(255,42,74,0.1)':'rgba(255,255,255,0.02)', border:`1px solid ${demoStep>i?'rgba(255,42,74,0.3)':'#0f2040'}`, transition:'all 0.4s ease' }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color: demoStep>i?'#ff2a4a':'#2a3f5f' }}>{s.label}</div>
                <div style={{ fontSize:9, color: demoStep>i?'#8aafd4':'#2a3f5f', marginTop:2 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          {demoStep >= 3 && (
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
              {demoData.accounts.map(acc => (
                <div key={acc.id} style={{ padding:'10px 14px', borderRadius:3, background:'rgba(255,42,74,0.08)', border:'1px solid rgba(255,42,74,0.3)', minWidth:140 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#ff2a4a', marginBottom:2 }}>{acc.id}</div>
                  <div style={{ fontSize:10, color:'#8aafd4', marginBottom:4 }}>{acc.name}</div>
                  <div style={{ fontSize:9, color:'#5a7fa8' }}>ROLE: <span style={{ color:'#ffaa00' }}>{acc.role?.toUpperCase()}</span></div>
                  <div style={{ fontSize:9, color:'#5a7fa8' }}>RISK: <span style={{ color:'#ff2a4a', fontWeight:700 }}>{acc.risk}/100</span></div>
                </div>
              ))}
              <div style={{ padding:'10px 14px', borderRadius:3, background:'rgba(255,42,74,0.04)', border:'1px solid #0f2040', minWidth:140 }}>
                <div style={{ fontSize:9, color:'#5a7fa8', marginBottom:6 }}>TRANSACTION FLOW</div>
                {demoData.transactions.map((t,i) => (
                  <div key={i} style={{ fontSize:9, color:'#8aafd4', marginBottom:3, fontFamily:'JetBrains Mono' }}>
                    <span style={{ color:'#ff2a4a' }}>{t.from}</span>
                    <span style={{ color:'#2a3f5f' }}> →→ </span>
                    <span style={{ color:'#ffaa00' }}>{t.to}</span>
                    <span style={{ color:'#5a7fa8' }}> ₹{(t.amount/100000).toFixed(0)}L</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {demoStep >= 5 && alertText && (
            <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,42,74,0.2)', borderRadius:3, padding:14 }}>
              <div style={{ fontSize:9, color:'#ff2a4a', fontWeight:700, letterSpacing:'0.15em', marginBottom:8 }}>◈ AI INVESTIGATION BRIEF — GPT-4o</div>
              <pre style={{ fontSize:11, color:'#8aafd4', whiteSpace:'pre-wrap', fontFamily:'JetBrains Mono', lineHeight:1.7 }}>
                {alertText}<span style={{ animation:'blink 0.8s infinite', color:'#00aaff' }}>█</span>
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── STATS ROW ──────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 }}>
        {[
          { label:'TRANSACTIONS', value:stats?.totalTransactions?.toLocaleString()||'1,000', sub:'Total monitored',     color:'#00aaff', icon:'◈' },
          { label:'ACCOUNTS',     value:stats?.totalAccounts?.toLocaleString()    ||'142',   sub:'Unique accounts',     color:'#00e5ff', icon:'◉' },
          { label:'SUSPICIOUS',   value:stats?.suspiciousCount                    ||47,      sub:'Fraud flagged',       color:'#ffaa00', icon:'⚡' },
          { label:'HIGH RISK',    value:stats?.highRiskAccounts                   ||12,      sub:'Under investigation', color:'#ff2a4a', icon:'◎' },
          { label:'ALERTS',       value:alerts.length||stats?.alertsGenerated     ||4,       sub:'AI generated',        color:'#b44aff', icon:'▦' },
        ].map((s,i) => (
          <div key={i} className={`card card-${['','','amber','red','purple'][i]||''}`}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:9, color:'#5a7fa8', letterSpacing:'0.15em', marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:28, fontWeight:700, fontFamily:'JetBrains Mono', color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:9, color:'#5a7fa8', marginTop:6 }}>{s.sub}</div>
              </div>
              <span style={{ fontSize:20, color:s.color, opacity:0.4 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── CHARTS ─────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:12, marginBottom:16 }}>
        <div className="card">
          <div className="section-label">TRANSACTION VOLUME — HOURLY</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={VOLUME_DATA}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00aaff" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00aaff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="susGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff2a4a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ff2a4a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="t" stroke="#0f2040" tick={{fontSize:9,fill:'#5a7fa8',fontFamily:'JetBrains Mono'}}/>
              <YAxis stroke="#0f2040" tick={{fontSize:9,fill:'#5a7fa8',fontFamily:'JetBrains Mono'}}/>
              <Tooltip contentStyle={{background:'#080f1e',border:'1px solid #0f2040',borderRadius:3,fontFamily:'JetBrains Mono',fontSize:11}}/>
              <Area type="monotone" dataKey="v" stroke="#00aaff" strokeWidth={1.5} fill="url(#volGrad)" name="Volume"/>
              <Area type="monotone" dataKey="s" stroke="#ff2a4a" strokeWidth={1.5} fill="url(#susGrad)" name="Suspicious"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-label">CITY RISK INDEX</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={RISK_DATA} layout="vertical">
              <XAxis type="number" stroke="#0f2040" tick={{fontSize:9,fill:'#5a7fa8',fontFamily:'JetBrains Mono'}} domain={[0,100]}/>
              <YAxis type="category" dataKey="name" stroke="#0f2040" tick={{fontSize:9,fill:'#5a7fa8',fontFamily:'JetBrains Mono'}} width={60}/>
              <Tooltip contentStyle={{background:'#080f1e',border:'1px solid #0f2040',borderRadius:3,fontFamily:'JetBrains Mono',fontSize:11}}/>
              <Bar dataKey="risk" radius={[0,2,2,0]}>
                {RISK_DATA.map((d,i) => <Cell key={i} fill={d.risk>70?'#ff2a4a':d.risk>50?'#ffaa00':'#00aaff'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── BOTTOM ROW ─────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:12 }}>
        <div className="card card-red">
          <div className="section-label">ACTIVE FRAUD ALERTS</div>
          {alerts.length === 0 ? (
            <div style={{ textAlign:'center', padding:30, color:'#2a3f5f', fontSize:12 }}>
              NO ALERTS — RUN ANALYSIS OR USE BANK APP DEMO
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:200, overflowY:'auto' }}>
              {alerts.map((alert,i) => (
                <div key={i} style={{ padding:'10px 12px', borderRadius:3, background:'rgba(255,42,74,0.05)', border:'1px solid rgba(255,42,74,0.15)', animation:'fadeUp 0.3s ease' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#ff2a4a', letterSpacing:'0.1em' }}>{alert.type?.replace(/_/g,' ').toUpperCase()}</span>
                    <span className={`badge badge-${alert.severity==='CRITICAL'?'critical':'high'}`}>{alert.severity}</span>
                  </div>
                  <p style={{ fontSize:11, color:'#8aafd4', lineHeight:1.5 }}>{alert.text?.slice(0,120)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="section-label">LIVE TRANSACTION STREAM</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {liveTxns.length === 0 ? (
              <div style={{ color:'#2a3f5f', fontSize:11 }}>AWAITING STREAM...</div>
            ) : liveTxns.map((txn,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', borderRadius:2, fontSize:10, background: txn.suspicious?'rgba(255,42,74,0.06)':'rgba(255,255,255,0.01)', border:`1px solid ${txn.suspicious?'rgba(255,42,74,0.2)':'#0a1828'}`, animation:'fadeUp 0.2s ease' }}>
                <span style={{ color:'#2a3f5f', fontFamily:'JetBrains Mono', fontSize:9 }}>{txn.id?.slice(-8)}</span>
                <span style={{ color: txn.suspicious?'#ff2a4a':'#00e676', fontWeight:700 }}>₹{txn.amount?.toLocaleString('en-IN')}</span>
                <span style={{ color:'#5a7fa8', fontSize:9 }}>{txn.type}</span>
                {txn.suspicious && <span className="badge badge-critical">!</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}