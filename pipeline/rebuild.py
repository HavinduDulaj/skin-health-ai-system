"""Step 7: apply review decisions and rebuild a leakage-free 70/15/15 dataset."""

from __future__ import annotations

import shutil
import hashlib
from pathlib import Path

import numpy as np
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

KEEP_DECISIONS = {"KEEP", "keep", "Keep"}
REMOVE_DECISIONS = {
    "REMOVE",
    "REMOVE_DUPLICATE",
    "remove",
    "remove_duplicate",
}
HOLD_DECISIONS = {"CHECK_LABEL", "CHECK_QUALITY", "REVIEW", "review"}


def _load_review(settings: Settings) -> pd.DataFrame:
    path = settings.reports_dir / "review.csv"
    if not path.exists():
        raise RuntimeError("review.csv not found. Run the review step first.")
    return pd.read_csv(path, dtype=str, keep_default_na=False)


def _decision_for(row: pd.Series, review: pd.DataFrame) -> str:
    match = review[review["image_id"] == row["image_id"]]
    if match.empty:
        return str(row.get("recommended_action") or "KEEP")
    decision = str(match.iloc[0].get("decision") or match.iloc[0].get("recommended_action") or "KEEP")
    return decision.strip()


def _should_include(row: pd.Series, decision: str, settings: Settings) -> tuple[bool, str]:
    if not as_bool(row.get("is_readable")) or as_bool(row.get("is_corrupted")):
        return False, "corrupted_or_unreadable"
    if as_bool(row.get("is_empty")):
        return False, "empty_file"
    if str(row.get("validation_status")) == "UNSUPPORTED":
        return False, "unsupported_file"
    if not row.get("lesion_type") or not row.get("current_risk_label"):
        return False, "missing_class_folders"
    if decision in REMOVE_DECISIONS:
        return False, f"review_decision:{decision}"
    if as_bool(row.get("is_synthetic")) and settings.exclude_synthetic:
        return False, "synthetic_training_copy"
    if decision in HOLD_DECISIONS and settings.exclude_unreviewed_flags:
        return False, f"held_for_manual_review:{decision}"
    if as_bool(row.get("is_exact_duplicate")) and not as_bool(row.get("is_exact_rep")):
        return False, "exact_duplicate_non_representative"
    if as_bool(row.get("is_cross_label_near_dup")) and decision not in KEEP_DECISIONS and settings.exclude_unreviewed_flags:
        return False, "cross_label_near_duplicate_needs_review"
    if as_bool(row.get("is_ambiguous")) and decision not in KEEP_DECISIONS and settings.exclude_unreviewed_flags:
        return False, "ambiguous_label_needs_review"
    return True, ""


def _keep_tight_near_dup_reps(df: pd.DataFrame, settings: Settings) -> pd.DataFrame:
    """Drop essentially-identical near-duplicates (Hamming <= exact_near_threshold)."""
    drop_ids = set()
    near = df[df["is_near_duplicate"].map(as_bool)]
    for gid, grp in near.groupby("near_dup_group"):
        if len(grp) < 2:
            continue
        # Pairwise: if the whole group is extremely close, keep the best quality image.
        distances = pd.to_numeric(grp["min_near_distance"], errors="coerce").fillna(64)
        if distances.max() <= settings.exact_near_threshold:
            scored = grp.copy()
            scored["_q"] = pd.to_numeric(scored["quality_score"], errors="coerce").fillna(0)
            scored["_px"] = pd.to_numeric(scored["width"], errors="coerce").fillna(0) * pd.to_numeric(
                scored["height"], errors="coerce"
            ).fillna(0)
            keep = scored.sort_values(["_q", "_px", "image_id"], ascending=[False, False, True]).iloc[0]["image_id"]
            drop_ids.update(sid for sid in grp["image_id"] if sid != keep)
    if drop_ids:
        df.loc[df["image_id"].isin(drop_ids), "include_in_v4"] = False
        df.loc[df["image_id"].isin(drop_ids), "exclude_reason"] = "near_duplicate_essentially_identical"
    return df


def _atomic_group(row: pd.Series, settings: Settings) -> str:
    if settings.keep_same_label_near_duplicates and as_bool(row.get("is_near_duplicate")):
        return str(row.get("near_dup_group") or row["image_id"])
    return str(row["image_id"])


def _split_groups(group_ids: list[str], settings: Settings, rng: np.random.RandomState) -> dict[str, str]:
    ids = list(group_ids)
    rng.shuffle(ids)
    n = len(ids)
    if n == 0:
        return {}
    if n == 1:
        return {ids[0]: "train"}
    if n == 2:
        return {ids[0]: "train", ids[1]: "test"}
    if n == 3:
        return {ids[0]: "train", ids[1]: "val", ids[2]: "test"}

    n_test = max(1, int(round(n * settings.test_ratio)))
    n_val = max(1, int(round(n * settings.val_ratio)))
    n_train = n - n_test - n_val
    if n_train < 1:
        n_train = 1
        n_val = max(1, n - n_train - n_test)
        n_test = n - n_train - n_val
    assigned = {}
    assigned.update({gid: "train" for gid in ids[:n_train]})
    assigned.update({gid: "val" for gid in ids[n_train : n_train + n_val]})
    assigned.update({gid: "test" for gid in ids[n_train + n_val :]})
    return assigned


