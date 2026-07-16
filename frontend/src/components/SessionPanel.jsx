/**
 * Session management panel — shown above the document list.
 * Create new sessions, switch between them, delete unwanted ones.
 */

import { useState } from 'react'
import { Plus, Trash2, FolderOpen, Folder, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { useCreateSession, useDeleteSession, useSessions } from '../hooks/useSessions'

export default function SessionPanel({ activeSessionId, onSelectSession }) {
  const { data: sessions = [], isError } = useSessions()
  const createMutation = useCreateSession()
  const deleteMutation = useDeleteSession()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const session = await createMutation.mutateAsync(name)
    setNewName('')
    setCreating(false)
    onSelectSession(session.id)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this session and all its documents?')) return
    deleteMutation.mutate(id)
    if (activeSessionId === id) onSelectSession(null)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Sessions
        </h2>
        <button
          onClick={() => setCreating((v) => !v)}
          aria-label="New session"
          className="p-1 rounded text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New session input */}
      {creating && (
        <form onSubmit={handleCreate} className="flex gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Session name…"
            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={!newName.trim() || createMutation.isPending}
            className="px-2 py-1.5 text-xs rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
          >
            Create
          </button>
        </form>
      )}

      {isError && (
        <div className="flex items-center gap-1 text-red-500 text-xs">
          <AlertCircle className="w-3.5 h-3.5" /> Failed to load sessions
        </div>
      )}

      {/* Global (no session) option */}
      <button
        onClick={() => onSelectSession(null)}
        className={clsx(
          'flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left',
          activeSessionId === null
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
        )}
      >
        {activeSessionId === null
          ? <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          : <Folder className="w-3.5 h-3.5 shrink-0" />}
        All Documents
      </button>

      {/* Session list */}
      {sessions.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelectSession(s.id)}
          className={clsx(
            'group flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left w-full',
            activeSessionId === s.id
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
          )}
        >
          {activeSessionId === s.id
            ? <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            : <Folder className="w-3.5 h-3.5 shrink-0" />}
          <span className="flex-1 truncate">{s.name}</span>
          <span className="text-gray-400 shrink-0">{s.document_ids?.length ?? 0} doc{s.document_ids?.length !== 1 ? 's' : ''}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => handleDelete(e, s.id)}
            onKeyDown={(e) => e.key === 'Enter' && handleDelete(e, s.id)}
            aria-label={`Delete session ${s.name}`}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all rounded"
          >
            <Trash2 className="w-3 h-3" />
          </span>
        </button>
      ))}

      {sessions.length === 0 && !creating && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
          No sessions yet. Click + to create one.
        </p>
      )}
    </div>
  )
}
