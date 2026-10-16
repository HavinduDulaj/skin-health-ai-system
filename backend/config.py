"""Paths and runtime settings for the Derma-Safe AI API."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"
MODELS_DIR = ROOT / "models"
DATA_RAW = ROOT / "data" / "raw"
PIPELINE_OUTPUT = ROOT / "pipeline_output"
DATA_V4 = PIPELINE_OUTPUT / "Skin_Risk_Dataset_V4"
DATA_V5 = DATA_RAW / "Skin_Risk_Dataset_V5_Synthetic"

HOST = os.environ.get("DERMA_HOST", "0.0.0.0")
PORT = int(os.environ.get("DERMA_PORT", "8000"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "DERMA_CORS",
        "http://127.0.0.1:5173,http://localhost:5173,"
        "http://127.0.0.1:8000,http://localhost:8000,"
        "http://127.0.0.1:8081,http://localhost:8081,"
        "http://127.0.0.1:19006,http://localhost:19006",
    ).split(",")
    if origin.strip()
]

HEAD_PATH = MODELS_DIR / "risk_head.npz"
HEAD_META_PATH = MODELS_DIR / "risk_head.json"
V5_KERAS_SRC = MODELS_DIR / "skin_risk_v5_final.keras"
V5_META_PATH = MODELS_DIR / "skin_risk_v5_metadata.json"
V5_WEIGHTS = MODELS_DIR / "skin_risk_v5.weights.h5"
CKPT_CANDIDATES = [
    ROOT / "training_output" / "best.pt",
    MODELS_DIR / "best.pt",
]

RISK_ORDER = ["Low", "Medium", "High"]
LESIONS = ["acne", "burns", "rash", "warts"]
V5_IMAGE_SIZE = 260
VALID_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

# Selective screening — published with the model card, not hidden.
CONFIDENCE_MIN = 0.48
MARGIN_MIN = 0.12
QUALITY_MIN = 0.42
MAX_UPLOAD_BYTES = 12 * 1024 * 1024
