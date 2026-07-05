"""
schemas.py — Pydantic request/response models
"""
from pydantic import BaseModel
from typing import List, Optional


class IngestResponse(BaseModel):
    message: str
    chunks: int
    filename: str


class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = "default"


class SourceDocument(BaseModel):
    content: str
    source: str
    page: int


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceDocument]
