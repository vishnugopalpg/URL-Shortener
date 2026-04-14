import React, { useEffect, useState } from 'react'

function formatUtc(dtString) {
  if (!dtString) return ''
  return new Date(dtString + 'Z').toLocaleString()
}
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getStats, deleteUrl } from '../api/urlApi'

const styles = {
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '2rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    maxWidth: 700,
    width: '100%',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  title: { margin: 0, fontSize: '1.4rem', fontWeight: 700 },
  subtitle: { color: '#718096', fontSize: '0.875rem', marginTop: 4 },
  bigCount: { fontSize: '3.5rem', fontWeight: 800, color: '#4f46e5', lineHeight: 1 },
  countLabel: { color: '#718096', fontSize: '0.875rem', marginTop: 4 },
  section: { marginTop: '2rem' },
  sectionTitle: { fontWeight: 700, marginBottom: '1rem', color: '#2d3748' },
  actions: { display: 'flex', gap: 8, marginTop: '2rem' },
  btn: {
    flex: 1,
    padding: '0.65rem',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  backBtn: { background: '#f7fafc', color: '#4a5568', border: '1.5px solid #e2e8f0' },
  deactivateBtn: { background: '#fff5f5', color: '#c53030', border: '1.5px solid #fed7d7' },
  deactivatedBadge: {
    display: 'inline-block',
    background: '#fed7d7',
    color: '#c53030',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginLeft: 8,
  },
  activeBadge: {
    display: 'inline-block',
    background: '#c6f6d5',
    color: '#276749',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginLeft: 8,
  },
  loading: { textAlign: 'center', padding: '3rem', color: '#718096' },
  error: {
    background: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    color: '#c53030',
    fontSize: '0.875rem',
  },
  link: { color: '#4f46e5', fontWeight: 600 },
  originalUrl: {
    color: '#4a5568',
    fontSize: '0.875rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 400,
    display: 'block',
    marginTop: 4,
  },
}

function groupClicksByDay(timestamps) {
  const counts = {}
  for (const ts of timestamps) {
    const day = ts.split('T')[0]
    counts[day] = (counts[day] || 0) + 1
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export default function StatsView({ code, onBack }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivated, setDeactivated] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getStats(code)
      .then(({ data }) => { if (!cancelled) setStats(data) })
      .catch(() => { if (!cancelled) setError('Failed to load stats. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [code])

  async function handleDeactivate() {
    if (!window.confirm('Are you sure you want to deactivate this link? It will no longer redirect visitors.')) return
    setDeactivating(true)
    try {
      await deleteUrl(code)
      setDeactivated(true)
      setStats(prev => ({ ...prev, isActive: false }))
    } catch {
      setError('Failed to deactivate link.')
    } finally {
      setDeactivating(false)
    }
  }

  if (loading) return <div style={styles.loading}>Loading stats…</div>
  if (error) return <div style={styles.card}><div style={styles.error}>{error}</div></div>
  if (!stats) return null

  const chartData = groupClicksByDay(stats.clickTimestamps || [])

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            Stats for /{stats.shortCode}
            {stats.isActive
              ? <span style={styles.activeBadge}>Active</span>
              : <span style={styles.deactivatedBadge}>Deactivated</span>}
          </h2>
          <a href={stats.shortUrl} target="_blank" rel="noreferrer" style={styles.link}>
            {stats.shortUrl}
          </a>
          <span style={styles.originalUrl} title={stats.originalUrl}>{stats.originalUrl}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={styles.bigCount}>{stats.clickCount}</div>
          <div style={styles.countLabel}>total clicks</div>
        </div>
      </div>

      {stats.expiresAt && (
        <p style={{ color: '#e53e3e', fontSize: '0.875rem', margin: '0 0 1rem' }}>
          Expires: {formatUtc(stats.expiresAt)}
        </p>
      )}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Clicks over time</div>
        {chartData.length === 0 ? (
          <p style={{ color: '#a0aec0', fontSize: '0.875rem' }}>No clicks recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#718096' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#718096' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: '0.875rem' }}
                labelFormatter={l => `Date: ${l}`}
                formatter={v => [v, 'Clicks']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#4f46e5' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.actions}>
        <button style={{ ...styles.btn, ...styles.backBtn }} onClick={onBack}>
          Back
        </button>
        {stats.isActive && (
          <button
            style={{ ...styles.btn, ...styles.deactivateBtn }}
            onClick={handleDeactivate}
            disabled={deactivating}
          >
            {deactivating ? 'Deactivating…' : 'Deactivate link'}
          </button>
        )}
      </div>
    </div>
  )
}
