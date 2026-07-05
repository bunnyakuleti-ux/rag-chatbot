"""
main.py — RAG Chatbot FastAPI entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ingest, chat

app = FastAPI(
    title="RAG Chatbot API",
    description="Chat with PDFs using LangChain + FAISS + OpenAI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(chat.router,   prefix="/api", tags=["chat"])


@app.get("/health")
def health():
    return {"status": "ok"}
