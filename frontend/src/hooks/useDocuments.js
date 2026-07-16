import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { deleteDocument, getDocuments, getSessionDocs, uploadDocument } from '../services/api'

export function useDocuments(sessionId = null) {
  return useQuery({
    queryKey: sessionId ? ['documents', sessionId] : ['documents'],
    queryFn: () => sessionId ? getSessionDocs(sessionId) : getDocuments(),
    select: (data) => data.documents ?? [],
  })
}

export function useUploadDocument(sessionId = null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, onProgress }) => uploadDocument(file, onProgress, sessionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionId ? ['documents', sessionId] : ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success(`"${data.filename}" uploaded (${data.chunk_count} chunks)`)
    },
    onError: (err) => toast.error(`Upload failed: ${err.message}`),
  })
}

export function useDeleteDocument(sessionId = null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (docId) => deleteDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionId ? ['documents', sessionId] : ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Document deleted')
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  })
}
