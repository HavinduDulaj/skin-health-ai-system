"""Shared helpers: image I/O, hashing, grouping, and the working index."""

from __future__ import annotations

import hashlib
import json
import logging
import random
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, ImageOps, UnidentifiedImageError

from .settings import Settings

try:
    import imagehash
except ImportError:  # pragma: no cover
    imagehash = None

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None


INDEX_COLUMNS = [
    "image_id",
    "image_path",
    "filename",
    "split",
    "lesion_type",
    "current_risk_label",
    "extension",
    "file_bytes",
    "width",
    "height",
    "channels",
    "mode",
    "is_readable",
    "is_valid_extension",
    "is_empty",
    "is_corrupted",
    "is_too_small",
    "is_unusual_aspect",
    "validation_status",
    "validation_notes",
    "file_sha256",
    "pixel_sha256",
    "exact_dup_group",
    "exact_dup_size",
    "is_exact_duplicate",
    "is_exact_rep",
    "phash",
    "dhash",
    "near_dup_group",
    "near_dup_size",
    "min_near_distance",
    "is_near_duplicate",
    "is_cross_split_near_dup",
    "is_cross_label_near_dup",
    "is_cross_lesion_near_dup",
    "blur_laplacian",
    "brightness_mean",
    "pixel_std",
    "entropy",
    "overexposure_ratio",
    "underexposure_ratio",
    "quality_score",
    "quality_flags",
    "is_low_quality",
    "nearest_other_risk",
    "nearest_other_risk_distance",
    "nearest_other_risk_path",
    "similar_to_low",
    "similar_to_medium",
    "similar_to_high",
    "is_ambiguous",
    "ambiguity_reason",
    "review_reason",
    "recommended_action",
    "include_in_v4",
    "exclude_reason",
    "assigned_split",
    "final_rel_path",
    "is_synthetic",
]


def setup_logging(settings: Settings, name: str = "pipeline") -> logging.Logger:
    settings.ensure_dirs()
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    if logger.handlers:
        return logger
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    stream = logging.StreamHandler()
    stream.setFormatter(formatter)
    logger.addHandler(stream)
    file_handler = logging.FileHandler(settings.logs_dir / "pipeline.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    return logger


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)


def relative_to_dataset(path: Path, settings: Settings) -> str:
    try:
        return str(path.resolve().relative_to(settings.dataset_root.resolve())).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def classify_path(path: Path, settings: Settings) -> tuple[str | None, str | None, str | None]:
    """Infer split / lesion / risk from a path under dataset_root."""
    try:
        rel = path.resolve().relative_to(settings.dataset_root.resolve())
    except ValueError:
        return None, None, None
    parts = [p for p in rel.parts[:-1]]
    split = lesion = risk = None
    lower_splits = {s.lower(): s for s in settings.splits}
    lower_lesions = {s.lower(): s for s in settings.lesion_types}
    lower_risks = {s.lower(): s for s in settings.risk_levels}
    for part in parts:
        key = part.lower()
        if key in lower_splits:
            split = lower_splits[key]
        elif key in lower_lesions:
            lesion = lower_lesions[key]
        elif key in lower_risks:
            risk = lower_risks[key]
    return split, lesion, risk


def is_probable_image(path: Path) -> bool:
    return path.is_file() and not path.name.startswith(".")


