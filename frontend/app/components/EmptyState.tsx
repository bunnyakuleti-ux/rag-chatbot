export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
      <div className="text-6xl mb-6">📄</div>
      <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">Chat with your PDFs</h2>
      <p className="text-[#94A3B8] text-sm max-w-sm leading-relaxed mb-8">
        Upload one or more PDF documents using the 📎 button below, then ask any
        question. The AI answers strictly from your documents with source references.
      </p>
      <div className="grid grid-cols-1 gap-3 w-full max-w-sm text-left">
        {[
          ['📤', 'Upload a PDF', 'Click the 📎 paperclip icon in the chat bar'],
          ['⏳', 'Wait for indexing', 'The document is split and embedded into FAISS'],
          ['💬', 'Ask anything', 'Get answers grounded in your document content'],
          ['📎', 'View sources', 'Click "View sources" to see exact passages used'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="flex items-start gap-3 bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3">
            <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
            <div>
              <div className="text-sm font-semibold text-[#F1F5F9]">{title}</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
