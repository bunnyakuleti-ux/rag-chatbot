import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  },
)

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export const createSession  = async (name) => { const { data } = await api.post('/sessions', { name }); return data }
export const getSessions    = async () => { const { data } = await api.get('/sessions'); return data }
export const deleteSession  = async (id) => { const { data } = await api.delete(`/sessions/${id}`); return data }
export const getSessionDocs = async (id) => { const { data } = await api.get(`/sessions/${id}/documents`); return data }

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export const uploadDocument = async (file, onProgress, sessionId = null) => {
  const formData = new FormData()
  formData.append('file', file)
  const url = sessionId ? `/sessions/${sessionId}/upload` : '/upload'
  const { data } = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total))
    },
  })
  return data
}

export const getDocuments  = async () => { const { data } = await api.get('/documents'); return data }
export const deleteDocument = async (docId) => { const { data } = await api.delete(`/documents/${docId}`); return data }

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
export const sendChatMessage = async (query, conversationHistory = [], sessionId = null, documentIds = null) => {
  const { data } = await api.post('/chat', {
    query,
    conversation_history: conversationHistory,
    session_id: sessionId,
    document_ids: documentIds,
    top_k: 5,
  })
  return data
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export const getHealth = async () => { const { data } = await api.get('/health'); return data }

export default api
