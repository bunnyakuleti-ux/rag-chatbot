"""
Session store — persists sessions to a JSON file.
Each session owns a list of document IDs and has its own isolated context.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from app.utils.logger import get_logger

logger = get_logger(__name__)

import os as _os
_SESSIONS_FILE = Path(_os.environ.get("UPLOAD_DIR", "./uploads")) / "sessions.json"


def _load() -> Dict[str, dict]:
    if _SESSIONS_FILE.exists():
        try:
            return json.loads(_SESSIONS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save(data: Dict[str, dict]) -> None:
    _SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _SESSIONS_FILE.write_text(json.dumps(data, default=str, indent=2), encoding="utf-8")


def create_session(name: str) -> dict:
    session_id = str(uuid.uuid4())
    session = {
        "id": session_id,
        "name": name,
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
        "document_ids": [],
    }
    store = _load()
    store[session_id] = session
    _save(store)
    logger.info(f"Session created: {session_id} ({name})")
    return session


def get_session(session_id: str) -> Optional[dict]:
    return _load().get(session_id)


def list_sessions() -> List[dict]:
    store = _load()
    return sorted(store.values(), key=lambda s: s["created_at"], reverse=True)


def add_document_to_session(session_id: str, document_id: str) -> bool:
    store = _load()
    if session_id not in store:
        return False
    if document_id not in store[session_id]["document_ids"]:
        store[session_id]["document_ids"].append(document_id)
        _save(store)
    return True


def remove_document_from_session(session_id: str, document_id: str) -> bool:
    store = _load()
    if session_id not in store:
        return False
    store[session_id]["document_ids"] = [
        d for d in store[session_id]["document_ids"] if d != document_id
    ]
    _save(store)
    return True


def delete_session(session_id: str) -> Optional[List[str]]:
    """Delete session and return its document_ids so caller can clean them up."""
    store = _load()
    if session_id not in store:
        return None
    doc_ids = store[session_id].get("document_ids", [])
    del store[session_id]
    _save(store)
    logger.info(f"Session deleted: {session_id}")
    return doc_ids
