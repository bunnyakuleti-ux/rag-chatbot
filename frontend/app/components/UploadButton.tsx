'use client';

import { useRef, useState } from 'react';

interface Props {
  onUpload: (filename: string) => void;
  disabled?: boolean;
}

export default function UploadButton({ onUpload, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File must be under 20 MB.');
      return;
    }
    setError('');
    setUploading(true);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      onUpload(data.filename);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="relative flex-shrink-0">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        disabled={disabled || uploading}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || uploading}
        title="Upload PDF"
        aria-label="Upload PDF"
        className="w-8 h-8 rounded-lg bg-[#334155] hover:bg-[#475569] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-base"
      >
        {uploading ? (
          <span className="w-3.5 h-3.5 border-2 border-[#94A3B8] border-t-transparent rounded-full animate-spin" />
        ) : (
          '📎'
        )}
      </button>
      {error && (
        <div className="absolute bottom-10 left-0 bg-red-900/90 text-red-200 text-xs rounded-lg px-3 py-1.5 whitespace-nowrap border border-red-700 z-10">
          {error}
        </div>
      )}
    </div>
  );
}
