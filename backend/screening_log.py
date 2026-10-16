"""Anonymised screening log (proposal FR11).

Writes decision metadata only. Photograph bytes are never stored; only a
truncated SHA-256 is kept so repeats can be counted in the dissertation.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from backend.config import PIPELINE_OUTPUT

LOG_PATH = PIPELINE_OUTPUT / "logs" / "screening_log.jsonl"


def image_token(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:16]


def append_screening_log(record: dict, data: bytes) -> Path:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "image_token": image_token(data),
        **record,
    }
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=True) + "\n")
    return LOG_PATH
