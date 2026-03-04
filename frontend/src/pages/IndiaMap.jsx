import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

const INDIA_GEOJSON = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [[
      [68.1, 23.6], [68.7, 22.8], [70.2, 22.3], [71.5, 22.0], [72.6, 21.6],
      [73.3, 21.2], [74.5, 20.7], [76.0, 20.4],
      [77.5, 19.8], [78.3, 18.5], [79.0, 17.5], [79.5, 16.0],
      [80.0, 14.5], [80.3, 13.5], [80.3, 12.0], [79.8, 10.3],
      [79.0, 9.5],  [78.0, 8.5],  [77.5, 8.1],  [77.1, 8.4],
      [76.6, 9.0],  [76.3, 10.0], [76.0, 11.0], [75.5, 12.0],
      [75.0, 13.5], [74.5, 14.5], [74.0, 15.5], [73.6, 16.5],
      [73.2, 17.5], [73.0, 18.5], [72.8, 19.5], [72.5, 20.5],
      [72.6, 21.5], [72.0, 22.5], [69.5, 22.8],
      [68.5, 23.0], [68.0, 23.5], [67.5, 24.0],
      [67.0, 24.5], [66.7, 25.2], [67.5, 26.0], [68.5, 27.0],
      [69.5, 27.5], [70.5, 28.0], [71.0, 28.5], [70.5, 29.5],
      [70.0, 30.5], [70.8, 31.5], [71.5, 32.5], [72.5, 33.0],
      [73.5, 33.5], [74.5, 34.0], [75.5, 34.5],
      [76.5, 34.8], [77.5, 35.5], [78.5, 35.5], [79.5, 35.0],
      [78.5, 34.0], [79.0, 33.5], [79.5, 33.0],
      [80.5, 32.5], [81.0, 31.5], [81.5, 30.8], [82.5, 30.5],
      [83.5, 30.0], [84.5, 29.5], [85.5, 29.5], [86.5, 29.5],
      [87.0, 29.5], [88.0, 29.5], [88.5, 29.8],
      [89.0, 27.0], [89.5, 26.5], [90.5, 26.5], [91.5, 26.5],
      [92.5, 26.8], [93.5, 26.8], [94.5, 27.0], [95.0, 27.5],
      [96.0, 28.0], [96.5, 28.5],
      [97.0, 27.5], [97.0, 26.5], [96.5, 25.5], [96.0, 24.5],
      [95.5, 23.5], [95.0, 22.5], [94.5, 22.0], [93.5, 22.0],
      [93.0, 22.5], [92.5, 23.0], [92.0, 23.5], [91.5, 23.8],
      [91.0, 24.0], [90.5, 23.5], [90.0, 23.0], [89.5, 22.5],
      [89.0, 22.0], [88.5, 22.0], [88.0, 22.5], [87.5, 22.5],
      [87.0, 22.0], [86.5, 21.5], [86.0, 21.0],
      [85.5, 20.5], [85.0, 20.0], [84.5, 19.5], [84.0, 18.5],
      [83.5, 18.0], [83.0, 17.5], [82.5, 17.0], [82.0, 16.5],
      [81.5, 16.0], [81.0, 15.5], [80.5, 15.0],
      [68.1, 23.6]
    ]]
  }
}

const CITIES = [
  { id:'MUM', name:'Mumbai',    lat:19.076, lng:72.877, risk:92, amount:4700000,  color:'#ff2a4a' },
  { id:'DEL', name:'Delhi',     lat:28.613, lng:77.209, risk:71, amount:3200000,  color:'#ffaa00' },
  { id:'BLR', name:'Bengaluru', lat:12.971, lng:77.594, risk:48, amount:1900000,  color:'#00aaff' },
  { id:'HYD', name:'Hyderabad', lat:17.385, lng:78.486, risk:62, amount:2800000,  color:'#ffaa00' },
  { id:'CHE', name:'Chennai',   lat:13.083, lng:80.270, risk:44, amount:1500000,  color:'#00aaff' },
  { id:'KOL', name:'Kolkata',   lat:22.572, lng:88.363, risk:38, amount:1200000,  color:'#00aaff' },
  { id:'AHM', name:'Ahmedabad', lat:23.022, lng:72.571, risk:55, amount:2100000,  color:'#ffaa00' },
  { id:'JAI', name:'Jaipur',    lat:26.912, lng:75.787, risk:49, amount:1700000,  color:'#00aaff' },
  { id:'PUN', name:'Pune',      lat:18.520, lng:73.856, risk:58, amount:2300000,  color:'#ffaa00' },
  { id:'LKO', name:'Lucknow',   lat:26.846, lng:80.946, risk:33, amount:980000,   color:'#00aaff' },
]

