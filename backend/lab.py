"""Laboratory payload: dataset integrity, model card, research contributions."""

from __future__ import annotations

import json
from pathlib import Path

from backend import __version__
from backend.config import (
    CONFIDENCE_MIN,
    HEAD_META_PATH,
    MARGIN_MIN,
    PIPELINE_OUTPUT,
    QUALITY_MIN,
    V5_META_PATH,
)
from backend.research import ARCHITECTURE, CONTRIBUTIONS, METHOD

OUTPUT = PIPELINE_OUTPUT
V5_META = V5_META_PATH
HEAD_META = HEAD_META_PATH


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def lab_payload() -> dict:
    stats = _read_json(OUTPUT / "logs" / "08_statistics.json").get("summary", {})
    leakage = _read_json(OUTPUT / "logs" / "09_leakage_check.json").get("summary", {})
    quality = _read_json(OUTPUT / "logs" / "04_quality.json").get("summary", {})
    labels = _read_json(OUTPUT / "logs" / "05_label_consistency.json").get("summary", {})
    v5 = _read_json(V5_META)
    probe = _read_json(HEAD_META)

    return {
        "name": METHOD["title"],
        "version": __version__,
        "dataset": {
            "name": "Skin_Risk_Dataset_V4",
            "original_images": stats.get("total_original_images"),
            "final_images": stats.get("total_final_images"),
            "removed": stats.get("images_removed"),
            "near_duplicates": stats.get("near_duplicates_detected"),
            "low_quality": stats.get("low_quality_images_detected"),
            "ambiguous": stats.get("ambiguous_images_detected"),
            "review_queue": stats.get("images_requiring_manual_review"),
            "synthetic_held_out": True,
        },
        "integrity": {
            "leakage": leakage.get("result", "Not run"),
            "exact_cross_split": leakage.get("exact_cross_split_groups", 0),
            "near_cross_split": leakage.get("near_cross_split_groups", 0),
            "mean_quality": quality.get("mean_quality_score"),
            "ambiguous_labels": stats.get("ambiguous_images_detected")
            or labels.get("ambiguous_count")
            or labels.get("ambiguous_images"),
        },
        "model_card": {
            "architecture": v5.get(
                "architecture",
                "EfficientNetV2B0 + lesion one-hot + softmax risk head",
            ),
            "selected_checkpoint": v5.get("selected_checkpoint"),
            "image_size": v5.get("image_size", 260),
            "v5_test_accuracy": v5.get("test_accuracy"),
            "v5_test_macro_f1": v5.get("test_macro_f1"),
            "v5_validation_accuracy": v5.get("validation_accuracy"),
            "v5_validation_macro_f1": v5.get("validation_macro_f1"),
            "v4_test_accuracy_baseline": v5.get("v4_test_accuracy_baseline"),
            "v4_test_macro_f1_baseline": v5.get("v4_test_macro_f1_baseline"),
            "training_images": v5.get("training_images"),
            "validation_images": v5.get("validation_images"),
            "test_images": v5.get("test_images"),
            "synthetic_training_images": v5.get("synthetic_training_images"),
            "probe": probe,
            "limitation": (
                "Medium vs Low/High is weakly separable in photographs. "
                "Cleaning removed leakage; it did not invent a visual boundary."
            ),
        },
        "policy": {
            "confidence_min": CONFIDENCE_MIN,
            "margin_min": MARGIN_MIN,
            "quality_min": QUALITY_MIN,
            "note": (
                "Abstain when confidence or margin is below threshold. "
                "Reject the frame when quality is below threshold."
            ),
        },
        "contributions": CONTRIBUTIONS,
        "method": METHOD,
        "architecture": ARCHITECTURE,
        "project": {
            "code": METHOD["code"],
            "student": METHOD["student"],
            "student_id": METHOD["student_id"],
            "component": METHOD["component"],
        },
        "lesions": ["acne", "burns", "rash", "warts"],
        "risks": ["Low", "Medium", "High"],
    }
