import { useState } from 'react'
import Header from './components/Header'
import DocumentPanel from './components/DocumentPanel'
import ChatWindow from './components/ChatWindow'
import SessionPanel from './components/SessionPanel'
import StatusBar from './components/StatusBar'
import { useSessions } from './hooks/useSessions'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const { data: sessions = [] } = useSessions()

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  const handleSelectSession = (id) => {
    setActiveSessionId(id)
    setSidebarOpen(false)   // close drawer on mobile after selection
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Header onMenuClick={() => setSidebarOpen((v) => !v)} />

      <main className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={[
            'flex flex-col w-72 xl:w-80 border-r border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-900 p-4 overflow-y-auto shrink-0 z-30 gap-4',
            'md:flex md:static',
            sidebarOpen ? 'fixed inset-y-0 left-0 flex' : 'hidden',
          ].join(' ')}
        >
          {/* Sessions */}
          <SessionPanel
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
          />

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Documents for active session */}
          <DocumentPanel sessionId={activeSessionId} />
        </aside>

        {/* Chat */}
        <section className="flex flex-col flex-1 min-w-0 bg-gray-50 dark:bg-gray-950">
          <ChatWindow
            sessionId={activeSessionId}
            sessionName={activeSession?.name ?? null}
          />
        </section>
      </main>

      <StatusBar />
    </div>
  )
}