const FLOWS = [
  { from:'MUM', to:'DEL',  amount:4700000, suspicious:true  },
  { from:'DEL', to:'AHM',  amount:3200000, suspicious:true  },
  { from:'AHM', to:'MUM',  amount:3100000, suspicious:true  },
  { from:'MUM', to:'HYD',  amount:2800000, suspicious:false },
  { from:'HYD', to:'BLR',  amount:1900000, suspicious:false },
  { from:'KOL', to:'DEL',  amount:1200000, suspicious:false },
  { from:'JAI', to:'LKO',  amount:980000,  suspicious:false },
]

export default function IndiaMap() {
  const svgRef    = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [stats,   setStats]   = useState({ totalFlow: 0, suspiciousFlow: 0, hotCity: '' })

  useEffect(() => {
    const totalFlow      = FLOWS.reduce((s,f) => s + f.amount, 0)
    const suspiciousFlow = FLOWS.filter(f => f.suspicious).reduce((s,f) => s + f.amount, 0)
    const hotCity        = CITIES.reduce((a,b) => a.risk > b.risk ? a : b).name
    setStats({ totalFlow, suspiciousFlow, hotCity })
  }, [])

  useEffect(() => {
    if (!svgRef.current) return

    const W = 560, H = 580
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width',  '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${W} ${H}`)

    // ── D3 projection — real Mercator, fitted to India ──
    const projection = d3.geoMercator()
      .center([82, 22])       // center of India
      .scale(1050)            // zoom level
      .translate([W/2, H/2])

    const path = d3.geoPath().projection(projection)

    // ── Grid lines ──
    const gridG = svg.append('g').attr('opacity', 0.3)
    for (let x = 0; x < W; x += 40)
      gridG.append('line').attr('x1',x).attr('y1',0).attr('x2',x).attr('y2',H).attr('stroke','#e5e7eb').attr('stroke-width',0.5)
    for (let y = 0; y < H; y += 40)
      gridG.append('line').attr('x1',0).attr('y1',y).attr('x2',W).attr('y2',y).attr('stroke','#e5e7eb').attr('stroke-width',0.5)

    // ── India border (real GeoJSON path) ──
    const mapG = svg.append('g')

    const defs = svg.append('defs')

    // Main border
    mapG.append('path')
      .datum(INDIA_GEOJSON)
      .attr('d', path)
      .attr('fill', '#e0f2fe')
      .attr('stroke', '#93c5fd')
      .attr('stroke-width', 1.5)

    // Subtle interior fill gradient
    const grad = defs.append('linearGradient').attr('id','mapFill').attr('x1','0').attr('y1','0').attr('x2','0').attr('y2','1')
    grad.append('stop').attr('offset','0%').attr('stop-color','#eff6ff')
    grad.append('stop').attr('offset','100%').attr('stop-color','#dbeafe')

    mapG.append('path')
      .datum(INDIA_GEOJSON)
      .attr('d', path)
      .attr('fill', 'url(#mapFill)')
      .attr('stroke', 'none')

    // ── City positions via projection ──
    const cityPos = {}
    CITIES.forEach(c => {
      const [x, y] = projection([c.lng, c.lat])
      cityPos[c.id] = { x, y }
    })

    // ── Flow arcs ──
    const flowG = svg.append('g')
    FLOWS.forEach((flow, fi) => {
      const s = cityPos[flow.from]
      const e = cityPos[flow.to]
      if (!s || !e) return

      const mx = (s.x + e.x) / 2
      const my = (s.y + e.y) / 2 - 60  // arc height

      const arcPath = `M ${s.x},${s.y} Q ${mx},${my} ${e.x},${e.y}`

      // Shadow arc
      flowG.append('path')
        .attr('d', arcPath)
        .attr('fill', 'none')
        .attr('stroke', flow.suspicious ? 'rgba(248,113,113,0.12)' : 'rgba(59,130,246,0.08)')
        .attr('stroke-width', 4)

      // Main arc
      const arcEl = flowG.append('path')
        .attr('d', arcPath)
        .attr('fill', 'none')
        .attr('stroke', flow.suspicious ? '#b91c1c' : '#2563eb')
        .attr('stroke-width', flow.suspicious ? 2 : 1.2)
        .attr('stroke-dasharray', flow.suspicious ? '6 3' : '4 4')

      // Dash animation
      const totalLen = 300
      arcEl
        .attr('stroke-dasharray', `${totalLen} ${totalLen}`)
        .attr('stroke-dashoffset', totalLen)
        .transition().duration(1200).delay(fi * 180).ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0)
        .on('end', function repeat() {
          d3.select(this)
            .attr('stroke-dashoffset', totalLen)
            .transition().duration(1200).delay(fi * 50).ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0)
            .on('end', repeat)
        })

      // Amount label on arc midpoint
      const lx = (s.x + e.x) / 2 + (Math.random() - 0.5) * 12
      const ly = my + 22
      flowG.append('text')
        .attr('x', lx).attr('y', ly)
        .attr('text-anchor', 'middle')
        .attr('font-size', 9)
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', flow.suspicious ? '#b91c1c' : '#4b5563')
        .attr('opacity', 0.85)
        .text(`₹${(flow.amount/100000).toFixed(0)}L`)

      // Moving dot along arc
      const movDot = flowG.append('circle')
        .attr('r', flow.suspicious ? 4 : 3)
        .attr('fill', flow.suspicious ? '#b91c1c' : '#0b5ed7')
        .attr('opacity', 0.9)

      const animateDot = () => {
        movDot
          .attr('cx', s.x).attr('cy', s.y)
          .transition()
          .duration(1800 + fi * 120)
          .delay(fi * 200)
          .ease(d3.easeCubicInOut)
          .attrTween('cx', () => {
            return t => {
              const pt = arcEl.node().getPointAtLength(t * arcEl.node().getTotalLength())
              return pt ? pt.x : s.x
            }
          })
          .attrTween('cy', () => {
            return t => {
              const pt = arcEl.node().getPointAtLength(t * arcEl.node().getTotalLength())
              return pt ? pt.y : s.y
            }
          })
          .on('end', () => setTimeout(animateDot, 400 + fi * 60))
      }
      setTimeout(animateDot, fi * 300)
    })

    // ── City nodes ──
    const cityG = svg.append('g')
    CITIES.forEach(c => {
      const { x, y } = cityPos[c.id]
      const r = Math.max(6, Math.min(14, c.risk / 9))
      const g = cityG.append('g')
        .attr('cursor', 'pointer')
        .on('mouseenter', (evt) => {
          setTooltip({
            x: evt.offsetX, y: evt.offsetY,
            name: c.name, risk: c.risk,
            amount: c.amount, color: c.color,
          })
        })
        .on('mouseleave', () => setTooltip(null))

      // Outer pulse ring — only for high risk
      if (c.risk > 60) {
        const pulse = g.append('circle')
          .attr('cx', x).attr('cy', y).attr('r', r + 2)
          .attr('fill', 'none')
          .attr('stroke', c.color)
          .attr('stroke-width', 1.2)
          .attr('opacity', 0.6)

        const animatePulse = () => {
          pulse.attr('r', r + 2).attr('opacity', 0.6)
            .transition().duration(1400).ease(d3.easeLinear)
            .attr('r', r + 14).attr('opacity', 0)
            .on('end', animatePulse)
        }
        animatePulse()

        const pulse2 = g.append('circle')
          .attr('cx', x).attr('cy', y).attr('r', r + 2)
          .attr('fill', 'none').attr('stroke', c.color)
          .attr('stroke-width', 0.7).attr('opacity', 0.4)
        const animatePulse2 = () => {
          pulse2.attr('r', r + 2).attr('opacity', 0.4)
            .transition().duration(1400).delay(500).ease(d3.easeLinear)
            .attr('r', r + 18).attr('opacity', 0)
            .on('end', animatePulse2)
        }
        animatePulse2()
      }

      // City circle
      g.append('circle')
        .attr('cx', x).attr('cy', y).attr('r', r)
        .attr('fill', c.color)
        .attr('opacity', 0.9)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)

      // Inner dot
      g.append('circle')
        .attr('cx', x).attr('cy', y).attr('r', r * 0.38)
        .attr('fill', '#1f2937').attr('opacity', 0.7)

      // City name label
      g.append('text')
        .attr('x', x + r + 5).attr('y', y + 4)
        .attr('font-size', 10)
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-weight', '600')
        .attr('fill', c.risk > 70 ? '#b91c1c' : c.risk > 50 ? '#d97706' : '#1d4ed8')
        .text(c.name)
    })

  }, [])

  const fmt = (n) => `₹${(n / 100000).toFixed(1)}L`

  return (
    <div style={{ maxWidth: 1400 }}>

      {/* Header */}
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
          <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.2em', marginBottom:4 }}>GEOGRAPHIC INTELLIGENCE</div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#111827', fontFamily:'Rajdhani, sans-serif' }}>INDIA MONEY FLOW MAP</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { label:'TOTAL FLOW',      value:fmt(stats.totalFlow),      color:'#0b5ed7' },
            { label:'SUSPICIOUS',      value:fmt(stats.suspiciousFlow), color:'#b91c1c' },
            { label:'HOT CITY',        value:stats.hotCity,             color:'#d97706' },
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
              <div style={{ fontSize:8, color:'#6b7280', letterSpacing:'0.1em', marginBottom:3 }}>{s.label}</div>
              <div style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono', color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>

        {/* Map */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            overflow: 'hidden',
            position: 'relative',
            minHeight: 580,
            boxShadow: '0 8px 20px rgba(15,23,42,0.06)',
          }}
        >
          <div style={{ position:'absolute', top:12, left:12, fontSize:9, color:'#6b7280', letterSpacing:'0.15em', zIndex:2, background:'rgba(255,255,255,0.9)', padding:'4px 8px', borderRadius:999, border:'1px solid #e5e7eb' }}>
            🇮🇳 INDIA — FINANCIAL CRIME HEATMAP
          </div>

          <svg ref={svgRef} style={{ width:'100%', height:580 }} />

          {/* Tooltip */}
          {tooltip && (
            <div
              style={{
                position: 'absolute',
                left: tooltip.x + 12,
                top: tooltip.y - 10,
                background: '#ffffff',
                border: `1px solid ${tooltip.color}`,
                borderRadius: 6,
                padding: '8px 12px',
                pointerEvents: 'none',
                zIndex: 10,
                minWidth: 130,
                boxShadow: '0 10px 25px rgba(15,23,42,0.15)',
              }}
            >
              <div style={{ fontSize:11, fontWeight:700, color:tooltip.color, marginBottom:4 }}>{tooltip.name}</div>
              <div style={{ fontSize:9, color:'#6b7280', marginBottom:2 }}>
                RISK:{' '}
                <span
                  style={{
                    color:
                      tooltip.risk > 70
                        ? '#b91c1c'
                        : tooltip.risk > 50
                        ? '#d97706'
                        : '#0b5ed7',
                    fontWeight: 700,
                  }}
                >
                  {tooltip.risk}/100
                </span>
              </div>
              <div style={{ fontSize:9, color:'#6b7280' }}>
                FLOW:{' '}
                <span style={{ color:'#111827', fontWeight:700 }}>{fmt(tooltip.amount)}</span>
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ position:'absolute', bottom:14, left:14, background:'rgba(255,255,255,0.95)', border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 10px', boxShadow:'0 8px 18px rgba(15,23,42,0.12)' }}>
            <div style={{ fontSize:8, color:'#6b7280', marginBottom:6, letterSpacing:'0.1em' }}>LEGEND</div>
            {[
              { color:'#b91c1c', label:'High risk city (>70)' },
              { color:'#d97706', label:'Medium risk (50–70)' },
              { color:'#0b5ed7', label:'Low risk (<50)' },
              { color:'#b91c1c', label:'Suspicious flow', dashed:true },
              { color:'#0b5ed7', label:'Normal flow', dashed:true },
            ].map((l,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                {l.dashed
                  ? <div style={{ width:18, height:1, borderTop:`2px dashed ${l.color}`, opacity:0.8 }} />
                  : <div style={{ width:10, height:10, borderRadius:'50%', background:l.color, flexShrink:0 }} />
                }
                <span style={{ fontSize:9, color:'#4b5563' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* City risk table */}
          <div style={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:8, padding:14, boxShadow:'0 4px 10px rgba(15,23,42,0.05)' }}>
            <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:12 }}>CITY RISK RANKINGS</div>
            {[...CITIES].sort((a,b) => b.risk - a.risk).map((c,i) => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:16, fontSize:9, color:'#9ca3af', fontFamily:'JetBrains Mono' }}>#{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:600, color: c.risk > 70 ? '#b91c1c' : c.risk > 50 ? '#d97706' : '#1d4ed8', marginBottom:2 }}>
                    {c.name}
                  </div>
                  <div style={{ height:3, background:'#e5e7eb', borderRadius:2 }}>
                    <div style={{ height:'100%', width:`${c.risk}%`, background: c.risk > 70 ? '#b91c1c' : c.risk > 50 ? '#d97706' : '#0b5ed7', borderRadius:2 }} />
                  </div>
                </div>
                <div style={{ fontSize:11, fontWeight:700, fontFamily:'JetBrains Mono', color: c.risk > 70 ? '#b91c1c' : c.risk > 50 ? '#d97706' : '#0b5ed7', width:28, textAlign:'right' }}>
                  {c.risk}
                </div>
              </div>
            ))}
          </div>

          {/* Suspicious flows */}
          <div style={{ background:'#ffffff', border:'1px solid #fecaca', borderRadius:8, padding:14, boxShadow:'0 4px 10px rgba(15,23,42,0.05)' }}>
            <div style={{ fontSize:9, color:'#b91c1c', letterSpacing:'0.15em', marginBottom:12 }}>🔴 SUSPICIOUS FLOWS</div>
            {FLOWS.filter(f => f.suspicious).map((f, i) => (
              <div key={i} style={{ padding:'8px 10px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:6, marginBottom:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontSize:11, fontFamily:'JetBrains Mono', color:'#b91c1c' }}>
                    {f.from} → {f.to}
                  </span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#d97706', fontFamily:'JetBrains Mono' }}>
                    {fmt(f.amount)}
                  </span>
                </div>
                <div style={{ fontSize:9, color:'#6b7280' }}>
                  CIRCULAR LAYERING — FLAGGED
                </div>
              </div>
            ))}
          </div>

          {/* Total stats */}
          <div style={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:8, padding:14, boxShadow:'0 4px 10px rgba(15,23,42,0.05)' }}>
            <div style={{ fontSize:9, color:'#6b7280', letterSpacing:'0.15em', marginBottom:10 }}>FLOW STATISTICS</div>
            {[
              { label:'Total monitored', value:fmt(stats.totalFlow),       color:'#0b5ed7' },
              { label:'Suspicious',      value:fmt(stats.suspiciousFlow),  color:'#b91c1c' },
              { label:'Clean flows',     value:fmt(stats.totalFlow - stats.suspiciousFlow), color:'#15803d' },
              { label:'Suspicious %',    value:`${Math.round(stats.suspiciousFlow/stats.totalFlow*100)||0}%`, color:'#d97706' },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:11, color:'#6b7280' }}>{s.label}</span>
                <span style={{ fontSize:12, fontWeight:700, fontFamily:'JetBrains Mono', color:s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}