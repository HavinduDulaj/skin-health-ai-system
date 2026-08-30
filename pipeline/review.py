"""Step 6: assemble a manual-review dataset and review.csv.

Images are copied, never moved, so the original dataset stays intact.
Labels are never changed automatically.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import pandas as pd
from tqdm import tqdm

from .common import (
    StepResult,
    as_bool,
    load_index,
    print_summary,
    save_csv,
    save_index,
    setup_logging,
    write_step_summary,
)
from .settings import Settings

REVIEW_CATEGORIES = [
    "ambiguous_labels",
    "duplicates",
    "low_quality",
    "corrupted",
    "possible_data_leakage",
]


def _safe_copy(src: str, dest: Path) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    target = dest
    if target.exists():
        target = dest.with_name(f"{dest.stem}__{dest.stat().st_size}{dest.suffix}")
    shutil.copy2(src, target)
    return str(target)


def _reasons_and_action(row: pd.Series) -> tuple[list[str], str, list[str]]:
    reasons: list[str] = []
    categories: list[str] = []
    action = "KEEP"

    if as_bool(row.get("is_synthetic")):
        reasons.append("synthetic_training_copy")
        categories.append("duplicates")
        action = "REMOVE_DUPLICATE"

    if as_bool(row.get("is_corrupted")) or row.get("validation_status") in {"INVALID", "UNSUPPORTED"}:
        reasons.append("corrupted_or_unreadable")
        categories.append("corrupted")
        action = "REMOVE_DUPLICATE" if as_bool(row.get("is_exact_duplicate")) else "REVIEW"
        if as_bool(row.get("is_corrupted")) or row.get("validation_status") == "INVALID":
            action = "REVIEW"

    if as_bool(row.get("is_empty")):
        reasons.append("empty_file")
        categories.append("corrupted")
        action = "REVIEW"

    if as_bool(row.get("is_exact_duplicate")) and not as_bool(row.get("is_exact_rep")):
        reasons.append("exact_duplicate")
        categories.append("duplicates")
        action = "REMOVE_DUPLICATE"

    if as_bool(row.get("is_exact_duplicate")) and as_bool(row.get("is_exact_rep")):
        reasons.append("exact_duplicate_representative")
        categories.append("duplicates")

    if as_bool(row.get("is_cross_split_near_dup")):
        reasons.append("near_duplicate_across_splits")
        categories.append("possible_data_leakage")
        if action == "KEEP":
            action = "REVIEW"

    if as_bool(row.get("is_cross_label_near_dup")) or as_bool(row.get("is_ambiguous")):
        reasons.append(str(row.get("ambiguity_reason") or "visually_similar_to_another_risk"))
        categories.append("ambiguous_labels")
        if action in {"KEEP", "REVIEW"}:
            action = "CHECK_LABEL"

    if as_bool(row.get("is_low_quality")):
        flags = str(row.get("quality_flags") or "")
        reasons.append(f"low_quality:{flags}" if flags else "low_quality")
        categories.append("low_quality")
        if action == "KEEP":
            action = "CHECK_QUALITY"

    if as_bool(row.get("is_near_duplicate")) and as_bool(row.get("is_cross_lesion_near_dup")):
        reasons.append("near_duplicate_across_lesion_types")
        categories.append("possible_data_leakage")
        if action == "KEEP":
            action = "REVIEW"

    if not reasons:
        reasons.append("no_issue_detected")
    return reasons, action, list(dict.fromkeys(categories))


def build_review_set(settings: Settings) -> StepResult:
    logger = setup_logging(settings)
    df = load_index(settings)
    if df.empty:
        raise RuntimeError("Image index is empty. Run earlier steps first.")

    for category in REVIEW_CATEGORIES:
        (settings.review_dir / category).mkdir(parents=True, exist_ok=True)

    review_rows = []
    copied = 0
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Build review set", unit="img"):
        reasons, action, categories = _reasons_and_action(row)
        review_needed = action != "KEEP" or bool(categories)
        dests = []
        if review_needed and categories:
            filename = f"{row.get('split','unk')}_{row.get('lesion_type','unk')}_{row.get('current_risk_label','unk')}_{row.get('filename')}"
            for category in categories:
                dest = settings.review_dir / category / filename
                try:
                    dests.append(_safe_copy(row["image_path"], dest))
                    copied += 1
                except OSError as exc:
                    dests.append(f"COPY_FAILED:{exc}")

        suspected = row.get("nearest_other_risk") or ""
        if as_bool(row.get("is_cross_split_near_dup")):
            suspected = suspected or "cross_split_near_duplicate"

        review_rows.append(
            {
                "image_id": row["image_id"],
                "image_path": row["image_path"],
                "filename": row["filename"],
                "split": row["split"],
                "lesion_type": row["lesion_type"],
                "current_risk_label": row["current_risk_label"],
                "quality_score": row.get("quality_score", ""),
                "duplicate_status": (
                    "exact_representative"
                    if as_bool(row.get("is_exact_rep")) and as_bool(row.get("is_exact_duplicate"))
                    else "exact_duplicate"
                    if as_bool(row.get("is_exact_duplicate"))
                    else "unique"
                ),
                "near_duplicate_status": (
                    "cross_split"
                    if as_bool(row.get("is_cross_split_near_dup"))
                    else "cross_label"
                    if as_bool(row.get("is_cross_label_near_dup"))
                    else "same_class"
                    if as_bool(row.get("is_near_duplicate"))
                    else "none"
                ),
                "similarity_score": row.get("min_near_distance", ""),
                "suspected_related_class": suspected,
                "nearest_other_risk_distance": row.get("nearest_other_risk_distance", ""),
                "review_reason": ";".join(reasons),
                "recommended_action": action,
                "review_categories": "|".join(categories),
                "review_copies": " || ".join(dests),
                "exact_dup_group": row.get("exact_dup_group", ""),
                "near_dup_group": row.get("near_dup_group", ""),
                "decision": action,
                "decision_notes": "",
            }
        )

    review_df = pd.DataFrame(review_rows)
    review_path = settings.reports_dir / "review.csv"
    # Preserve any previous manual decisions if the user already edited review.csv.
    if review_path.exists():
        previous = pd.read_csv(review_path, dtype=str, keep_default_na=False)
        if "image_id" in previous.columns and "decision" in previous.columns:
            prev_map = previous.set_index("image_id")[["decision", "decision_notes"]]
            review_df = review_df.drop(columns=["decision", "decision_notes"], errors="ignore")
            review_df = review_df.merge(prev_map, left_on="image_id", right_index=True, how="left")
            review_df["decision"] = review_df["decision"].fillna(review_df["recommended_action"])
            review_df["decision_notes"] = review_df["decision_notes"].fillna("")

    save_csv(review_df, review_path)
    save_csv(review_df, settings.review_dir / "review.csv")

    df["review_reason"] = review_df["review_reason"].values
    df["recommended_action"] = review_df["recommended_action"].values
    save_index(df, settings)

    summary = {
        "review_folder": str(settings.review_dir),
        "images_copied_into_review": copied,
        "recommended_KEEP": int((review_df["recommended_action"] == "KEEP").sum()),
        "recommended_REVIEW": int((review_df["recommended_action"] == "REVIEW").sum()),
        "recommended_REMOVE_DUPLICATE": int((review_df["recommended_action"] == "REMOVE_DUPLICATE").sum()),
        "recommended_CHECK_LABEL": int((review_df["recommended_action"] == "CHECK_LABEL").sum()),
        "recommended_CHECK_QUALITY": int((review_df["recommended_action"] == "CHECK_QUALITY").sum()),
        "review_csv": str(review_path),
        "instruction": (
            "Edit the 'decision' column in reports/review.csv to KEEP / REMOVE / "
            "CHECK_LABEL / CHECK_QUALITY, then run rebuild. "
            "CHECK_LABEL is never auto-relabelled."
        ),
    }
    print_summary("Manual review dataset", summary)
    result = StepResult("06_review", summary, [str(review_path), str(settings.review_dir)])
    write_step_summary(settings, result)
    logger.info("Review set created at %s", settings.review_dir)
    return result
