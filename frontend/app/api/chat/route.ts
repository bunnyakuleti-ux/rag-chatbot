import { NextRequest } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const question = req.nextUrl.searchParams.get('question') ?? '';

  if (!question.trim()) {
    return new Response('Question is required', { status: 400 });
  }

  try {
    // First get the non-streaming answer + sources from backend
    const [streamRes, sourcesRes] = await Promise.all([
      fetch(`${BACKEND}/api/chat/stream?question=${encodeURIComponent(question)}`),
      fetch(`${BACKEND}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      }),
    ]);

    // Stream tokens from SSE, append sources at end
    const sourcesData = sourcesRes.ok ? await sourcesRes.json() : { sources: [] };
    const sources = sourcesData.sources ?? [];

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        if (!streamRes.body) {
          controller.close();
          return;
        }
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));
          }
        } catch {
          // stream closed
        }

        // Append sources as a final SSE event
        if (sources.length > 0) {
          const sourceLine = `data: __SOURCES__${JSON.stringify(sources)}\n\n`;
          controller.enqueue(encoder.encode(sourceLine));
        }
        controller.enqueue(encoder.encode('event: done\ndata: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Backend unreachable';
    return new Response(`event: error\ndata: ${msg}\n\n`, {
      status: 502,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }
}
