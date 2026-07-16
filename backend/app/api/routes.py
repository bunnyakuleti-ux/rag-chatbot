"""
FastAPI route handlers.

Endpoints:
  POST   /sessions                          - Create a session
  GET    /sessions                          - List all sessions
  DELETE /sessions/{session_id}             - Delete session + its docs
  POST   /sessions/{session_id}/upload      - Upload PDF to a session
  GET    /sessions/{session_id}/documents   - List docs in a session
  POST   /upload                            - Upload PDF (no session)
  GET    /documents                         - List all documents
  DELETE /documents/{doc_id}               - Delete a document
  POST   /chat                              - RAG chat (session or global)
  GET    /health                            - Health check
"""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    DeleteResponse,
    DocumentListResponse,
    HealthResponse,
    SessionCreate,
    SessionListResponse,
    SessionMetadata,
    UploadResponse,
)
from app.rag.pipeline import run_rag_pipeline
from app.services.document_store import (
    create_document,
    delete_document,
    get_document,
    list_documents,
)
from app.services.session_store import (
    add_document_to_session,
    create_session,
    delete_session,
    get_session,
    list_sessions,
    remove_document_from_session,
)
from app.services.pdf_processor import chunk_document, extract_text_from_pdf
from app.services.vector_store import (
    delete_document_vectors,
    get_vector_store_type,
    upsert_documents,
)
from app.utils.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    from groq import Groq
    settings = get_settings()
    ok = False
    try:
        Groq(api_key=settings.groq_api_key).models.list()
        ok = True
    except Exception as e:
        logger.warning(f"Groq check failed: {e}")
    docs = list_documents()
    return HealthResponse(
        status="healthy" if ok else "degraded",
        version="1.0.0",
        vector_store=get_vector_store_type(),
        openai_connected=ok,
        document_count=len(docs),
    )


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

@router.post("/sessions", response_model=SessionMetadata, status_code=status.HTTP_201_CREATED, tags=["sessions"])
async def create_session_endpoint(body: SessionCreate) -> SessionMetadata:
    session = create_session(body.name.strip())
    return SessionMetadata(**session)


@router.get("/sessions", response_model=SessionListResponse, tags=["sessions"])
async def list_sessions_endpoint() -> SessionListResponse:
    sessions = list_sessions()
    return SessionListResponse(
        sessions=[SessionMetadata(**s) for s in sessions],
        total=len(sessions),
    )


@router.delete("/sessions/{session_id}", tags=["sessions"])
async def delete_session_endpoint(session_id: str):
    """Delete a session and all its documents."""
    doc_ids = delete_session(session_id)
    if doc_ids is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    # Remove each document in the session
    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    for doc_id in doc_ids:
        try:
            delete_document_vectors(doc_id)
            delete_document(doc_id)
            for f in upload_dir.glob(f"{doc_id}_*"):
                f.unlink(missing_ok=True)
        except Exception as e:
            logger.warning(f"Could not fully delete doc {doc_id}: {e}")

    return {"session_id": session_id, "message": "Session deleted", "documents_removed": len(doc_ids)}


@router.get("/sessions/{session_id}/documents", response_model=DocumentListResponse, tags=["sessions"])
async def get_session_documents(session_id: str) -> DocumentListResponse:
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    all_docs = {d.id: d for d in list_documents()}
    docs = [all_docs[did] for did in session["document_ids"] if did in all_docs]
    return DocumentListResponse(documents=docs, total=len(docs))


@router.post(
    "/sessions/{session_id}/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["sessions"],
)
async def upload_to_session(session_id: str, file: UploadFile = File(...)) -> UploadResponse:
    """Upload a PDF into a specific session."""
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    return await _process_upload(file, session_id=session_id)


# ---------------------------------------------------------------------------
# Documents (global / no session)
# ---------------------------------------------------------------------------

@router.get("/documents", response_model=DocumentListResponse, tags=["documents"])
async def get_documents() -> DocumentListResponse:
    docs = list_documents()
    return DocumentListResponse(documents=docs, total=len(docs))


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["documents"],
)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    return await _process_upload(file, session_id=None)


@router.delete("/documents/{doc_id}", response_model=DeleteResponse, tags=["documents"])
async def delete_document_endpoint(doc_id: str) -> DeleteResponse:
    doc = get_document(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")
    try:
        delete_document_vectors(doc_id)
        delete_document(doc_id)
        # Remove from any session it belongs to
        if doc.session_id:
            remove_document_from_session(doc.session_id, doc_id)
        settings = get_settings()
        for f in Path(settings.upload_dir).glob(f"{doc_id}_*"):
            f.unlink(missing_ok=True)
        return DeleteResponse(document_id=doc_id)
    except Exception as e:
        logger.exception(f"Failed to delete {doc_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Shared upload logic
# ---------------------------------------------------------------------------

async def _process_upload(file: UploadFile, session_id=None) -> UploadResponse:
    settings = get_settings()
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_file_size_mb} MB limit.")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    temp_doc_id = str(uuid.uuid4())
    temp_path = upload_dir / f"{temp_doc_id}_{file.filename}"

    try:
        temp_path.write_bytes(content)
        full_text, page_count = extract_text_from_pdf(str(temp_path))

        if not full_text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

        chunks = chunk_document(full_text, document_id=temp_doc_id, filename=file.filename)
        upsert_documents(chunks)

        doc = create_document(
            filename=file.filename,
            file_size=len(content),
            page_count=page_count,
            chunk_count=len(chunks),
            session_id=session_id,
        )

        final_path = upload_dir / f"{doc.id}_{file.filename}"
        shutil.move(str(temp_path), str(final_path))

        if session_id:
            add_document_to_session(session_id, doc.id)

        return UploadResponse(
            document_id=doc.id,
            filename=doc.filename,
            page_count=doc.page_count,
            chunk_count=doc.chunk_count,
            session_id=session_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Upload failed: {e}")
        temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse, tags=["chat"])
async def chat(request: ChatRequest) -> ChatResponse:
    settings = get_settings()

    # Resolve document_ids from session if session_id provided
    document_ids = request.document_ids
    if request.session_id and not document_ids:
        session = get_session(request.session_id)
        if session is None:
            raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found.")
        document_ids = session.get("document_ids") or None

    try:
        answer, sources = run_rag_pipeline(
            query=request.query,
            conversation_history=request.conversation_history,
            document_ids=document_ids,
            top_k=request.top_k or settings.top_k_results,
        )
        return ChatResponse(answer=answer, sources=sources)
    except Exception as e:
        logger.exception(f"RAG pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
