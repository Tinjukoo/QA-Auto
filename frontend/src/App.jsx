import { Routes, Route } from 'react-router-dom'
import QARecorder from './pages/QARecorder'
import RunDetail from './pages/RunDetail'

function App() {
  return (
    <Routes>
      <Route path="/" element={<QARecorder />} />
      <Route path="/runs/:id" element={<RunDetail />} />
    </Routes>
  )
}

export default App
