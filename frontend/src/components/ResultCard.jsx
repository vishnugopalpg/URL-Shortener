import React, { useState } from 'react'

// The backend serialises LocalDateTime without a timezone designator.
// The JVM (and Docker containers) default to UTC, so we append 'Z' to tell
// the browser the value is UTC — then toLocaleString() converts to local time.
function formatUtc(dtString) {
  if (!dtString) return ''
  return new Date(dtString + 'Z').toLocaleString()
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '2rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    maxWidth: 560,
    width: '100%',
    marginTop: '1.5rem',
  },
  title: { margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 700, color: '#22543d' },
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' },
  label: { fontWeight: 600, fontSize: '0.8rem', color: '#718096', minWidth: 90 },
  shortLink: { color: '#4f46e5', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' },
  originalUrl: {
    color: '#4a5568',
    fontSize: '0.875rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 320,
  },
  copyBtn: {
    padding: '0.3rem 0.7rem',
    background: '#e9d8fd',
    color: '#553c9a',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  actions: { display: 'flex', gap: 8, marginTop: '1rem' },
  btn: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  statsBtn: { background: '#ebf8ff', color: '#2b6cb0' },
  resetBtn: { background: '#f7fafc', color: '#4a5568', border: '1.5px solid #e2e8f0' },
  copied: { color: '#276749', fontWeight: 700, fontSize: '0.8rem' },
  expiry: { color: '#e53e3e', fontSize: '0.8rem' },
}

export default function ResultCard({ data, onViewStats, onReset }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(data.shortUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Link created!</h3>

      <div style={styles.row}>
        <span style={styles.label}>Short URL</span>
        <a href={data.shortUrl} target="_blank" rel="noreferrer" style={styles.shortLink}>
          {data.shortUrl}
        </a>
        <button style={styles.copyBtn} onClick={handleCopy}>
          {copied ? <span style={styles.copied}>Copied!</span> : 'Copy'}
        </button>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Original</span>
        <span style={styles.originalUrl} title={data.originalUrl}>{data.originalUrl}</span>
      </div>

      {data.expiresAt && (
        <div style={styles.row}>
          <span style={styles.label}>Expires</span>
          <span style={styles.expiry}>{formatUtc(data.expiresAt)}</span>
        </div>
      )}

      <div style={styles.actions}>
        <button style={{ ...styles.btn, ...styles.statsBtn }} onClick={() => onViewStats(data.shortCode)}>
          View stats
        </button>
        <button style={{ ...styles.btn, ...styles.resetBtn }} onClick={onReset}>
          Shorten another
        </button>
      </div>
    </div>
  )
}
