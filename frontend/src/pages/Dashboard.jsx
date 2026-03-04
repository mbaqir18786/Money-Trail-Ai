import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import BankApp, { ALL_ACCOUNTS } from '../components/Bankapp'
import { useSoundEngine } from '../hooks/useSoundEngine'

const API = 'http://localhost:5001'
const socket = io(API)

// ── localStorage helpers — survives full page refresh ─────
const LS_KEY = 'moneytrail_frozen'
const lsLoad  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const lsSave  = (arr) => { try { localStorage.setItem(LS_KEY, JSON.stringify(arr)) } catch {} }
const lsClear = () => { try { localStorage.removeItem(LS_KEY) } catch {} }

// ── Helpers ───────────────────────────────────────────────
const accName = id => { const a = ALL_ACCOUNTS.find(x => x.id === id); return a ? `${a.id} (${a.name})` : id }

// ── jsPDF STR generator ───────────────────────────────────
function downloadSTR(cycleInfo, timer, confidence, alerts) {
  const generate = () => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
    const W = 210, M = 20; let y = 20
    const newY = (n=6) => { y += n; if (y > 272) { doc.addPage(); y = 20 } }
    const hr   = () => { doc.setDrawColor(200,200,200); doc.line(M,y,W-M,y); newY(6) }
    const row  = (k,v) => {
      doc.setFont('helvetica','bold'); doc.text(k, M, y)
      doc.setFont('helvetica','normal')
      const lines = doc.splitTextToSize(String(v), 110)
      doc.text(lines, M+55, y); newY(lines.length > 1 ? lines.length*5+2 : 6)
    }
    const sect = (title, r,g,b) => {
      doc.setFillColor(r,g,b); doc.rect(M,y-3,W-M*2,7,'F')
      doc.setTextColor(Math.max(0,r-70),Math.max(0,g-70),Math.max(0,b-70))
      doc.setFontSize(9); doc.setFont('helvetica','bold')
      doc.text(title, M+2, y+2); newY(9)
      doc.setTextColor(40,40,40); doc.setFontSize(8.5); doc.setFont('helvetica','normal')
    }
    const fmtT = s => `${Math.floor(s/60)}m ${s%60}s`

    // Header
    doc.setFillColor(14,20,40); doc.rect(0,0,W,28,'F')
    doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont('helvetica','bold')
    doc.text('SUSPICIOUS TRANSACTION REPORT (STR)', M, 13)
    doc.setFontSize(7.5); doc.setFont('helvetica','normal')
    doc.text('Financial Intelligence Unit — India (FIU-IND) | PMLA 2002', M, 21)
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, W-M, 21, {align:'right'})
    y = 36
    doc.setTextColor(30,58,95); doc.setFontSize(8.5); doc.setFont('helvetica','bold')
    doc.text(`STR Ref: FIU-STR-${Date.now().toString().slice(-10)}`, M, y)
    doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
    doc.text('Classification: STRICTLY CONFIDENTIAL', W-M, y, {align:'right'})
    newY(8); hr()

    sect('SECTION 1 — REPORTING ENTITY', 220,230,255)
    row('Institution:', 'Union Bank of India')
    row('Unit:', 'AML Compliance Cell — Mumbai HQ')
    row('SWIFT:', 'UBININBB')
    row('Report Date:', new Date().toLocaleDateString('en-IN'))
    newY(3); hr()

    sect('SECTION 2 — SUSPECT ACCOUNTS', 255,220,220)
    const suspects = cycleInfo ? [...new Set(cycleInfo)] : []
    suspects.forEach((id,idx) => {
      const acc = ALL_ACCOUNTS.find(a=>a.id===id)
      doc.setFillColor(252,248,248); doc.rect(M,y-2,W-M*2,18,'F')
      doc.setDrawColor(200,80,80); doc.rect(M,y-2,W-M*2,18)
      doc.setTextColor(160,30,30); doc.setFont('helvetica','bold'); doc.setFontSize(8.5)
      doc.text(`Account ${idx+1}: ${id}`, M+3, y+4)
      doc.setTextColor(50,50,50); doc.setFont('helvetica','normal'); doc.setFontSize(8)
      doc.text(`Name: ${acc?.name||'Unknown'}  |  Status: FROZEN  |  PMLA Sec. 3`, M+3, y+10)
      y += 21; newY(2)
    })
    newY(3); hr()

    sect('SECTION 3 — TRANSACTION ANALYSIS', 255,245,210)
    row('Pattern:', 'Circular Layering / Round-tripping')
    row('Loop Path:', cycleInfo ? cycleInfo.join(' → ') : 'N/A')
    row('Hops:', `${cycleInfo ? cycleInfo.length-1 : '?'} transfers in closed loop`)
    row('Detection Time:', timer ? fmtT(timer) : '< 60 seconds')
    row('AI Risk Score:', `${confidence||94}/100 — CRITICAL`)
    row('Structuring:', 'YES — Amounts deliberately below ₹10L reporting threshold')
    newY(3); hr()

    sect('SECTION 4 — LEGAL BASIS', 235,225,255)
    row('PMLA Section 3:', 'Offence of money laundering — concealment of proceeds of crime')
    row('PMLA Section 12:', 'Obligation to report suspicious transactions to FIU-IND')
    row('Action Taken:', 'Accounts frozen, STR filed, case referred to IA')
    newY(3); hr()

    sect('SECTION 5 — AI NARRATIVE', 220,245,225)
    const narrative = alerts[0]?.text ||
      `SENTINEL AI detected a confirmed circular money laundering loop. Funds originated at ${cycleInfo?.[0]||'N/A'} and were layered through ${(cycleInfo?.length||4)-1} accounts before returning to origin. Transfers were structured below the ₹10L mandatory reporting threshold. Risk score: ${confidence||94}/100 — CRITICAL.`
    const nLines = doc.splitTextToSize(narrative, W-M*2-4)
    nLines.forEach(l=>{ doc.text(l,M+2,y); newY(5) })

    const pages = doc.getNumberOfPages()
    for (let i=1;i<=pages;i++) {
      doc.setPage(i)
      doc.setFillColor(14,20,40); doc.rect(0,285,W,12,'F')
      doc.setTextColor(140,160,190); doc.setFontSize(7); doc.setFont('helvetica','normal')
      doc.text('MoneyTrail AI — AML Intelligence Platform | Union Bank of India | STRICTLY CONFIDENTIAL', M, 292)
      doc.text(`Page ${i} of ${pages}`, W-M, 292, {align:'right'})
    }
    doc.save(`STR_Report_${Date.now()}.pdf`)
    toast.success('📄 STR Report downloaded!')
  }
  if (window.jspdf) { generate() }
  else {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    s.onload = generate
    s.onerror = () => toast.error('PDF library failed to load')
    document.head.appendChild(s)
  }
}

