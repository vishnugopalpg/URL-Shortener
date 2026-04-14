import axios from 'axios'

const client = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
})

export function shortenUrl(payload) {
  return client.post('/api/urls', payload)
}

export function getStats(code) {
  return client.get(`/api/urls/${code}/stats`)
}

export function deleteUrl(code) {
  return client.delete(`/api/urls/${code}`)
}
