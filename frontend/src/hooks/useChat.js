import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { sendChatMessage } from '../services/api'

export function useChat(sessionId = null) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (query) => {
    if (!query.trim() || isLoading) return

    const userMsg = { id: Date.now(), role: 'user', content: query }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    const history = messages.map(({ role, content }) => ({ role, content }))

    try {
      const data = await sendChatMessage(query, history, sessionId)
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer,
        sources: data.sources ?? [],
      }])
    } catch (err) {
      toast.error(err.message || 'Failed to get a response')
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, sessionId])

  const clearConversation = useCallback(() => setMessages([]), [])

  return { messages, isLoading, sendMessage, clearConversation }
}