// ─────────────────────────────────────────────────────────
const VOLUME_DATA = [
  {t:'06',v:89,s:2},{t:'07',v:134,s:1},{t:'08',v:312,s:4},
  {t:'09',v:521,s:8},{t:'10',v:689,s:12},{t:'11',v:743,s:7},
  {t:'12',v:698,s:15},{t:'13',v:812,s:21},{t:'14',v:934,s:31},
  {t:'15',v:756,s:9},{t:'16',v:623,s:6},{t:'17',v:445,s:3},
]
const RISK_DATA = [
  {name:'Mumbai',risk:78},{name:'Delhi',risk:62},{name:'Bengaluru',risk:45},
  {name:'Chennai',risk:38},{name:'Hyderabad',risk:55},{name:'Kolkata',risk:29},
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

  // ── Core fraud state ──────────────────────────────────────
  const [fraudState,  setFraudState]  = useState(null)       // null | 'building' | 'detected' | 'frozen'
  const [confidence,  setConfidence]  = useState(0)
  const [timer,       setTimer]       = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [transfers,   setTransfers]   = useState([])
  const [cycleInfo,   setCycleInfo]   = useState(null)

  // ── frozenAccounts is a PLAIN ARRAY — easier for React prop comparison
  //    Loaded from localStorage on mount so it survives page refresh
  const [frozenAccounts, setFrozenAccounts] = useState(() => lsLoad())

  const transfersRef    = useRef([])
  const timerRef        = useRef(null)
  const containerRef    = useRef(null)
  const confIntervalRef = useRef(null)
  const sound           = useSoundEngine()

  // Sync frozenAccounts to localStorage whenever it changes
  useEffect(() => {
    if (frozenAccounts.length > 0) {
      lsSave(frozenAccounts)
      // Restore fraudState if we had frozen accounts from a previous session
      if (!fraudState) setFraudState('frozen')
    } else {
      lsClear()
    }
  }, [frozenAccounts])

  useEffect(() => {
    axios.get(`${API}/api/stats`).then(r=>setStats(r.data)).catch(()=>{})
    socket.on('transaction:live', txn=>setLiveTxns(p=>[txn,...p].slice(0,10)))
    socket.on('alert:generated', alert=>{ setAlerts(p=>[alert,...p]); toast.error(`🚨 ${alert.type?.replace(/_/g,' ').toUpperCase()}`) })
    return ()=>{ socket.off(); clearInterval(timerRef.current) }
  }, [])

  const startTimer = () => { setTimer(0); setTimerActive(true); timerRef.current = setInterval(()=>setTimer(t=>t+1),1000) }
  const stopTimer  = () => { clearInterval(timerRef.current); setTimerActive(false) }
  const fmtTimer   = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const animateConfidence = useCallback((target) => {
    clearInterval(confIntervalRef.current); setConfidence(0); let v=0
    confIntervalRef.current = setInterval(()=>{ v+=2; setConfidence(Math.min(v,target)); if(v>=target) clearInterval(confIntervalRef.current) },25)
  },[])

  const typewriterAlert = text => {
    setAlertText(''); let i=0
    const iv=setInterval(()=>{ setAlertText(text.slice(0,i++)); if(i>text.length){clearInterval(iv);sound.playSuccess()} },18)
  }

  const runDemo = async () => {
    setDemoRunning(true); setDemoStep(0); setRiskScore(0); setAlertText('')
    const res=await axios.get(`${API}/api/demo`); setDemoData(res.data)
    ;[1000,3000,7000,12000,17000,22000].forEach((delay,i)=>setTimeout(()=>{
      setDemoStep(i+1)
      if(i===3){sound.playFraudAlarm();let s=0;const c=setInterval(()=>{s+=2;setRiskScore(s);if(s>=94)clearInterval(c)},30)}
      if(i===4) typewriterAlert(res.data.alert)
      if(i===5){sound.playSuccess();toast.success('📄 Evidence package ready');setDemoRunning(false)}
    },delay))
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try{ const res=await axios.post(`${API}/api/analyze`); setAlerts(res.data.alerts||[]); sound.playSuccess(); toast.success(`✅ ${res.data.alerts?.length||0} patterns detected`) }
    catch{ toast.error('Analysis failed') }
    setAnalyzing(false)
  }

  const handleTransfer = useCallback((txnData) => {
    const next=[...transfersRef.current, txnData]; transfersRef.current=next; setTransfers([...next])
    const cycle=txnData.cycle??null
    if(!cycle){
      setFraudState('building'); setConfidence(0); clearInterval(confIntervalRef.current)
      sound.playWarning(); toast(`${accName(txnData.from_account)} → ${accName(txnData.to_account)} — no cycle yet`,{icon:'👁',duration:2500})
    } else {
      stopTimer(); setCycleInfo(cycle); setFraudState('detected'); sound.playFraudAlarm(); animateConfidence(94)
      toast.error(`🚨 LOOP: ${cycle.join(' → ')}`)
      axios.post(`${API}/api/analyze`).then(r=>{setAlerts(r.data.alerts||[]);sound.playSuccess();toast.success('📄 STR Report ready')}).catch(()=>{})
    }
  },[sound, animateConfidence])

  // ── FREEZE — sets frozenAccounts as plain array ───────────
  const freezeAccounts = () => {
    if (!cycleInfo) return
    const newArr = [...new Set(cycleInfo)]   // deduplicated array
    setFrozenAccounts(newArr)               // triggers useEffect → lsSave
    setFraudState('frozen')
    sound.playFreeze()
    toast.success(`🔒 Frozen: ${newArr.map(accName).join(', ')}`)
  }

  // ── UNFREEZE — sets frozenAccounts to empty array ─────────
  // BankApp watches frozenAccounts prop: when it becomes [],
  // the useEffect in BankApp sees anyFrozen=false → navigates home
  const unfreezeAccounts = () => {
    setFrozenAccounts([])                   // [] !== previous array → React re-renders BankApp
    setFraudState('detected')
    sound.playWarning()
    toast(`🔓 Accounts unfrozen — monitoring resumed`, {icon:'⚠️'})
  }

  const resetBankDemo = () => {
    transfersRef.current=[]; setTransfers([]); setFraudState(null)
    setConfidence(0); setTimer(0); setCycleInfo(null)
    setFrozenAccounts([])   // clears localStorage via useEffect
    clearInterval(confIntervalRef.current); stopTimer()
  }

  const toggleFullscreen = () => {
    if(!document.fullscreenElement){containerRef.current?.requestFullscreen();setFullscreen(true)}
    else{document.exitFullscreen();setFullscreen(false)}
  }

  const handleSTRDownload = () => downloadSTR(cycleInfo, timer, confidence, alerts)

  return (
    <div ref={containerRef} style={{ maxWidth:1600 }}>

      {/* HEADER */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,paddingBottom:16,borderBottom:'1px solid #0f2040',flexWrap:'wrap',gap:8 }}>
        <div>
          <div style={{ fontSize:9,color:'#5a7fa8',letterSpacing:'.2em',marginBottom:4 }}>AML INTELLIGENCE PLATFORM</div>
          <h1 style={{ fontSize:22,fontWeight:700,color:'#e8f4ff',fontFamily:'Rajdhani, sans-serif',letterSpacing:'.05em' }}>COMMAND CENTER</h1>
        </div>
        <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
          {timerActive&&<div style={{ padding:'6px 12px',borderRadius:3,background:'rgba(255,42,74,.1)',border:'1px solid rgba(255,42,74,.4)',fontFamily:'JetBrains Mono',fontSize:16,fontWeight:700,color:'#ff2a4a',minWidth:80,textAlign:'center' }}>⏱ {fmtTimer(timer)}</div>}
          {!timerActive&&timer>0&&<div style={{ padding:'6px 12px',borderRadius:3,background:'rgba(0,230,118,.1)',border:'1px solid rgba(0,230,118,.3)',fontFamily:'JetBrains Mono',fontSize:13,fontWeight:700,color:'#00e676' }}>✓ {fmtTimer(timer)}</div>}
          <button onClick={()=>{const n=!muted;setMuted(n);sound.setMuted(n)}} style={{ padding:'7px 12px',borderRadius:3,fontSize:18,cursor:'pointer',background:muted?'rgba(255,170,0,.15)':'rgba(0,170,255,.1)',border:`1px solid ${muted?'rgba(255,170,0,.5)':'rgba(0,170,255,.3)'}`,color:muted?'#ffaa00':'#00aaff' }}>{muted?'🔇':'🔊'}</button>
          <button onClick={toggleFullscreen} style={{ padding:'7px 12px',borderRadius:3,fontSize:14,cursor:'pointer',background:'rgba(0,170,255,.05)',border:'1px solid #0f2040',color:'#e8f4ff' }}>{fullscreen?'⊡':'⛶'}</button>
          <button onClick={()=>setShowBank(b=>!b)} style={{ padding:'8px 16px',borderRadius:3,fontSize:11,fontWeight:700,cursor:'pointer',background:showBank?'rgba(0,230,118,.15)':'rgba(0,230,118,.08)',border:`1px solid rgba(0,230,118,${showBank?.5:.25})`,color:'#00e676',letterSpacing:'.08em' }}>🏦 {showBank?'CLOSE APP':'LAUNCH BANK APP'}</button>
          <div style={{ textAlign:'right' }}><div style={{ fontSize:9,color:'#5a7fa8' }}>THREAT LEVEL</div><div style={{ fontSize:16,fontWeight:700,color:'#ff2a4a' }}>HIGH</div></div>
          <button onClick={runAnalysis} disabled={analyzing} style={{ padding:'8px 16px',borderRadius:3,fontSize:11,fontWeight:700,background:'rgba(0,170,255,.1)',border:'1px solid rgba(0,170,255,.3)',color:'#00aaff',letterSpacing:'.1em',cursor:'pointer' }}>{analyzing?'◌ ANALYZING...':'◈ RUN ANALYSIS'}</button>
          <button onClick={runDemo} disabled={demoRunning} style={{ padding:'8px 20px',borderRadius:3,fontSize:11,fontWeight:700,background:demoRunning?'rgba(255,42,74,.05)':'rgba(255,42,74,.15)',border:'1px solid rgba(255,42,74,.4)',color:'#ff2a4a',letterSpacing:'.1em',cursor:'pointer' }}>{demoRunning?`◌ DEMO ${demoStep}/6`:'▶ LIVE DEMO'}</button>
        </div>
      </div>

      {/* BANK APP */}
      {showBank&&(
        <div style={{ display:'grid',gridTemplateColumns:'310px 1fr',gap:16,marginBottom:20,animation:'fadeUp .4s ease' }}>
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center' }}>
            <div style={{ fontSize:9,color:'#5a7fa8',letterSpacing:'.15em',marginBottom:8,alignSelf:'flex-start' }}>UNION BANK — CUSTOMER APP</div>
            <div style={{ width:280,height:560,background:'#111',borderRadius:36,padding:'10px 6px',boxShadow:'0 0 0 2px #333, 0 30px 60px rgba(0,0,0,.8)',position:'relative',flexShrink:0 }}>
              <div style={{ position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',width:70,height:16,background:'#111',borderRadius:10,zIndex:10 }}/>
              <div style={{ width:'100%',height:'100%',borderRadius:28,overflow:'hidden',background:'#fff' }}>
                {/* ✅ frozenAccounts passed as plain array — React detects changes correctly */}
                <BankApp
                  onTransfer={handleTransfer}
                  soundEngine={sound}
                  frozenAccounts={frozenAccounts}
                />
              </div>
              <div style={{ position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',width:70,height:4,background:'#444',borderRadius:2 }}/>
            </div>
            {transfers.length>0&&(
              <div style={{ marginTop:10,width:280,padding:'10px 12px',background:fraudState==='detected'||fraudState==='frozen'?'rgba(255,42,74,.08)':'rgba(255,170,0,.06)',border:`1px solid ${fraudState==='detected'||fraudState==='frozen'?'rgba(255,42,74,.35)':'rgba(255,170,0,.25)'}`,borderRadius:6 }}>
                <div style={{ fontSize:9,color:'#5a7fa8',marginBottom:6,letterSpacing:'.1em' }}>GRAPH EDGES ({transfers.length})</div>
                {transfers.map((t,i)=>(
                  <div key={i} style={{ fontSize:10,fontFamily:'JetBrains Mono',marginBottom:4,color:t.cycle?'#ff2a4a':'#8aafd4',display:'flex',gap:4,alignItems:'center' }}>
                    <span style={{ color:'#5a7fa8',fontSize:9 }}>#{i+1}</span>
                    <span style={{ color:'#00aaff' }}>{t.from_account}</span>
                    <span style={{ color:'#2a3f5f' }}>→</span>
                    <span style={{ color:t.cycle?'#ff2a4a':'#ffaa00' }}>{t.to_account}</span>
                    {t.cycle&&<span style={{ fontSize:9,color:'#ff2a4a',marginLeft:'auto' }}>🔴</span>}
                  </div>
                ))}
                {cycleInfo&&(
                  <div style={{ marginTop:8,padding:'6px 8px',background:'rgba(255,42,74,.1)',borderRadius:4,border:'1px solid rgba(255,42,74,.3)' }}>
                    <div style={{ fontSize:8,color:'#ff2a4a',fontWeight:700,marginBottom:3 }}>CONFIRMED CYCLE</div>
                    <div style={{ fontSize:9,fontFamily:'JetBrains Mono',color:'#ff2a4a',wordBreak:'break-all' }}>{cycleInfo.join(' → ')}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SENTINEL panel */}
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div style={{ padding:20,borderRadius:4,
              background:fraudState==='detected'||fraudState==='frozen'?'rgba(255,42,74,.06)':fraudState==='building'?'rgba(255,170,0,.04)':'#080f1e',
              border:`1px solid ${fraudState==='detected'||fraudState==='frozen'?'rgba(255,42,74,.4)':fraudState==='building'?'rgba(255,170,0,.25)':'#0f2040'}` }}>

              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:9,color:'#5a7fa8',letterSpacing:'.15em',marginBottom:4 }}>REAL-TIME FRAUD DETECTION</div>
                  <div style={{ fontSize:18,fontWeight:700,fontFamily:'Rajdhani, sans-serif',color:'#e8f4ff' }}>
                    {fraudState==='frozen'?'🔒 ACCOUNTS FROZEN':fraudState==='detected'?'🚨 CIRCULAR LOOP CONFIRMED':fraudState==='building'?'👁  MONITORING — NO CYCLE YET':'👁  MONITORING ALL TRANSACTIONS'}
                  </div>
                  {fraudState==='building'&&<div style={{ fontSize:11,color:'#ffaa00',marginTop:6 }}>{transfers.length} edge{transfers.length!==1?'s':''} recorded — waiting for cycle to close</div>}
                </div>
                {confidence>0&&(fraudState==='detected'||fraudState==='frozen')&&(
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:52,fontWeight:700,fontFamily:'JetBrains Mono',lineHeight:1,color:'#ff2a4a',textShadow:'0 0 30px rgba(255,42,74,.6)' }}>{confidence}</div>
                    <div style={{ fontSize:9,color:'#5a7fa8' }}>RISK SCORE / 100</div>
                  </div>
                )}
              </div>

              {confidence>0&&(fraudState==='detected'||fraudState==='frozen')&&(
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                    <span style={{ fontSize:9,color:'#5a7fa8' }}>FRAUD CONFIDENCE</span>
                    <span style={{ fontSize:9,fontWeight:700,color:'#ff2a4a' }}>{confidence}%</span>
                  </div>
                  <div style={{ height:6,background:'#0f2040',borderRadius:3,overflow:'hidden' }}>
                    <div style={{ height:'100%',borderRadius:3,width:`${confidence}%`,background:'linear-gradient(90deg,#ffaa00,#ff2a4a)',transition:'width .1s linear' }}/>
                  </div>
                </div>
              )}

              {(fraudState==='detected'||fraudState==='frozen')&&cycleInfo&&(
                <>
                  <div style={{ padding:'10px 14px',background:'rgba(255,42,74,.06)',border:'1px solid rgba(255,42,74,.25)',borderRadius:4,marginBottom:14 }}>
                    <div style={{ fontSize:8,color:'#ff2a4a',fontWeight:700,letterSpacing:'.1em',marginBottom:5 }}>CONFIRMED LOOP PATH</div>
                    <div style={{ fontSize:12,fontFamily:'JetBrains Mono',color:'#ff2a4a',wordBreak:'break-all' }}>{cycleInfo.join(' → ')}</div>
                    <div style={{ fontSize:10,color:'#8aafd4',marginTop:6 }}>{cycleInfo.map(accName).join(' → ')}</div>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16 }}>
                    {[{l:'PATTERN',v:'CIRCULAR LAYERING',c:'#ff2a4a'},{l:'HOPS',v:`${cycleInfo.length-1} HOP${cycleInfo.length-1!==1?'S':''}`,c:'#ffaa00'},{l:'TIME',v:fmtTimer(timer),c:'#b44aff'},{l:'PMLA',v:'SECTION 3',c:'#00aaff'}].map(s=>(
                      <div key={s.l} style={{ padding:10,background:'rgba(0,0,0,.3)',borderRadius:3,border:'1px solid #0f2040' }}>
                        <div style={{ fontSize:8,color:'#5a7fa8',marginBottom:4 }}>{s.l}</div>
                        <div style={{ fontSize:11,fontWeight:700,color:s.c,fontFamily:'JetBrains Mono' }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* DETECTED — Freeze + STR */}
              {fraudState==='detected'&&frozenAccounts.length===0&&(
                <div style={{ display:'flex',gap:8 }}>
                  <button onClick={freezeAccounts} style={{ flex:1,padding:10,borderRadius:3,fontSize:11,fontWeight:700,cursor:'pointer',background:'rgba(255,42,74,.15)',border:'1px solid rgba(255,42,74,.4)',color:'#ff2a4a',letterSpacing:'.1em' }}>🔒 FREEZE ACCOUNTS</button>
                  <button onClick={handleSTRDownload} style={{ flex:1,padding:10,borderRadius:3,fontSize:11,fontWeight:700,cursor:'pointer',background:'rgba(180,74,255,.15)',border:'1px solid rgba(180,74,255,.4)',color:'#b44aff',letterSpacing:'.1em' }}>📄 FILE STR REPORT</button>
                </div>
              )}

              {/* FROZEN — Unfreeze + STR */}
              {fraudState==='frozen'&&(
                <div style={{ animation:'fadeUp .4s ease' }}>
                  <div style={{ padding:'16px 18px',background:'rgba(0,230,118,.05)',border:'1px solid rgba(0,230,118,.25)',borderRadius:3,marginBottom:10 }}>
                    <div style={{ textAlign:'center',marginBottom:12 }}>
                      <div style={{ fontSize:36,marginBottom:6 }}>🔒</div>
                      <div style={{ fontSize:15,fontWeight:700,color:'#00e676',marginBottom:3 }}>ACCOUNTS FROZEN</div>
                      <div style={{ fontSize:10,color:'#5a7fa8' }}>STR filed · FIU notified · {fmtTimer(timer)} detection time</div>
                    </div>
                    <div style={{ display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap',marginBottom:14 }}>
                      {frozenAccounts.map(acc=>(
                        <div key={acc} style={{ padding:'4px 10px',borderRadius:20,background:'rgba(255,42,74,.12)',border:'1px solid rgba(255,42,74,.35)',fontSize:10,color:'#ff2a4a',fontFamily:'JetBrains Mono' }}>🔒 {acc}</div>
                      ))}
                    </div>
                    {/* ✅ UNFREEZE button */}
                    <button onClick={unfreezeAccounts}
                      style={{ width:'100%',padding:'11px 16px',borderRadius:3,fontSize:12,fontWeight:700,cursor:'pointer',background:'rgba(255,170,0,.2)',border:'2px solid rgba(255,170,0,.7)',color:'#ffaa00',letterSpacing:'.08em' }}>
                      🔓 UNFREEZE ACCOUNTS
                    </button>
                  </div>
                  {/* ✅ STR PDF download */}
                  <button onClick={handleSTRDownload}
                    style={{ width:'100%',padding:10,borderRadius:3,fontSize:11,fontWeight:700,cursor:'pointer',background:'rgba(180,74,255,.15)',border:'1px solid rgba(180,74,255,.4)',color:'#b44aff',letterSpacing:'.1em' }}>
                    📄 DOWNLOAD STR REPORT (PDF)
                  </button>
                </div>
              )}

              {fraudState&&<button onClick={resetBankDemo} style={{ marginTop:10,padding:6,width:'100%',borderRadius:3,background:'transparent',border:'1px solid #0f2040',color:'#5a7fa8',fontSize:10,cursor:'pointer' }}>↺ RESET DEMO</button>}
            </div>

            {!fraudState&&(
              <div style={{ padding:16,borderRadius:4,background:'#080f1e',border:'1px solid #0f2040' }}>
                <div style={{ fontSize:9,color:'#5a7fa8',letterSpacing:'.15em',marginBottom:12 }}>HOW TO TRIGGER LOOP DETECTION</div>
                {[{n:'1',t:'ACC001 → ACC002  (Transfer)'},{n:'2',t:'ACC002 → ACC003  (Transfer)'},{n:'3',t:'ACC003 → ACC001  → 🚨 LOOP CONFIRMED'}].map(s=>(
                  <div key={s.n} style={{ display:'flex',gap:10,marginBottom:10 }}>
                    <div style={{ width:22,height:22,borderRadius:'50%',flexShrink:0,background:'rgba(0,170,255,.12)',border:'1px solid rgba(0,170,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#00aaff' }}>{s.n}</div>
                    <div style={{ fontSize:11,color:'#8aafd4',paddingTop:4,fontFamily:'JetBrains Mono' }}>{s.t}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEMO PANEL */}
      {(demoRunning||demoStep>0)&&demoData&&(
        <div style={{ background:'#080f1e',border:'1px solid rgba(255,42,74,.3)',borderRadius:4,padding:20,marginBottom:20,animation:'fadeUp .4s ease' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
            <div><div style={{ fontSize:9,color:'#ff2a4a',letterSpacing:'.2em',marginBottom:4 }}>● LIVE DETECTION SEQUENCE</div><div style={{ fontSize:18,fontWeight:700,fontFamily:'Rajdhani, sans-serif',color:'#e8f4ff' }}>CIRCULAR LAYERING — ₹47,00,000</div></div>
            {demoStep>=4&&<div style={{ textAlign:'center' }}><div style={{ fontSize:48,fontWeight:700,fontFamily:'JetBrains Mono',color:'#ff2a4a',lineHeight:1 }}>{riskScore}</div><div style={{ fontSize:9,color:'#5a7fa8' }}>RISK SCORE / 100</div></div>}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8,marginBottom:16 }}>
            {[{l:'INIT',d:'Surveillance active'},{l:'SCAN',d:'Processing 1000 txns'},{l:'FLAG',d:'4 accounts flagged'},{l:'SCORE',d:'Risk: 94/100'},{l:'ALERT',d:'Pattern confirmed'},{l:'REPORT',d:'STR ready'}].map((s,i)=>(
              <div key={i} style={{ padding:8,borderRadius:3,textAlign:'center',background:demoStep>i?'rgba(255,42,74,.1)':'rgba(255,255,255,.02)',border:`1px solid ${demoStep>i?'rgba(255,42,74,.3)':'#0f2040'}`,transition:'all .4s ease' }}>
                <div style={{ fontSize:9,fontWeight:700,color:demoStep>i?'#ff2a4a':'#2a3f5f' }}>{s.l}</div>
                <div style={{ fontSize:9,color:demoStep>i?'#8aafd4':'#2a3f5f',marginTop:2 }}>{s.d}</div>
              </div>
            ))}
          </div>
          {demoStep>=3&&<div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
            {demoData.accounts.map(acc=>(
              <div key={acc.id} style={{ padding:'10px 14px',borderRadius:3,background:'rgba(255,42,74,.08)',border:'1px solid rgba(255,42,74,.3)',minWidth:140 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#ff2a4a',marginBottom:2 }}>{acc.id}</div>
                <div style={{ fontSize:10,color:'#8aafd4',marginBottom:4 }}>{acc.name}</div>
                <div style={{ fontSize:9,color:'#5a7fa8' }}>RISK: <span style={{ color:'#ff2a4a',fontWeight:700 }}>{acc.risk}/100</span></div>
              </div>
            ))}
          </div>}
          {demoStep>=5&&alertText&&(
            <div style={{ background:'rgba(0,0,0,.4)',border:'1px solid rgba(255,42,74,.2)',borderRadius:3,padding:14 }}>
              <div style={{ fontSize:9,color:'#ff2a4a',fontWeight:700,letterSpacing:'.15em',marginBottom:8 }}>◈ AI INVESTIGATION BRIEF</div>
              <pre style={{ fontSize:11,color:'#8aafd4',whiteSpace:'pre-wrap',fontFamily:'JetBrains Mono',lineHeight:1.7 }}>{alertText}<span style={{ color:'#00aaff' }}>█</span></pre>
            </div>
          )}
        </div>
      )}

      {/* STATS */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:16 }}>
        {[
          {label:'TRANSACTIONS',value:stats?.totalTransactions?.toLocaleString()||'1,000',sub:'Total monitored',color:'#00aaff',icon:'◈'},
          {label:'ACCOUNTS',value:stats?.totalAccounts?.toLocaleString()||'142',sub:'Unique accounts',color:'#00e5ff',icon:'◉'},
          {label:'SUSPICIOUS',value:stats?.suspiciousCount||47,sub:'Fraud flagged',color:'#ffaa00',icon:'⚡'},
          {label:'HIGH RISK',value:stats?.highRiskAccounts||12,sub:'Under investigation',color:'#ff2a4a',icon:'◎'},
          {label:'ALERTS',value:alerts.length||stats?.alertsGenerated||4,sub:'AI generated',color:'#b44aff',icon:'▦'},
        ].map((s,i)=>(
          <div key={i} className={`card card-${['','','amber','red','purple'][i]||''}`}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
              <div><div style={{ fontSize:9,color:'#5a7fa8',letterSpacing:'.15em',marginBottom:8 }}>{s.label}</div><div style={{ fontSize:28,fontWeight:700,fontFamily:'JetBrains Mono',color:s.color,lineHeight:1 }}>{s.value}</div><div style={{ fontSize:9,color:'#5a7fa8',marginTop:6 }}>{s.sub}</div></div>
              <span style={{ fontSize:20,color:s.color,opacity:.4 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:12,marginBottom:16 }}>
        <div className="card">
          <div className="section-label">TRANSACTION VOLUME — HOURLY</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={VOLUME_DATA}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00aaff" stopOpacity={.2}/><stop offset="95%" stopColor="#00aaff" stopOpacity={0}/></linearGradient>
                <linearGradient id="susGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff2a4a" stopOpacity={.3}/><stop offset="95%" stopColor="#ff2a4a" stopOpacity={0}/></linearGradient>
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
              <Bar dataKey="risk" radius={[0,2,2,0]}>{RISK_DATA.map((d,i)=><Cell key={i} fill={d.risk>70?'#ff2a4a':d.risk>50?'#ffaa00':'#00aaff'}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOTTOM */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 320px',gap:12 }}>
        <div className="card card-red">
          <div className="section-label">ACTIVE FRAUD ALERTS</div>
          {alerts.length===0?<div style={{ textAlign:'center',padding:30,color:'#2a3f5f',fontSize:12 }}>NO ALERTS — RUN ANALYSIS OR USE BANK APP DEMO</div>:(
            <div style={{ display:'flex',flexDirection:'column',gap:8,maxHeight:200,overflowY:'auto' }}>
              {alerts.map((alert,i)=>(
                <div key={i} style={{ padding:'10px 12px',borderRadius:3,background:'rgba(255,42,74,.05)',border:'1px solid rgba(255,42,74,.15)' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}><span style={{ fontSize:10,fontWeight:700,color:'#ff2a4a',letterSpacing:'.1em' }}>{alert.type?.replace(/_/g,' ').toUpperCase()}</span><span className={`badge badge-${alert.severity==='CRITICAL'?'critical':'high'}`}>{alert.severity}</span></div>
                  <p style={{ fontSize:11,color:'#8aafd4',lineHeight:1.5 }}>{alert.text?.slice(0,120)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="section-label">LIVE TRANSACTION STREAM</div>
          <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
            {liveTxns.length===0?<div style={{ color:'#2a3f5f',fontSize:11 }}>AWAITING STREAM...</div>:liveTxns.map((txn,i)=>(
              <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 8px',borderRadius:2,fontSize:10,background:txn.suspicious?'rgba(255,42,74,.06)':'rgba(255,255,255,.01)',border:`1px solid ${txn.suspicious?'rgba(255,42,74,.2)':'#0a1828'}` }}>
                <span style={{ color:'#2a3f5f',fontFamily:'JetBrains Mono',fontSize:9 }}>{txn.id?.slice(-8)}</span>
                <span style={{ color:txn.suspicious?'#ff2a4a':'#00e676',fontWeight:700 }}>₹{txn.amount?.toLocaleString('en-IN')}</span>
                <span style={{ color:'#5a7fa8',fontSize:9 }}>{txn.type}</span>
                {txn.suspicious&&<span className="badge badge-critical">!</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}