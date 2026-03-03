// frontend/src/components/BankApp.jsx
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = 'http://localhost:5001'

// ── ALL accounts in the system ─────────────────────────────
// Same list used for both FROM and TO dropdowns
export const ALL_ACCOUNTS = [
  { id: 'ACC001', name: 'Rajesh Kumar',      no: '****1028', balance: 1247832 },
  { id: 'ACC002', name: 'Priya Enterprises', no: '****2045', balance: 450000  },
  { id: 'ACC003', name: 'Quick Trade Ltd',   no: '****3981', balance: 900000  },
  { id: 'ACC004', name: 'Shell Co. Mumbai',  no: '****4471', balance: 780000  },
  { id: 'ACC005', name: 'Mehta Exports',     no: '****5823', balance: 320000  },
  { id: 'ACC006', name: 'Alpha Holdings',    no: '****6612', balance: 1050000 },
]

const RECENT_TXN = [
  { desc: 'UPI — Swiggy',         amount: -450,   date: 'Today, 09:12' },
  { desc: 'Salary Credit',        amount: 85000,  date: 'Jan 1, 00:01' },
  { desc: 'NEFT — HDFC Loan EMI', amount: -12500, date: 'Dec 31, 10:00' },
  { desc: 'ATM Withdrawal',       amount: -5000,  date: 'Dec 30, 18:45' },
]

