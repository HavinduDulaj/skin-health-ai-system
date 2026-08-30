"""Step 5: risk-label consistency within each lesion type.

Does not relabel. Visually similar images with different risk labels are
flagged for manual review, with extra attention on Medium.
"""

from __future__ import annotations

import pandas as pd
from tqdm import tqdm

from .common import (
    StepResult,
    as_bool,
    hamming_hex,
    load_index,
    print_summary,
    save_csv,
    save_index,
    setup_logging,
    write_step_summary,
)
from .settings import Settings


def _usable(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out = out[out["phash"].fillna("").astype(str).str.len() > 0]
    out = out[out["lesion_type"].fillna("") != ""]
    out = out[out["current_risk_label"].fillna("") != ""]
    out = out[out["is_readable"].map(as_bool)]
    return out


def analyze_label_consistency(settings: Settings) -> StepResult:
    logger = setup_logging(settings)
    df = load_index(settings)
    if df.empty:
        raise RuntimeError("Image index is empty. Run earlier steps first.")
    if df["phash"].fillna("").eq("").all():
        raise RuntimeError("No perceptual hashes found. Run the near-duplicate step first.")

    work = _usable(df)
    nearest_risk = {i: "" for i in df["image_id"]}
    nearest_dist = {i: "" for i in df["image_id"]}
    nearest_path = {i: "" for i in df["image_id"]}
    sim_low = {i: False for i in df["image_id"]}
    sim_med = {i: False for i in df["image_id"]}
    sim_high = {i: False for i in df["image_id"]}
    ambiguous = {i: False for i in df["image_id"]}
    reason = {i: "" for i in df["image_id"]}

    threshold = settings.label_phash_threshold
    medium_threshold = settings.medium_priority_threshold

    for lesion, lesion_df in work.groupby("lesion_type"):
        records = list(
            lesion_df[
                ["image_id", "current_risk_label", "phash", "image_path", "filename"]
            ].itertuples(index=False, name=None)
        )
        by_risk: dict[str, list[tuple]] = {"Low": [], "Medium": [], "High": []}
        for rec in records:
            if rec[1] in by_risk:
                by_risk[rec[1]].append(rec)

        for image_id, risk, phash, path, filename in tqdm(
            records, desc=f"Label check [{lesion}]", unit="img", leave=False
        ):
            best_risk = ""
            best_dist = 99
            best_path = ""
            hits = {"Low": False, "Medium": False, "High": False}
            for other_risk, others in by_risk.items():
                if other_risk == risk:
                    continue
                for other_id, _, other_hash, other_path, _ in others:
                    dist = hamming_hex(str(phash), str(other_hash))
                    limit = medium_threshold if risk == "Medium" or other_risk == "Medium" else threshold
                    if dist <= limit:
                        hits[other_risk] = True
                    if dist < best_dist:
                        best_dist = dist
                        best_risk = other_risk
                        best_path = other_path
            nearest_risk[image_id] = best_risk
            nearest_dist[image_id] = best_dist if best_dist < 99 else ""
            nearest_path[image_id] = best_path
            sim_low[image_id] = hits["Low"]
            sim_med[image_id] = hits["Medium"]
            sim_high[image_id] = hits["High"]

            notes = []
            if risk == "Medium" and hits["Low"] and hits["High"]:
                notes.append("medium_similar_to_both_low_and_high")
            elif risk == "Medium" and hits["Low"]:
                notes.append("medium_similar_to_low")
            elif risk == "Medium" and hits["High"]:
                notes.append("medium_similar_to_high")
            elif hits["Low"] or hits["Medium"] or hits["High"]:
                notes.append(f"{risk.lower()}_similar_to_other_risk")
            if notes:
                ambiguous[image_id] = True
                reason[image_id] = ";".join(notes)

    df["nearest_other_risk"] = df["image_id"].map(nearest_risk)
    df["nearest_other_risk_distance"] = df["image_id"].map(nearest_dist)
    df["nearest_other_risk_path"] = df["image_id"].map(nearest_path)
    df["similar_to_low"] = df["image_id"].map(sim_low)
    df["similar_to_medium"] = df["image_id"].map(sim_med)
    df["similar_to_high"] = df["image_id"].map(sim_high)
    df["is_ambiguous"] = df["image_id"].map(ambiguous)
    df["ambiguity_reason"] = df["image_id"].map(reason)
    save_index(df, settings)

    flagged = df[df["is_ambiguous"] == True].copy()
    cols = [
        "image_id",
        "image_path",
        "filename",
        "split",
        "lesion_type",
        "current_risk_label",
        "nearest_other_risk",
        "nearest_other_risk_distance",
        "nearest_other_risk_path",
        "similar_to_low",
        "similar_to_medium",
        "similar_to_high",
        "ambiguity_reason",
        "quality_score",
    ]
    cols = [c for c in cols if c in flagged.columns]
    report_path = save_csv(flagged[cols], settings.reports_dir / "ambiguous_samples.csv")

    medium = df[df["current_risk_label"] == "Medium"]
    summary = {
        "images_compared": int(len(work)),
        "ambiguous_flagged": int(df["is_ambiguous"].astype(bool).sum()),
        "medium_total": int(len(medium)),
        "medium_similar_to_low": int(medium["similar_to_low"].astype(bool).sum()) if len(medium) else 0,
        "medium_similar_to_high": int(medium["similar_to_high"].astype(bool).sum()) if len(medium) else 0,
        "medium_similar_to_both": int(
            (medium["similar_to_low"].astype(bool) & medium["similar_to_high"].astype(bool)).sum()
        )
        if len(medium)
        else 0,
        "auto_relabelled": 0,
        "note": "No labels were changed. Ambiguous samples need clinical review.",
        "report": str(report_path),
    }
    print_summary("Risk-label consistency (within lesion type)", summary)
    result = StepResult("05_label_consistency", summary, [str(report_path)])
    write_step_summary(settings, result)
    logger.info("Label consistency complete. Ambiguous: %s", summary["ambiguous_flagged"])
    return result
