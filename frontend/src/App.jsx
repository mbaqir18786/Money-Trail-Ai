import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import TickerTape from './components/TickerTape'
import Dashboard from './pages/Dashboard'
import GraphView from './pages/GraphView'
import Investigation from './pages/Investigation'
import IndiaMap from './pages/IndiaMap'
import Intelligence from './pages/Intelligence.jsx'
import Alerts from './pages/Alerts'


export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #d1d5db',
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '13px',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
          },
        }}
      />
     
      <TickerTape />
      <div style={{ display: 'flex', minHeight: '100vh', paddingTop: '32px' }}>
        <Navbar />
        <main style={{ flex: 1, marginLeft: '200px', padding: '20px 24px', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/graph" element={<GraphView />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/investigation" element={<Investigation />} />
            <Route path="/map" element={<IndiaMap />} />
              <Route path="/intelligence" element={<Intelligence />} />
              
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}