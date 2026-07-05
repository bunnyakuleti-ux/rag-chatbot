"""
vector_store.py -- Lightweight in-memory vector store using numpy dot-product search.
Uses HuggingFace Inference API for embeddings (no local model, zero RAM overhead).
"""
from __future__ import annotations
import json
import math
from pathlib import Path
from typing import List, Dict, Any

import httpx
import numpy as np

from app.config import settings

# In-memory store: list of {"embedding": [...], "content": str, "metadata": {...}}
_store: List[Dict[str, Any]] = []


def _embed(texts: List[str]) -> List[List[float]]:
    """Call HuggingFace Inference API to embed a list of texts."""
    url = f"https://api-inference.huggingface.co/models/{settings.embedding_model}"
    headers = {"Authorization": f"Bearer {settings.huggingface_api_key}"}
    response = httpx.post(url, json={"inputs": texts}, headers=headers, timeout=60)
    response.raise_for_status()
    return response.json()


def _cosine(a: List[float], b: List[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def add_documents(docs: list) -> int:
    """Embed and store LangChain Document objects."""
    global _store
    texts = [d.page_content for d in docs]
    embeddings = _embed(texts)
    for doc, emb in zip(docs, embeddings):
        _store.append({
            "embedding": emb,
            "content": doc.page_content,
            "metadata": doc.metadata,
        })
    return len(docs)


def similarity_search(query: str, k: int = 4) -> list:
    """Return top-k most similar stored chunks for a query string."""
    if not _store:
        raise ValueError("No documents have been ingested yet. Upload a PDF first.")
    q_emb = _embed([query])[0]
    scored = [
        (i, _cosine(q_emb, item["embedding"]))
        for i, item in enumerate(_store)
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:k]

    # Return simple objects with page_content and metadata attributes
    class _Doc:
        def __init__(self, content, metadata):
            self.page_content = content
            self.metadata = metadata

    return [_Doc(_store[i]["content"], _store[i]["metadata"]) for i, _ in top]


def get_retriever():
    """Returns a callable retriever compatible with LangChain LCEL."""
    if not _store:
        raise ValueError("No documents have been ingested yet. Upload a PDF first.")

    class _Retriever:
        def invoke(self, query: str):
            return similarity_search(query, k=settings.retriever_k)

        def __or__(self, other):
            from langchain_core.runnables import RunnableLambda
            return RunnableLambda(lambda q: other(self.invoke(q)))

    return _Retriever()
