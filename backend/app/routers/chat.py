"""
chat.py — POST /api/chat (JSON) and GET /api/chat/stream (SSE streaming)
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_chain import stream_answer, get_answer_with_sources

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Non-streaming chat — returns full answer + source documents."""
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty.")
    try:
        result = get_answer_with_sources(req.question)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Chat failed: {str(exc)}")
    return ChatResponse(**result)


@router.get("/chat/stream")
async def chat_stream(question: str):
    """
    Server-Sent Events streaming endpoint.
    Frontend connects with EventSource and receives tokens as they arrive.
    """
    if not question.strip():
        raise HTTPException(400, "Question cannot be empty.")

    async def event_generator():
        try:
            async for token in stream_answer(question):
                # SSE format: data: <token>\n\n
                safe = token.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
        except ValueError as exc:
            yield f"event: error\ndata: {str(exc)}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: Internal error: {str(exc)}\n\n"
        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
