import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tests from './pages/Tests'
import TestDetail from './pages/TestDetail'
import TestEditor from './pages/TestEditor'
import Suites from './pages/Suites'
import SuiteDetail from './pages/SuiteDetail'
import Runs from './pages/Runs'
import RunDetail from './pages/RunDetail'
import Webhooks from './pages/Webhooks'
import Schedules from './pages/Schedules'
import Recorder from './pages/Recorder'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/tests/new" element={<TestEditor />} />
        <Route path="/tests/:id" element={<TestDetail />} />
        <Route path="/tests/:id/edit" element={<TestEditor />} />
        <Route path="/suites" element={<Suites />} />
        <Route path="/suites/:id" element={<SuiteDetail />} />
        <Route path="/runs" element={<Runs />} />
        <Route path="/runs/:id" element={<RunDetail />} />
        <Route path="/webhooks" element={<Webhooks />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/recorder" element={<Recorder />} />
      </Routes>
    </Layout>
  )
}

export default App
