"""Held-out test thumbnails for the assessment gallery."""

from __future__ import annotations

import hashlib
from pathlib import Path

from backend.config import DATA_V4, LESIONS, RISK_ORDER, VALID_EXTS


def sample_catalog() -> list[dict]:
    items: list[dict] = []
    if not DATA_V4.exists():
        return items
    for lesion in LESIONS:
        for risk in RISK_ORDER:
            folder = DATA_V4 / "test" / lesion / risk
            if not folder.exists():
                continue
            files = sorted(
                p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in VALID_EXTS
            )
            if not files:
                continue
            pick = files[len(files) // 3]
            digest = hashlib.sha256(str(pick).encode("utf-8")).hexdigest()[:16]
            items.append(
                {
                    "id": digest,
                    "lesion": lesion,
                    "risk": risk,
                    "filename": pick.name,
                    "path": str(pick),
                }
            )
    return items


SAMPLE_INDEX = {item["id"]: item for item in sample_catalog()}


def public_samples() -> list[dict]:
    return [{k: v for k, v in item.items() if k != "path"} for item in SAMPLE_INDEX.values()]


def sample_path(sample_id: str) -> Path | None:
    item = SAMPLE_INDEX.get(sample_id)
    if item is None:
        return None
    return Path(item["path"])
