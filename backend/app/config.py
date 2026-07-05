"""
config.py -- central settings loaded from environment variables
"""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "llama3-8b-8192"
    huggingface_api_key: str = ""
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    faiss_index_path: str = str(Path(__file__).parent.parent / "faiss_store")

    chunk_size: int = 800
    chunk_overlap: int = 100
    retriever_k: int = 4

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
