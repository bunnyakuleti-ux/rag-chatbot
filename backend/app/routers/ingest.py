"""
ingest.py — POST /api/ingest  — upload and index a PDF
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.pdf_loader import load_and_split
from app.services.vector_store import add_documents
from app.models.schemas import IngestResponse

router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/ingest", response_model=IngestResponse)
async def ingest_pdf(file: UploadFile = File(...)):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, "Only PDF files are accepted.")

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, f"File too large. Max size is 20 MB.")

    if len(content) == 0:
        raise HTTPException(400, "Uploaded file is empty.")

    try:
        docs = load_and_split(content, file.filename or "document.pdf")
        if not docs:
            raise HTTPException(422, "Could not extract text from this PDF.")
        count = add_documents(docs)
    except Exception as exc:
        raise HTTPException(500, f"Ingestion failed: {str(exc)}")

    return IngestResponse(
        message=f"Successfully indexed '{file.filename}'.",
        chunks=count,
        filename=file.filename or "document.pdf",
    )
