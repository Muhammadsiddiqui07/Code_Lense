async function request (path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const addRepo = repoUrl =>
  request('/api/repos', { method: 'POST', body: JSON.stringify({ repoUrl }) })

export const listRepos = () => request('/api/repos')
export const getRepo = id => request(`/api/repos/${id}`)
export const getChat = repoId => request(`/api/chat/${repoId}`)
export const askQuestion = (repoId, question) =>
  request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ repoId, question })
  })
