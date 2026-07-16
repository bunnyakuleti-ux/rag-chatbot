"""
Pydantic schemas for request/response validation.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Session models
# ---------------------------------------------------------------------------

class SessionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class SessionMetadata(BaseModel):
    id: str
    name: str
    created_at: datetime
    document_ids: List[str] = []


class SessionListResponse(BaseModel):
    sessions: List[SessionMetadata]
    total: int


# ---------------------------------------------------------------------------
# Document models
# ---------------------------------------------------------------------------

class DocumentMetadata(BaseModel):
    id: str
    filename: str
    file_size: int
    page_count: int
    chunk_count: int
    uploaded_at: datetime
    status: str = "ready"
    session_id: Optional[str] = None


class DocumentListResponse(BaseModel):
    documents: List[DocumentMetadata]
    total: int


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    session_id: Optional[str] = None
    message: str = "Document processed successfully"


class DeleteResponse(BaseModel):
    document_id: str
    message: str = "Document deleted successfully"


# ---------------------------------------------------------------------------
# Chat models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class SourceChunk(BaseModel):
    document_id: str
    filename: str
    page: Optional[int] = None
    content: str
    score: float = Field(..., ge=0.0, le=1.0)


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4096)
    conversation_history: List[ChatMessage] = Field(default_factory=list)
    document_ids: Optional[List[str]] = None
    session_id: Optional[str] = None   # if set, auto-resolve document_ids from session
    top_k: int = Field(default=5, ge=1, le=20)


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    conversation_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    version: str
    vector_store: str
    openai_connected: bool
    document_count: int
