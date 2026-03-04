import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import axios from 'axios'

const API = 'http://localhost:5001'

export default function GraphView() {
  const svgRef = useRef(null)
  const [graphData, setGraphData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({ nodes: 0, edges: 0, fraud: 0 })

  useEffect(() => {
    axios.get(`${API}/api/graph`).then(res => {
      setGraphData(res.data)
      setLoading(false)
      setStats({
        nodes: res.data.nodes.length,
        edges: res.data.edges.length,
        fraud: res.data.nodes.filter(n => n.risk > 80).length
      })
    })
  }, [])

  useEffect(() => {
    if (!graphData || !svgRef.current) return
    buildGraph(graphData, filter)
  }, [graphData, filter])

  const buildGraph = ({ nodes, edges }, filterMode) => {
    const el = svgRef.current
    const width = el.clientWidth || 900
    const height = el.clientHeight || 600

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el).attr('width', width).attr('height', height)

    const defs = svg.append('defs')

    defs.append('pattern')
      .attr('id', 'grid').attr('width', 40).attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('path').attr('d', 'M 40 0 L 0 0 0 40')
      .attr('fill', 'none').attr('stroke', '#e5e7eb').attr('stroke-width', '0.5')

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#f9fafb')
      .attr('stroke', 'none')
      .attr('opacity', 1)
      .attr('pointer-events', 'all')
      .attr('fill', 'url(#grid)')

    defs.append('marker').attr('id', 'arrow-normal')
      .attr('viewBox', '0 -4 8 8').attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#1a3a6b')

    defs.append('marker').attr('id', 'arrow-fraud')
      .attr('viewBox', '0 -4 8 8').attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#ff2a4a')

    const g = svg.append('g')
    svg.call(d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform)))

    let filteredNodes = nodes
    let filteredEdges = edges
    if (filterMode === 'fraud') {
      const fraudIds = new Set(nodes.filter(n => n.risk > 80).map(n => n.id))
      filteredEdges = edges.filter(e => fraudIds.has(typeof e.source === 'object' ? e.source.id : e.source) || fraudIds.has(typeof e.target === 'object' ? e.target.id : e.target))
      const edgeIds = new Set([...filteredEdges.map(e => typeof e.source === 'object' ? e.source.id : e.source), ...filteredEdges.map(e => typeof e.target === 'object' ? e.target.id : e.target)])
      filteredNodes = nodes.filter(n => edgeIds.has(n.id) || fraudIds.has(n.id))
    }

    const simulation = d3.forceSimulation(filteredNodes)
      .force('link', d3.forceLink(filteredEdges).id(d => d.id).distance(70))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(25))

    const link = g.append('g').selectAll('line').data(filteredEdges).join('line')
      .attr('stroke', d => d.suspicious ? '#b91c1c' : '#9ca3af')
      .attr('stroke-opacity', d => d.suspicious ? 0.75 : 0.6)
      .attr('stroke-width', d => d.suspicious ? 2 : 1)
      .attr('marker-end', d => d.suspicious ? 'url(#arrow-fraud)' : 'url(#arrow-normal)')

    const nodeGroup = g.append('g').selectAll('g').data(filteredNodes).join('g')
      .style('cursor', 'pointer')
      .on('click', (e, d) => setSelected(d))
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )

    nodeGroup.filter(d => d.risk > 80).append('circle')
      .attr('r', 22).attr('fill', 'none')
      .attr('stroke', '#ff2a4a').attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3').attr('opacity', 0.6)

    nodeGroup.append('circle')
      .attr('r', d => d.risk > 80 ? 16 : d.risk > 50 ? 13 : 10)
      .attr('fill', d => d.risk > 80 ? '#fee2e2' : d.risk > 50 ? '#fef3c7' : '#e0f2fe')
      .attr('stroke', d => d.risk > 80 ? '#b91c1c' : d.risk > 50 ? '#d97706' : '#0b5ed7')
      .attr('stroke-width', d => d.risk > 80 ? 2 : 1)

    nodeGroup.append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.3em')
      .attr('font-size', d => d.risk > 80 ? '8px' : '7px')
      .attr('fill', d => d.risk > 80 ? '#b91c1c' : d.risk > 50 ? '#d97706' : '#1d4ed8')
      .attr('font-family', 'JetBrains Mono')
      .text(d => d.id.slice(-4))

    nodeGroup.append('text')
      .attr('text-anchor', 'middle').attr('dy', 30)
      .attr('font-size', '8px').attr('fill', '#6b7280')
      .attr('font-family', 'JetBrains Mono')
      .text(d => d.name?.split(' ')[0]?.slice(0, 8) || '')

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`)
    })
  }

  return (
    <div style={{ height: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.2em', marginBottom: '4px' }}>NETWORK ANALYSIS</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Rajdhani', letterSpacing: '0.05em' }}>
            TRANSACTION GRAPH
          </h1>
        </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[
              { label: 'NODES', value: stats.nodes, color: '#0b5ed7' },
              { label: 'EDGES', value: stats.edges, color: '#0891b2' },
              { label: 'FRAUD', value: stats.fraud, color: '#b91c1c' },
            ].map(s => (
              <div
                key={s.label}
                style={{
                  padding: '6px 12px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  textAlign: 'center',
                  boxShadow: '0 4px 10px rgba(15,23,42,0.05)',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    fontFamily: 'JetBrains Mono',
                    color: s.color,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: '8px',
                    color: '#6b7280',
                    letterSpacing: '0.1em',
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            {['all', 'fraud'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                  background: filter === f ? '#e0f2fe' : '#ffffff',
                  border: `1px solid ${filter === f ? '#60a5fa' : '#d1d5db'}`,
                  color: filter === f ? '#1d4ed8' : '#4b5563',
                }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginLeft: '8px' }}>
            {[['#b91c1c', 'HIGH RISK'], ['#d97706', 'SUSPICIOUS'], ['#0b5ed7', 'NORMAL']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: c,
                  }}
                />
                <span style={{ fontSize: '9px', color: '#6b7280', letterSpacing: '0.1em' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '12px', minHeight: 0 }}>
        <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative' }}>
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '12px',
                background: 'rgba(255,255,255,0.8)',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  border: '2px solid #e5e7eb',
                  borderTopColor: '#0b5ed7',
                  borderRadius: '50%',
                  animation: 'rotate 0.8s linear infinite',
                }}
              />
              <span style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.1em' }}>
                BUILDING NETWORK...
              </span>
            </div>
          )}
          <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '9px', color: '#6b7280', background: 'rgba(255,255,255,0.9)', padding: '4px 8px', borderRadius: '999px', border: '1px solid #e5e7eb' }}>
            SCROLL TO ZOOM · DRAG TO PAN · CLICK NODE FOR DETAILS
          </div>
        </div>

        {selected && (
          <div
            className="card"
            style={{
              width: '260px',
              animation: 'slideRight 0.3s ease',
              flexShrink: 0,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '9px', color: '#5a7fa8', letterSpacing: '0.15em' }}>ACCOUNT DETAILS</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#5a7fa8', fontSize: '16px', padding: 0 }}>×</button>
            </div>

            <div
              style={{
                padding: '10px',
                marginBottom: '16px',
                borderRadius: '6px',
                background: selected.risk > 80 ? '#fef2f2' : '#eff6ff',
                border: `1px solid ${
                  selected.risk > 80 ? '#fecaca' : '#bfdbfe'
                }`,
                textAlign: 'center',
              }}
            >
              <div style={{
                fontSize: '36px',
                fontWeight: '700',
                fontFamily: 'JetBrains Mono',
                color:
                  selected.risk > 80
                    ? '#b91c1c'
                    : selected.risk > 50
                    ? '#d97706'
                    : '#15803d',
              }}
            >
                {selected.risk}
              </div>
              <div style={{ fontSize: '9px', color: '#6b7280', letterSpacing: '0.1em' }}>
                RISK SCORE / 100
              </div>
            </div>

              {[
                { label: 'ACCOUNT ID', value: selected.id },
                { label: 'NAME', value: selected.name },
                { label: 'TYPE', value: selected.type },
                { label: 'LOCATION', value: selected.branch },
                { label: 'TRANSACTIONS', value: selected.txnCount || '—' },
                {
                  label: 'TOTAL VOLUME',
                  value: selected.totalAmount
                    ? `₹${Math.round(selected.totalAmount).toLocaleString('en-IN')}`
                    : '—',
                },
                {
                  label: 'STATUS',
                  value:
                    selected.risk > 80
                      ? '🔴 HIGH RISK'
                      : selected.risk > 50
                      ? '🟡 SUSPICIOUS'
                      : '🟢 CLEAR',
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    marginBottom: '10px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#6b7280',
                      letterSpacing: '0.1em',
                      marginBottom: '2px',
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#111827',
                      fontFamily: 'JetBrains Mono',
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}

            {selected.risk > 80 && (
              <button
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: '700',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  letterSpacing: '0.1em',
                  marginTop: '8px',
                }}
              >
                ◈ FLAG FOR INVESTIGATION
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}