def _unique_dest(dest: Path) -> Path:
    if not dest.exists():
        return dest
    i = 2
    while True:
        candidate = dest.with_name(f"{dest.stem}__{i}{dest.suffix}")
        if not candidate.exists():
            return candidate
        i += 1


def rebuild_dataset(settings: Settings) -> StepResult:
    logger = setup_logging(settings)
    df = load_index(settings)
    if df.empty:
        raise RuntimeError("Image index is empty. Run earlier steps first.")
    review = _load_review(settings)

    include_flags = []
    exclude_reasons = []
    decisions = []
    for _, row in df.iterrows():
        decision = _decision_for(row, review)
        decisions.append(decision)
        ok, why = _should_include(row, decision, settings)
        include_flags.append(ok)
        exclude_reasons.append("" if ok else why)
    df["review_decision"] = decisions
    df["include_in_v4"] = include_flags
    df["exclude_reason"] = exclude_reasons
    df = _keep_tight_near_dup_reps(df, settings)

    kept = df[df["include_in_v4"] == True].copy()
    if kept.empty:
        raise RuntimeError(
            "No images remained after applying review decisions. "
            "Edit reports/review.csv (set decision=KEEP for images you want to keep) and rerun rebuild."
        )

    kept["atomic_group"] = kept.apply(lambda r: _atomic_group(r, settings), axis=1)

    rng = np.random.RandomState(settings.seed)
    split_of_group: dict[str, str] = {}
    for (lesion, risk), part in kept.groupby(["lesion_type", "current_risk_label"], dropna=False):
        group_ids = sorted(part["atomic_group"].unique().tolist())
        payload = f"{settings.seed}:{lesion}:{risk}".encode("utf-8")
        stratum_seed = int(hashlib.sha256(payload).hexdigest()[:8], 16)
        stratum_rng = np.random.RandomState(stratum_seed)
        split_of_group.update(_split_groups(group_ids, settings, stratum_rng))

    kept["assigned_split"] = kept["atomic_group"].map(split_of_group)
    df.loc[kept.index, "assigned_split"] = kept["assigned_split"]
    df.loc[kept.index, "include_in_v4"] = True

    if settings.final_dir.exists():
        shutil.rmtree(settings.final_dir)
    for split in settings.splits:
        for lesion in settings.lesion_types:
            for risk in settings.risk_levels:
                (settings.final_dir / split / lesion / risk).mkdir(parents=True, exist_ok=True)

    final_rel = {}
    copied = 0
    for _, row in tqdm(kept.iterrows(), total=len(kept), desc="Copy V4 images", unit="img"):
        split = row["assigned_split"]
        dest_dir = settings.final_dir / split / row["lesion_type"] / row["current_risk_label"]
        dest = _unique_dest(dest_dir / row["filename"])
        shutil.copy2(row["image_path"], dest)
        rel = str(dest.relative_to(settings.final_dir)).replace("\\", "/")
        final_rel[row["image_id"]] = rel
        copied += 1

    df["final_rel_path"] = df["image_id"].map(final_rel).fillna("")
    save_index(df, settings)

    manifest = df[df["include_in_v4"] == True][
        [
            "image_id",
            "image_path",
            "filename",
            "lesion_type",
            "current_risk_label",
            "assigned_split",
            "final_rel_path",
            "quality_score",
            "exact_dup_group",
            "near_dup_group",
            "review_decision",
        ]
    ].copy()
    manifest_path = save_csv(manifest, settings.reports_dir / "dataset_manifest.csv")
    excluded = df[df["include_in_v4"] != True][
        ["image_id", "image_path", "filename", "split", "lesion_type", "current_risk_label", "exclude_reason"]
    ].copy()
    excluded_path = save_csv(excluded, settings.reports_dir / "excluded_from_v4.csv")

    counts = (
        kept.groupby(["assigned_split", "lesion_type", "current_risk_label"])
        .size()
        .reset_index(name="count")
        .sort_values(["assigned_split", "lesion_type", "current_risk_label"])
    )
    counts_path = save_csv(counts, settings.reports_dir / "v4_class_counts.csv")

    summary = {
        "original_images": len(df),
        "included_in_v4": int(copied),
        "excluded": int(len(df) - copied),
        "final_dataset": str(settings.final_dir),
        "split_method": "stratified_by_lesion_and_risk; near-duplicate groups stay in one split",
        "train": int((kept["assigned_split"] == "train").sum()),
        "val": int((kept["assigned_split"] == "val").sum()),
        "test": int((kept["assigned_split"] == "test").sum()),
        "seed": settings.seed,
        "note": "Original dataset was not modified. Unreviewed CHECK_LABEL images were held out, not relabelled.",
    }
    print_summary("Rebuild Skin_Risk_Dataset_V4", summary)
    print("\n  Split × Lesion × Risk counts:")
    for _, row in counts.iterrows():
        print(f"    {row['assigned_split']:5}  {row['lesion_type']:6}  {row['current_risk_label']:6}  {row['count']}")
    result = StepResult(
        "07_rebuild",
        summary,
        [str(manifest_path), str(excluded_path), str(counts_path), str(settings.final_dir)],
    )
    write_step_summary(settings, result)
    logger.info("Rebuilt dataset at %s", settings.final_dir)
    return result
