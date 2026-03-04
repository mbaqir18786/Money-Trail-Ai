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
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#080f1e',
          color: '#e8f4ff',
          border: '1px solid #0f2040',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          borderRadius: '4px',
        }
      }} />
     
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