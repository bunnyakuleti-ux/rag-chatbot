"""
config.py — central settings loaded from environment variables
"""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    openai_api_key: str
    openai_model: str = "gpt-3.5-turbo"
    openai_embedding_model: str = "text-embedding-3-small"

    # FAISS index lives inside the container/server filesystem
    faiss_index_path: str = str(Path(__file__).parent.parent / "faiss_store")

    chunk_size: int = 1000
    chunk_overlap: int = 150
    retriever_k: int = 4

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
