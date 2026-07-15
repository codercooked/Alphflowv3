import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import StockAnalysisPage from './pages/StockAnalysisPage'
import IPOPage from './pages/IPOPage'
import TrackRecordPage from './pages/TrackRecordPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/stock" element={<StockAnalysisPage />} />
      <Route path="/stock/:ticker" element={<StockAnalysisPage />} />
      <Route path="/stocks" element={<StockAnalysisPage />} />
      <Route path="/stocks/:ticker" element={<StockAnalysisPage />} />
      <Route path="/ipos" element={<IPOPage />} />
      <Route path="/track-record" element={<TrackRecordPage />} />
    </Routes>
  )
}

export default App