"""
vector_store.py -- FAISS index management (load / save / retrieve)
"""
from pathlib import Path
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.config import settings

_embeddings: HuggingFaceEmbeddings | None = None
_index: FAISS | None = None


def _get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name=settings.embedding_model,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _embeddings


def get_index() -> FAISS | None:
    """Return the loaded FAISS index, or None if not yet built."""
    global _index
    index_file = Path(settings.faiss_index_path) / "index.faiss"
    if _index is None and index_file.exists():
        _index = FAISS.load_local(
            settings.faiss_index_path,
            _get_embeddings(),
            allow_dangerous_deserialization=True,
        )
    return _index


def add_documents(docs: list) -> int:
    """Add LangChain Document objects to FAISS, persist to disk."""
    global _index
    emb = _get_embeddings()
    Path(settings.faiss_index_path).mkdir(parents=True, exist_ok=True)

    if _index is None:
        _index = FAISS.from_documents(docs, emb)
    else:
        _index.add_documents(docs)

    _index.save_local(settings.faiss_index_path)
    return len(docs)


def get_retriever():
    idx = get_index()
    if idx is None:
        raise ValueError("No documents have been ingested yet. Upload a PDF first.")
    return idx.as_retriever(search_kwargs={"k": settings.retriever_k})
