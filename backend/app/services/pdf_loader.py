"""
pdf_loader.py — parse a PDF bytes object into LangChain Documents
"""
import io
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from app.config import settings
import tempfile, os


def load_and_split(file_bytes: bytes, filename: str) -> list[Document]:
    """
    Write PDF bytes to a temp file, parse with PyPDFLoader,
    split into chunks and tag each chunk with source metadata.
    """
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        loader = PyPDFLoader(tmp_path)
        pages = loader.load()
    finally:
        os.unlink(tmp_path)

    # Enrich metadata with original filename
    for p in pages:
        p.metadata["source"] = filename
        if "page" not in p.metadata:
            p.metadata["page"] = 0

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    return splitter.split_documents(pages)
