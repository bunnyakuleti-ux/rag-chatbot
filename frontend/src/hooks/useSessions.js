import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createSession, deleteSession, getSessions } from '../services/api'

const SESSIONS_KEY = ['sessions']

export function useSessions() {
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: getSessions,
    select: (data) => data.sessions ?? [],
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name) => createSession(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY })
      toast.success(`Session "${data.name}" created`)
    },
    onError: (err) => toast.error(`Failed to create session: ${err.message}`),
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Session deleted')
    },
    onError: (err) => toast.error(`Failed to delete session: ${err.message}`),
  })
}
