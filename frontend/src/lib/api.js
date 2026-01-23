const API_BASE = '/api'

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body)
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

// Tests API
export const tests = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/tests${query ? `?${query}` : ''}`)
  },
  get: (id) => request(`/tests/${id}`),
  create: (data) => request('/tests', { method: 'POST', body: data }),
  update: (id, data) => request(`/tests/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/tests/${id}`, { method: 'DELETE' }),
  duplicate: (id) => request(`/tests/${id}/duplicate`, { method: 'POST' }),
  runs: (id, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/tests/${id}/runs${query ? `?${query}` : ''}`)
  },
}

// Suites API
export const suites = {
  list: () => request('/suites'),
  get: (id) => request(`/suites/${id}`),
  create: (data) => request('/suites', { method: 'POST', body: data }),
  update: (id, data) => request(`/suites/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/suites/${id}`, { method: 'DELETE' }),
  run: (id) => request(`/suites/${id}/run`, { method: 'POST' }),
}

// Runs API
export const runs = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/runs${query ? `?${query}` : ''}`)
  },
  get: (id) => request(`/runs/${id}`),
  create: (data) => request('/runs', { method: 'POST', body: data }),
  rerun: (id) => request(`/runs/${id}/rerun`, { method: 'POST' }),
  cancel: (id) => request(`/runs/${id}/cancel`, { method: 'POST' }),
  stats: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/runs/stats/summary${query ? `?${query}` : ''}`)
  },
}

// Webhooks API
export const webhooks = {
  list: () => request('/webhooks'),
  events: () => request('/webhooks/events'),
  get: (id) => request(`/webhooks/${id}`),
  create: (data) => request('/webhooks', { method: 'POST', body: data }),
  update: (id, data) => request(`/webhooks/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/webhooks/${id}`, { method: 'DELETE' }),
  test: (id) => request(`/webhooks/${id}/test`, { method: 'POST' }),
}

// Schedules API
export const schedules = {
  list: () => request('/schedules'),
  get: (id) => request(`/schedules/${id}`),
  create: (data) => request('/schedules', { method: 'POST', body: data }),
  update: (id, data) => request(`/schedules/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/schedules/${id}`, { method: 'DELETE' }),
  trigger: (id) => request(`/schedules/${id}/trigger`, { method: 'POST' }),
}

export default { tests, suites, runs, webhooks, schedules }
