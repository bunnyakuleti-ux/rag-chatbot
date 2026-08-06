'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatMessage from './components/ChatMessage';
import UploadButton from './components/UploadButton';
import SourcesDrawer from './components/SourcesDrawer';
import EmptyState from './components/EmptyState';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  streaming?: boolean;
};

export type Source = {
  content: string;
  source: string;
  page: number;
};

export default function Home() {
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [activeSources, setActiveSources] = useState<Source[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpload = useCallback((filename: string) => {
    setUploadedFiles(prev => [...prev, filename]);
    setMessages(prev => [
      ...prev,
      {
        id: uuidv4(),
        role: 'assistant',
        content: `✅ **"${filename}"** has been indexed. You can now ask questions about it.`,
      },
    ]);
  }, []);

  const sendMessage = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: Message = { id: uuidv4(), role: 'user', content: q };
    const assistantId = uuidv4();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    try {
      const res = await fetch(`/api/chat?question=${encodeURIComponent(q)}`);

      if (!res.ok || !res.body) {
        const err = await res.text();
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: `❌ Error: ${err}`, streaming: false }
              : m
          )
        );
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let sourcesJson = '';
      let inSources = false;
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        let nextLineIsError = false;

        for (const line of lines) {
          if (line.startsWith('event: error')) {
            nextLineIsError = true;
            continue;
          }
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            if (nextLineIsError) {
              hasError = true;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: `❌ ${data}`, streaming: false } : m
                )
              );
              nextLineIsError = false;
              break;
            }
            if (data.startsWith('__SOURCES__')) {
              inSources = true;
              sourcesJson = data.replace('__SOURCES__', '');
            } else if (inSources) {
              sourcesJson += data;
            } else {
              fullText += data.replace(/\\n/g, '\n');
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullText } : m
                )
              );
            }
          } else {
            nextLineIsError = false;
          }
        }
        if (hasError) break;
      }

      // Parse sources if present
      let sources: Source[] = [];
      if (sourcesJson) {
        try { sources = JSON.parse(sourcesJson); } catch {}
      }

      if (!hasError) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: fullText, streaming: false, sources }
              : m
          )
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `❌ ${msg}`, streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto px-4">
      {/* Header */}
      <header className="flex items-center justify-between py-4 border-b border-[#334155] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <div>
            <h1 className="text-lg font-bold text-[#F1F5F9] leading-tight">RAG Chatbot</h1>
            <p className="text-xs text-[#94A3B8]">Chat with PDFs · LangChain + Groq + TF-IDF</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {uploadedFiles.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] rounded-lg px-3 py-1.5">
              <span className="text-[#38BDF8] text-xs font-semibold">
                📁 {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} indexed
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map(msg => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onViewSources={() => setActiveSources(msg.sources ?? null)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input Bar */}
      <div className="flex-shrink-0 pb-4 pt-2">
        <div className="flex items-end gap-2 bg-[#1E293B] border border-[#334155] rounded-2xl px-4 py-3 focus-within:border-[#3B82F6] transition-colors">
          <UploadButton onUpload={handleUpload} disabled={loading} />
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              uploadedFiles.length === 0
                ? 'Upload a PDF first, then ask a question…'
                : 'Ask a question about your documents… (Enter to send)'
            }
            rows={1}
            className="flex-1 bg-transparent text-[#F1F5F9] placeholder-[#475569] text-sm resize-none outline-none max-h-32 overflow-y-auto leading-relaxed"
            style={{ minHeight: '24px' }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-[#334155] disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all"
            aria-label="Send message"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Thinking</span>
              </span>
            ) : '↑ Send'}
          </button>
        </div>
        <p className="text-center text-xs text-[#475569] mt-2">
          Shift+Enter for new line · answers are grounded in your documents only
        </p>
      </div>

      {/* Sources Drawer */}
      {activeSources && (
        <SourcesDrawer sources={activeSources} onClose={() => setActiveSources(null)} />
      )}
    </div>
  );
}
