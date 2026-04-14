import React, { useState } from 'react'
import ShortenForm from './components/ShortenForm'
import ResultCard from './components/ResultCard'
import StatsView from './components/StatsView'
import HistoryList from './components/HistoryList'

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem 1rem',
    background: 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)',
  },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  appTitle: {
    fontSize: '2.2rem',
    fontWeight: 800,
    margin: '0 0 0.5rem',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  appSubtitle: { color: '#718096', fontSize: '1rem', margin: 0 },
  content: { width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  footer: { marginTop: 'auto', paddingTop: '3rem', color: '#a0aec0', fontSize: '0.8rem' },
}

const LAST_RESULT_KEY = 'urlshortener_last_result'
const HISTORY_KEY = 'urlshortener_history'
const HISTORY_LIMIT = 20

function readStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota exceeded, ignore */ }
}

export default function App() {
  const [result, setResult] = useState(() => readStorage(LAST_RESULT_KEY))
  const [history, setHistory] = useState(() => readStorage(HISTORY_KEY) ?? [])
  const [statsCode, setStatsCode] = useState(null)

  function handleSuccess(data) {
    // Persist the most-recent result so it survives a page refresh
    setResult(data)
    writeStorage(LAST_RESULT_KEY, data)

    // Prepend to history, deduplicate by shortCode, cap at HISTORY_LIMIT
    setHistory(prev => {
      const next = [data, ...prev.filter(h => h.shortCode !== data.shortCode)]
                       .slice(0, HISTORY_LIMIT)
      writeStorage(HISTORY_KEY, next)
      return next
    })

    setStatsCode(null)
  }

  function handleReset() {
    setResult(null)
    setStatsCode(null)
    try { localStorage.removeItem(LAST_RESULT_KEY) } catch { /* ignore */ }
  }

  function handleViewStats(code) {
    setStatsCode(code)
  }

  function handleBack() {
    setStatsCode(null)
  }

  function handleClearHistory() {
    setHistory([])
    setResult(null)
    try {
      localStorage.removeItem(HISTORY_KEY)
      localStorage.removeItem(LAST_RESULT_KEY)
    } catch { /* ignore */ }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.appTitle}>URL Shortener</h1>
        <p style={styles.appSubtitle}>Paste a long URL, get a short link instantly</p>
      </header>

      <div style={styles.content}>
        {statsCode ? (
          <StatsView code={statsCode} onBack={handleBack} />
        ) : (
          <>
            <ShortenForm onSuccess={handleSuccess} />

            {result && (
              <ResultCard
                data={result}
                onViewStats={handleViewStats}
                onReset={handleReset}
              />
            )}

            <HistoryList
              history={history}
              onViewStats={handleViewStats}
              onClear={handleClearHistory}
            />
          </>
        )}
      </div>

      <footer style={styles.footer}>
        Built with Spring Boot + React
      </footer>
    </div>
  )
}
