'use client';

import type { Source } from '../page';

interface Props {
  sources: Source[];
  onClose: () => void;
}

export default function SourcesDrawer({ sources, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Source documents"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-[#0F172A] border-l border-[#334155] h-full flex flex-col shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
          <h2 className="font-bold text-[#F1F5F9]">
            📎 Source Documents ({sources.length})
          </h2>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#F1F5F9] text-xl leading-none transition-colors"
            aria-label="Close sources panel"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {sources.map((src, i) => (
            <div
              key={i}
              className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 border-l-4 border-l-[#38BDF8]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider">
                  {src.source}
                </span>
                <span className="text-xs text-[#94A3B8] bg-[#0F172A] px-2 py-0.5 rounded-full border border-[#334155]">
                  Page {src.page}
                </span>
              </div>
              <p className="text-sm text-[#CBD5E1] leading-relaxed line-clamp-6">
                {src.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
