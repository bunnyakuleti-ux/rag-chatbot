'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../page';

interface Props {
  message: Message;
  onViewSources: () => void;
}

export default function ChatMessage({ message, onViewSources }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center text-sm mr-2 mt-0.5">
          🤖
        </div>
      )}

      <div className={`max-w-[78%] ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-[#3B82F6] text-white rounded-br-sm'
              : 'bg-[#1E293B] border border-[#334155] text-[#F1F5F9] rounded-bl-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.streaming && (
                <span className="inline-block w-1.5 h-4 bg-[#38BDF8] animate-pulse ml-0.5 rounded-sm" />
              )}
            </div>
          )}
        </div>

        {/* Sources button */}
        {!isUser && !message.streaming && message.sources && message.sources.length > 0 && (
          <button
            onClick={onViewSources}
            className="mt-1.5 ml-1 text-xs text-[#38BDF8] hover:text-[#7DD3FC] font-medium flex items-center gap-1 transition-colors"
          >
            📎 View {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#334155] flex items-center justify-center text-sm ml-2 mt-0.5 order-2">
          👤
        </div>
      )}
    </div>
  );
}
