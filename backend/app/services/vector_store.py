"""
vector_store.py -- Pure Python TF-IDF retrieval. Zero deps. ~30MB RAM.
"""
from __future__ import annotations
import math, re
from collections import Counter
from typing import List, Dict, Any

_docs: List[Dict[str, Any]] = []
_tfidf_matrix: List[Dict[str, float]] = []
_idf: Dict[str, float] = {}


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _rebuild_index():
    global _tfidf_matrix, _idf
    if not _docs:
        return
    N = len(_docs)
    df: Dict[str, int] = {}
    tokenized = [_tokenize(d["content"]) for d in _docs]
    for tokens in tokenized:
        for t in set(tokens):
            df[t] = df.get(t, 0) + 1
    _idf = {t: math.log(N / (1 + freq)) for t, freq in df.items()}
    _tfidf_matrix = []
    for tokens in tokenized:
        tf = Counter(tokens)
        total = len(tokens) or 1
        _tfidf_matrix.append({t: (c / total) * _idf.get(t, 0) for t, c in tf.items()})


def _cosine(a: Dict[str, float], b: Dict[str, float]) -> float:
    common = set(a) & set(b)
    dot = sum(a[k] * b[k] for k in common)
    na  = math.sqrt(sum(v * v for v in a.values()))
    nb  = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def add_documents(docs: list) -> int:
    for doc in docs:
        _docs.append({"content": doc.page_content, "metadata": doc.metadata})
    _rebuild_index()
    return len(docs)


def similarity_search(query: str, k: int = 4) -> list:
    if not _docs:
        raise ValueError("No documents ingested yet. Upload a PDF first.")
    q_vec = {}
    tf = Counter(_tokenize(query))
    total = len(tf) or 1
    q_vec = {t: (c / total) * _idf.get(t, 0) for t, c in tf.items()}
    scored = sorted(enumerate(_tfidf_matrix), key=lambda x: _cosine(q_vec, x[1]), reverse=True)

    class _Doc:
        def __init__(self, content, metadata):
            self.page_content = content
            self.metadata = metadata

    return [_Doc(_docs[i]["content"], _docs[i]["metadata"]) for i, _ in scored[:k]]


def get_retriever():
    if not _docs:
        raise ValueError("No documents ingested yet. Upload a PDF first.")

    class _R:
        def invoke(self, q): return similarity_search(q, k=4)
    return _R()