def file_sha256(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def pixel_sha256(array: np.ndarray) -> str:
    return hashlib.sha256(np.ascontiguousarray(array).tobytes()).hexdigest()


def open_rgb(path: Path) -> Image.Image:
    image = Image.open(path)
    image = ImageOps.exif_transpose(image)
    if image.mode not in {"RGB", "L"}:
        image = image.convert("RGB")
    elif image.mode == "L":
        image = image.convert("RGB")
    else:
        image = image.convert("RGB")
    return image


def safe_open_rgb(path: Path) -> tuple[Image.Image | None, str | None]:
    try:
        image = open_rgb(path)
        image.load()
        return image, None
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        return None, f"{type(exc).__name__}: {exc}"


def compute_hashes(image: Image.Image, settings: Settings) -> tuple[str, str]:
    if imagehash is None:
        raise RuntimeError("imagehash is required. Install with: pip install imagehash")
    phash = imagehash.phash(image, hash_size=settings.phash_size)
    dhash = imagehash.dhash(image, hash_size=settings.phash_size)
    return str(phash), str(dhash)


def hamming_hex(a: str, b: str) -> int:
    if not a or not b or a == "nan" or b == "nan":
        return 64
    return (int(str(a), 16) ^ int(str(b), 16)).bit_count()


def shannon_entropy(gray: np.ndarray) -> float:
    hist, _ = np.histogram(gray, bins=256, range=(0, 256), density=True)
    hist = hist[hist > 0]
    return float(-np.sum(hist * np.log2(hist)))


def laplacian_variance(rgb: np.ndarray) -> float:
    if cv2 is None:
        gray = np.mean(rgb, axis=2)
        gy, gx = np.gradient(gray)
        return float(np.var(gx) + np.var(gy))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def quality_metrics(image: Image.Image, settings: Settings) -> dict:
    rgb = np.asarray(image, dtype=np.uint8)
    gray = np.mean(rgb, axis=2)
    mean = float(gray.mean())
    std = float(gray.std())
    entropy = shannon_entropy(gray)
    blur = laplacian_variance(rgb)
    over = float((gray >= 250).mean())
    under = float((gray <= 5).mean())
    flags: list[str] = []
    if blur < settings.blur_laplacian_threshold:
        flags.append("blurry")
    if over >= settings.overexposure_ratio:
        flags.append("overexposed")
    if under >= settings.underexposure_ratio:
        flags.append("underexposed")
    if std < settings.low_contrast_std:
        flags.append("low_contrast")
    if entropy < settings.low_entropy:
        flags.append("low_entropy")
    if image.width < settings.min_width or image.height < settings.min_height:
        flags.append("low_resolution")

    # 0–1 score: higher is better. Borderline images are flagged, not deleted.
    sharpness = min(1.0, blur / max(settings.blur_laplacian_threshold * 4.0, 1.0))
    contrast = min(1.0, std / 40.0)
    info = min(1.0, entropy / 7.0)
    exposure = 1.0 - min(1.0, max(over, under) * 1.2)
    resolution = min(1.0, min(image.width, image.height) / 224.0)
    score = float(np.clip(0.25 * sharpness + 0.2 * contrast + 0.2 * info + 0.2 * exposure + 0.15 * resolution, 0, 1))
    return {
        "blur_laplacian": blur,
        "brightness_mean": mean,
        "pixel_std": std,
        "entropy": entropy,
        "overexposure_ratio": over,
        "underexposure_ratio": under,
        "quality_score": round(score, 4),
        "quality_flags": "|".join(flags),
        "is_low_quality": bool(flags),
    }


def empty_index() -> pd.DataFrame:
    return pd.DataFrame(columns=INDEX_COLUMNS)


def load_index(settings: Settings) -> pd.DataFrame:
    if not settings.index_path.exists():
        return empty_index()
    df = pd.read_csv(settings.index_path, dtype=str, keep_default_na=False)
    for col in INDEX_COLUMNS:
        if col not in df.columns:
            df[col] = ""
    return df


def save_index(df: pd.DataFrame, settings: Settings) -> Path:
    settings.working_dir.mkdir(parents=True, exist_ok=True)
    ordered = [c for c in INDEX_COLUMNS if c in df.columns]
    extra = [c for c in df.columns if c not in ordered]
    df[ordered + extra].to_csv(settings.index_path, index=False)
    return settings.index_path


def save_csv(df: pd.DataFrame, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path


def as_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def as_float(value: object, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def as_int(value: object, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


class UnionFind:
    def __init__(self, items: list[str]):
        self.parent = {item: item for item in items}
        self.rank = {item: 0 for item in items}

    def find(self, item: str) -> str:
        parent = self.parent[item]
        if parent != item:
            self.parent[item] = self.find(parent)
        return self.parent[item]

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self.rank[ra] < self.rank[rb]:
            self.parent[ra] = rb
        elif self.rank[ra] > self.rank[rb]:
            self.parent[rb] = ra
        else:
            self.parent[rb] = ra
            self.rank[ra] += 1

    def groups(self) -> dict[str, list[str]]:
        clustered: dict[str, list[str]] = defaultdict(list)
        for item in self.parent:
            clustered[self.find(item)].append(item)
        return dict(clustered)


@dataclass
class StepResult:
    name: str
    summary: dict
    artifacts: list[str]

    def to_json(self) -> str:
        return json.dumps({"step": self.name, "summary": self.summary, "artifacts": self.artifacts}, indent=2)


def write_step_summary(settings: Settings, result: StepResult) -> Path:
    path = settings.logs_dir / f"{result.name}.json"
    path.write_text(result.to_json(), encoding="utf-8")
    return path


def print_summary(title: str, summary: dict) -> None:
    print(f"\n=== {title} ===")
    width = max((len(str(k)) for k in summary), default=10)
    for key, value in summary.items():
        print(f"  {str(key):<{width}}  {value}")
