import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RAG Chatbot — Chat with your PDFs',
  description: 'Upload PDF documents and ask questions using AI (LangChain + OpenAI + FAISS)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0F172A] text-[#F1F5F9] antialiased">
        {children}
      </body>
    </html>
  );
}
