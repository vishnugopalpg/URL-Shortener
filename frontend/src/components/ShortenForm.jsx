import React, { useState } from 'react'
import { shortenUrl } from '../api/urlApi'

const styles = {
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '2rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    maxWidth: 560,
    width: '100%',
  },
  title: { margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700 },
  field: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.875rem' },
  input: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    border: '1.5px solid #cbd5e0',
    borderRadius: 8,
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'background 0.2s',
  },
  buttonDisabled: { background: '#a5b4fc', cursor: 'not-allowed' },
  error: {
    background: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    color: '#c53030',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
}

export default function ShortenForm({ onSuccess }) {
  const [originalUrl, setOriginalUrl] = useState('')
  const [customAlias, setCustomAlias] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = { originalUrl }
      if (customAlias.trim()) payload.customAlias = customAlias.trim()
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString().replace('Z', '')
      const { data } = await shortenUrl(payload)
      onSuccess(data)
    } catch (err) {
      const msg =
        err.response?.data?.fields
          ? Object.values(err.response.data.fields).join(', ')
          : err.response?.data?.error || 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Shorten a URL</h2>
      {error && <div style={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="originalUrl">Long URL *</label>
          <input
            id="originalUrl"
            style={styles.input}
            type="url"
            placeholder="https://example.com/very/long/path"
            value={originalUrl}
            onChange={e => setOriginalUrl(e.target.value)}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="customAlias">Custom alias (optional)</label>
          <input
            id="customAlias"
            style={styles.input}
            type="text"
            placeholder="my-link"
            maxLength={20}
            value={customAlias}
            onChange={e => setCustomAlias(e.target.value)}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="expiresAt">Expiry date (optional)</label>
          <input
            id="expiresAt"
            style={styles.input}
            type="datetime-local"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
          />
        </div>
        <button
          type="submit"
          style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
          disabled={loading}
        >
          {loading ? 'Shortening…' : 'Shorten'}
        </button>
      </form>
    </div>
  )
}
