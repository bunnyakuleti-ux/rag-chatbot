"""
config.py -- central settings loaded from environment variables
"""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "llama3-8b-8192"
    embedding_model: str = "all-MiniLM-L6-v2"

    # FAISS index lives inside the container/server filesystem
    faiss_index_path: str = str(Path(__file__).parent.parent / "faiss_store")

    chunk_size: int = 1000
    chunk_overlap: int = 150
    retriever_k: int = 4

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