// ─────────────────────────────────────────────────────────────
// CYCLE DETECTION — 3-colour DFS (WHITE / GRAY / BLACK)
// A back-edge to a GRAY node = confirmed directed cycle
// ─────────────────────────────────────────────────────────────
function findCycle(graph) {
  const allNodes = new Set()
  for (const [from, tos] of Object.entries(graph)) {
    allNodes.add(from)
    for (const to of tos) allNodes.add(to)
  }

  const WHITE = 0, GRAY = 1, BLACK = 2
  const color  = {}
  const parent = {}
  for (const n of allNodes) color[n] = WHITE

  const dfs = (start) => {
    const stack = []
    const enter = (node, par) => {
      color[node]  = GRAY
      parent[node] = par ?? null
      const nbrs   = graph[node] ? [...graph[node]] : []
      stack.push({ node, iter: nbrs[Symbol.iterator]() })
    }
    enter(start, null)

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      const { value: nbr, done } = frame.iter.next()
      if (done) {
        color[frame.node] = BLACK
        stack.pop()
        continue
      }
      if (color[nbr] === GRAY) {
        // Back-edge → reconstruct cycle path
        const path = [nbr]
        let cur = frame.node
        while (cur !== nbr && cur !== null) {
          path.unshift(cur)
          cur = parent[cur]
        }
        path.unshift(nbr)
        return path
      }
      if (color[nbr] === WHITE) enter(nbr, frame.node)
    }
    return null
  }

  for (const node of allNodes) {
    if (color[node] === WHITE) {
      const cycle = dfs(node)
      if (cycle) return cycle
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────
export default function BankApp({ onTransfer, soundEngine }) {
  const [screen,      setScreen]      = useState('splash')
  const [pin,         setPin]         = useState('')
  const [fromAccount, setFromAccount] = useState(ALL_ACCOUNTS[0].id)
  const [toAccount,   setToAccount]   = useState('')
  const [amount,      setAmount]      = useState('')
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState('')
  const [time,        setTime]        = useState(new Date())
  const [cycleFound,  setCycleFound]  = useState(null)
  const [graphSnap,   setGraphSnap]   = useState([])

  const graphRef = useRef({})

  useEffect(() => {
    const clock  = setInterval(() => setTime(new Date()), 1000)
    const splash = setTimeout(() => setScreen('login'), 1800)
    return () => { clearInterval(clock); clearTimeout(splash) }
  }, [])

  const refreshSnap = (g) => {
    const snap = []
    for (const [from, tos] of Object.entries(g))
      for (const to of tos) snap.push({ from, to })
    setGraphSnap(snap)
  }

  // ── PIN ───────────────────────────────────────────────────
  const handlePin = (digit) => {
    if (pin.length >= 4) return
    soundEngine?.playPin()
    const next = pin + digit
    setPin(next)
    if (next.length === 4) {
      setTimeout(() => {
        if (next === '1234') {
          soundEngine?.playLogin()
          setPin(''); setError('')
          setScreen('home')
        } else {
          setPin('')
          setError('Wrong PIN. Try 1234')
          setTimeout(() => setError(''), 2000)
        }
      }, 300)
    }
  }

  // ── Validate ──────────────────────────────────────────────
  const proceedToConfirm = () => {
    if (!fromAccount)                                    { setError('Select a FROM account'); return }
    if (!toAccount)                                      { setError('Select a TO account'); return }
    if (toAccount === fromAccount)                       { setError('FROM and TO cannot be same'); return }
    if (!amount || isNaN(amount) || Number(amount) <= 0) { setError('Enter a valid amount'); return }
    const bal = ALL_ACCOUNTS.find(a => a.id === fromAccount)?.balance ?? 0
    if (Number(amount) > bal)                            { setError('Insufficient balance'); return }
    setError(''); setSending(false); setScreen('confirm')
  }

  // ── Execute transfer ──────────────────────────────────────
  const confirmTransfer = async () => {
    if (sending) return
    setSending(true)

    const from = fromAccount
    const to   = toAccount

    const g = graphRef.current
    if (!g[from]) g[from] = new Set()
    const isNewEdge = !g[from].has(to)
    g[from].add(to)
    refreshSnap(g)

    const cycle = isNewEdge ? findCycle(g) : null
    setCycleFound(cycle)

    onTransfer?.({
      from_account: from,
      to_account:   to,
      amount:       Number(amount),
      channel:      'RTGS',
      cycle:        cycle ?? null,
    })

    soundEngine?.playCash()

    try {
      await axios.post(`${API}/api/transfer`, {
        from_account: from, to_account: to,
        amount: Number(amount), channel: 'RTGS',
      })
    } catch { /* offline — demo continues */ }

    setSending(false)
    setScreen('sent')
  }

  const reset = () => {
    setFromAccount(ALL_ACCOUNTS[0].id)
    setToAccount(''); setAmount('')
    setError(''); setSending(false); setCycleFound(null)
    setScreen('home')
  }

  const hardReset = () => {
    graphRef.current = {}
    setGraphSnap([])
    reset()
  }

  const fmt    = n   => `₹${Math.abs(n).toLocaleString('en-IN')}`
  const accLabel = id => {
    const a = ALL_ACCOUNTS.find(x => x.id === id)
    return a ? `${a.id} — ${a.name} ${a.no}` : id
  }

  // ── SPLASH ────────────────────────────────────────────────
  if (screen === 'splash') return (
    <div style={{ ...S.screen, justifyContent:'center', alignItems:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:52, marginBottom:6 }}>🏦</div>
        <div style={{ fontSize:22, fontWeight:800, color:'#1e3a5f' }}>Union Bank</div>
        <div style={{ fontSize:13, color:'#6b7280' }}>of India</div>
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:8 }}>Your Trusted Banking Partner</div>
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:28 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#1e3a5f',
              animation:`dotPulse 1.2s ${i*0.2}s infinite ease-in-out` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes dotPulse{0%,100%{opacity:0.2;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  )

  // ── LOGIN ─────────────────────────────────────────────────
  if (screen === 'login') return (
    <div style={{ ...S.screen, justifyContent:'center', alignItems:'center' }}>
      <div style={{ textAlign:'center', padding:'0 24px', width:'100%' }}>
        <div style={{ fontSize:11, color:'#9ca3af', marginBottom:14 }}>
          {time.toLocaleTimeString('en-IN', { hour12:true })}
        </div>
        <div style={{ fontSize:30, marginBottom:4 }}>🏦</div>
        <div style={{ fontSize:15, fontWeight:700, color:'#1e3a5f', marginBottom:2 }}>Union Bank</div>
        <div style={{ fontSize:12, color:'#374151', marginBottom:22 }}>Welcome, Rajesh Kumar</div>
        <div style={{ display:'flex', gap:14, justifyContent:'center', marginBottom:20 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width:14, height:14, borderRadius:'50%',
              background: i < pin.length ? '#1e3a5f' : 'transparent',
              border:'2px solid #1e3a5f', transition:'background 0.15s' }} />
          ))}
        </div>
        <div style={{ height:18, marginBottom:10, fontSize:11, color: error?'#ef4444':'#9ca3af' }}>
          {error || 'Enter mPIN'}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, maxWidth:210, margin:'0 auto' }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i) => (
            <button key={i}
              onClick={() => {
                if (d === '⌫') { setPin(p => p.slice(0,-1)); return }
                if (d !== '') handlePin(String(d))
              }}
              style={{ height:48, borderRadius:10, border:'none',
                fontSize:d==='⌫'?14:18, fontWeight:600,
                cursor:d===''?'default':'pointer',
                background:d==='⌫'?'#fee2e2':'#f3f4f6',
                color:d==='⌫'?'#ef4444':'#1e3a5f',
                opacity:d===''?0:1 }}
            >{d}</button>
          ))}
        </div>
        <div style={{ marginTop:16, fontSize:10, color:'#9ca3af' }}>
          Hint: <strong style={{ color:'#1e3a5f' }}>1234</strong>
        </div>
      </div>
    </div>
  )

  // ── HOME ──────────────────────────────────────────────────
  if (screen === 'home') return (
    <div style={{ ...S.screen, justifyContent:'flex-start' }}>
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2d5a8e)', padding:'14px 16px',
        display:'flex', justifyContent:'space-between', alignItems:'center', color:'#fff', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:11, opacity:0.7 }}>Good morning</div>
          <div style={{ fontSize:15, fontWeight:700 }}>Rajesh Kumar</div>
        </div>
        <div style={{ fontSize:22 }}>👤</div>
      </div>
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#1a56db)', margin:'0 14px',
        borderRadius:'0 0 18px 18px', padding:'14px 18px 18px', color:'#fff', flexShrink:0 }}>
        <div style={{ fontSize:11, opacity:0.7, marginBottom:2 }}>Available Balance</div>
        <div style={{ fontSize:26, fontWeight:800 }}>₹12,47,832</div>
        <div style={{ fontSize:11, opacity:0.6, marginTop:2 }}>Savings A/C ••••1028</div>
        <div style={{ display:'flex', gap:6, marginTop:10 }}>
          {['IMPS ✓','RTGS ✓','NEFT ✓'].map(b => (
            <span key={b} style={{ background:'rgba(255,255,255,0.15)', borderRadius:20, padding:'2px 8px', fontSize:9 }}>{b}</span>
          ))}
        </div>
      </div>
      <div style={{ padding:'14px 14px 8px', flexShrink:0 }}>
        <div style={{ fontSize:10, color:'#6b7280', marginBottom:10, fontWeight:700, letterSpacing:'0.05em' }}>QUICK ACTIONS</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            { icon:'💸', label:'Transfer', action:() => setScreen('transfer') },
            { icon:'📱', label:'UPI Pay',  action:() => {} },
            { icon:'📄', label:'Statement',action:() => {} },
            { icon:'🏧', label:'ATM',      action:() => {} },
          ].map(({ icon, label, action }) => (
            <button key={label} onClick={action}
              style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12,
                padding:'10px 4px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ fontSize:20 }}>{icon}</div>
              <div style={{ fontSize:9, color:'#374151', marginTop:3 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding:'4px 14px', flex:1, overflowY:'auto' }}>
        <div style={{ fontSize:10, color:'#6b7280', marginBottom:8, fontWeight:700, letterSpacing:'0.05em' }}>RECENT TRANSACTIONS</div>
        {RECENT_TXN.map((t,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', padding:'9px 0', borderBottom:'1px solid #f3f4f6' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, color:'#111827', fontWeight:500 }}>{t.desc}</div>
              <div style={{ fontSize:10, color:'#9ca3af', marginTop:1 }}>{t.date}</div>
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:t.amount > 0 ? '#059669' : '#dc2626' }}>
              {t.amount > 0 ? '+' : ''}{fmt(t.amount)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'8px 14px 12px',
        borderTop:'1px solid #f3f4f6', background:'#fff', flexShrink:0 }}>
        {[['🏠','Home'],['💳','Cards'],['📊','Insights'],['⚙️','Settings']].map(([icon,label]) => (
          <div key={label} style={{ textAlign:'center' }}>
            <div style={{ fontSize:18 }}>{icon}</div>
            <div style={{ fontSize:9, color:label==='Home'?'#1e3a5f':'#9ca3af' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── TRANSFER ──────────────────────────────────────────────
  if (screen === 'transfer') return (
    <div style={{ ...S.screen, justifyContent:'flex-start' }}>
      <div style={S.pageHeader}>
        <button onClick={reset} style={S.backBtn}>←</button>
        <span style={{ fontSize:15, fontWeight:700, color:'#111827' }}>Fund Transfer</span>
        <div style={{ width:32 }} />
      </div>
      <div style={{ padding:16, flex:1, overflowY:'auto' }}>

        {/* FROM — all accounts */}
        <div style={{ marginBottom:14 }}>
          <div style={S.label}>FROM ACCOUNT</div>
          <select value={fromAccount}
            onChange={e => { setFromAccount(e.target.value); setToAccount(''); setError('') }}
            style={S.select}>
            {ALL_ACCOUNTS.map(a => (
              <option key={a.id} value={a.id}>{a.id} — {a.name} {a.no}</option>
            ))}
          </select>
        </div>

        {/* TO — all accounts except the selected FROM */}
        <div style={{ marginBottom:14 }}>
          <div style={S.label}>TO ACCOUNT</div>
          <select value={toAccount}
            onChange={e => { setToAccount(e.target.value); setError('') }}
            style={S.select}>
            <option value="">Select recipient</option>
            {ALL_ACCOUNTS
              .filter(a => a.id !== fromAccount)
              .map(a => (
                <option key={a.id} value={a.id}>{a.id} — {a.name} {a.no}</option>
              ))
            }
          </select>
        </div>

        {/* AMOUNT */}
        <div style={{ marginBottom:14 }}>
          <div style={S.label}>AMOUNT (₹)</div>
          <input type="number" placeholder="Enter amount" value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }}
            style={S.input} min="1" />
          <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
            {[470000,460000,450000,100000].map(a => (
              <button key={a} onClick={() => { setAmount(String(a)); setError('') }}
                style={{ padding:'4px 10px', borderRadius:20, border:'1px solid #e5e7eb',
                  background:amount===String(a)?'#1e3a5f':'#f3f4f6',
                  color:amount===String(a)?'#fff':'#374151', fontSize:11, cursor:'pointer' }}>
                ₹{(a/100000).toFixed(1)}L
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ color:'#ef4444', fontSize:11, marginBottom:10 }}>{error}</div>}

        {/* Live graph */}
        {graphSnap.length > 0 && (
          <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8,
            padding:'8px 12px', marginBottom:12 }}>
            <div style={{ fontSize:9, color:'#0369a1', fontWeight:700, marginBottom:4 }}>
              TRANSFER GRAPH ({graphSnap.length} edge{graphSnap.length > 1 ? 's' : ''})
            </div>
            {graphSnap.map((e,i) => (
              <div key={i} style={{ fontSize:10, fontFamily:'monospace', color:'#0369a1', marginBottom:2 }}>
                {e.from} → {e.to}
              </div>
            ))}
            <div style={{ fontSize:9, color:'#64748b', marginTop:5, fontStyle:'italic' }}>
              Fraud only when a directed cycle closes (e.g. A→B→C→A)
            </div>
          </div>
        )}

        <button onClick={proceedToConfirm} style={S.btn}>PROCEED TO CONFIRM</button>
        {graphSnap.length > 0 && (
          <button onClick={hardReset}
            style={{ ...S.btn, marginTop:8, background:'transparent', color:'#9ca3af', border:'1px solid #e5e7eb', fontSize:11 }}>
            ↺ Reset Transfer Graph
          </button>
        )}
      </div>
    </div>
  )

  // ── CONFIRM ───────────────────────────────────────────────
  if (screen === 'confirm') return (
    <div style={{ ...S.screen, justifyContent:'flex-start' }}>
      <div style={S.pageHeader}>
        <button onClick={() => setScreen('transfer')} style={S.backBtn}>←</button>
        <span style={{ fontSize:15, fontWeight:700, color:'#111827' }}>Confirm Transfer</span>
        <div style={{ width:32 }} />
      </div>
      <div style={{ padding:16, flex:1, overflowY:'auto' }}>
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2d5a8e)', borderRadius:16, padding:20, color:'#fff', marginBottom:16 }}>
          <div style={{ fontSize:11, opacity:0.7, marginBottom:4 }}>YOU ARE SENDING</div>
          <div style={{ fontSize:30, fontWeight:800 }}>₹{Number(amount).toLocaleString('en-IN')}</div>
          <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.2)' }}>
            {[
              ['FROM', accLabel(fromAccount)],
              ['TO',   accLabel(toAccount)],
              ['CHANNEL','RTGS'],
              ['TIME', new Date().toLocaleTimeString('en-IN',{hour12:false})],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ opacity:0.7, fontSize:11 }}>{k}</span>
                <span style={{ fontSize:11, fontWeight:600, textAlign:'right', maxWidth:180 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:'#fef3c7', borderRadius:8, padding:10, marginBottom:16, border:'1px solid #f59e0b' }}>
          <div style={{ fontSize:11, color:'#92400e', fontWeight:600 }}>⚠️ Please verify before confirming</div>
          <div style={{ fontSize:10, color:'#92400e', marginTop:2 }}>Transactions cannot be reversed once processed</div>
        </div>
        <button onClick={confirmTransfer} disabled={sending}
          style={{ ...S.btn, background:sending?'#9ca3af':'#dc2626', marginBottom:10 }}>
          {sending ? '⏳ PROCESSING...' : '✓ CONFIRM TRANSFER'}
        </button>
        <button onClick={() => setScreen('transfer')}
          style={{ ...S.btn, background:'transparent', color:'#6b7280', border:'1px solid #e5e7eb' }}>
          CANCEL
        </button>
      </div>
    </div>
  )

  // ── SENT ──────────────────────────────────────────────────
  if (screen === 'sent') return (
    <div style={{ ...S.screen, justifyContent:'center', alignItems:'center', padding:24, textAlign:'center' }}>
      {cycleFound ? (
        <>
          <div style={{ fontSize:48, marginBottom:10 }}>🚨</div>
          <div style={{ fontSize:15, fontWeight:800, color:'#dc2626', marginBottom:6 }}>CIRCULAR LOOP DETECTED</div>
          <div style={{ fontSize:11, color:'#6b7280', marginBottom:8 }}>Confirmed cycle path:</div>
          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8,
            padding:'10px 14px', marginBottom:16, fontSize:11, fontFamily:'monospace',
            color:'#991b1b', lineHeight:1.8, wordBreak:'break-all' }}>
            {cycleFound.join(' → ')}
          </div>
          <div style={{ fontSize:10, color:'#9ca3af', marginBottom:20 }}>← SENTINEL is raising the alarm →</div>
        </>
      ) : (
        <>
          <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:17, fontWeight:800, color:'#059669', marginBottom:6 }}>Transfer Sent!</div>
          <div style={{ fontSize:10, color:'#9ca3af', marginBottom:12 }}>No circular pattern detected</div>
        </>
      )}
      <div style={{ fontSize:22, fontWeight:700, color:'#111827', marginBottom:4 }}>
        ₹{Number(amount).toLocaleString('en-IN')}
      </div>
      <div style={{ fontSize:12, color:'#6b7280', marginBottom:2 }}>{accLabel(fromAccount)} → {accLabel(toAccount)}</div>
      <div style={{ fontSize:11, color:'#9ca3af', marginBottom:24 }}>
        Ref: UBI{Date.now().toString().slice(-8)}
      </div>
      <button onClick={reset} style={S.btn}>MAKE ANOTHER TRANSFER</button>
    </div>
  )

  return null
}

const S = {
  screen:     { width:'100%', height:'100%', background:'#ffffff', display:'flex', flexDirection:'column', fontFamily:"'Inter',-apple-system,sans-serif", overflow:'hidden' },
  pageHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid #f3f4f6', background:'#fff', flexShrink:0 },
  backBtn:    { background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#1e3a5f', width:32 },
  label:      { fontSize:10, fontWeight:700, color:'#6b7280', letterSpacing:'0.08em', marginBottom:6 },
  input:      { width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:14, color:'#111827', outline:'none', background:'#f9fafb', boxSizing:'border-box', fontFamily:'inherit' },
  select:     { width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, color:'#111827', outline:'none', background:'#f9fafb', cursor:'pointer', boxSizing:'border-box', fontFamily:'inherit' },
  btn:        { width:'100%', padding:13, borderRadius:10, background:'#1e3a5f', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'0.05em', display:'block' },
}