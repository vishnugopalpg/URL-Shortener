import React from 'react'

const styles = {
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '1.5rem 2rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    maxWidth: 560,
    width: '100%',
    marginTop: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: { margin: 0, fontSize: '1rem', fontWeight: 700, color: '#2d3748' },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#a0aec0',
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.6rem 0',
    borderTop: '1px solid #f0f4f8',
    gap: 8,
  },
  info: { flex: 1, minWidth: 0 },
  shortLink: {
    color: '#4f46e5',
    fontWeight: 600,
    fontSize: '0.9rem',
    textDecoration: 'none',
    display: 'block',
  },
  originalUrl: {
    color: '#a0aec0',
    fontSize: '0.78rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
    marginTop: 2,
  },
  badge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 4,
    marginLeft: 6,
  },
  activeBadge: { background: '#c6f6d5', color: '#276749' },
  inactiveBadge: { background: '#fed7d7', color: '#c53030' },
  statsBtn: {
    flexShrink: 0,
    padding: '0.35rem 0.75rem',
    background: '#ebf8ff',
    color: '#2b6cb0',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
}

export default function HistoryList({ history, onViewStats, onClear }) {
  if (!history.length) return null

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Recent links ({history.length})</h3>
        <button style={styles.clearBtn} onClick={onClear} title="Clear history">
          Clear all
        </button>
      </div>

      {history.map(item => (
        <div key={item.shortCode} style={styles.row}>
          <div style={styles.info}>
            <span>
              <a
                href={item.shortUrl}
                target="_blank"
                rel="noreferrer"
                style={styles.shortLink}
              >
                {item.shortUrl}
              </a>
            </span>
            <span style={styles.originalUrl} title={item.originalUrl}>
              {item.originalUrl}
            </span>
          </div>
          <button style={styles.statsBtn} onClick={() => onViewStats(item.shortCode)}>
            Stats
          </button>
        </div>
      ))}
    </div>
  )
}
