"""Step 2: exact duplicate detection across the entire dataset."""

from __future__ import annotations

import pandas as pd
from tqdm import tqdm

import numpy as np

from .common import (
    StepResult,
    UnionFind,
    as_bool,
    load_index,
    open_rgb,
    pixel_sha256,
    print_summary,
    save_csv,
    save_index,
    setup_logging,
    write_step_summary,
)
from .settings import Settings


def detect_exact_duplicates(settings: Settings) -> StepResult:
    logger = setup_logging(settings)
    df = load_index(settings)
    if df.empty:
        raise RuntimeError("Image index is empty. Run the validate step first.")

    pixel_hashes: list[str] = []
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Pixel hashes", unit="img"):
        if row.get("pixel_sha256"):
            pixel_hashes.append(str(row["pixel_sha256"]))
            continue
        if as_bool(row.get("is_readable")) and not as_bool(row.get("is_corrupted")):
            try:
                image = open_rgb(row["image_path"])
                pixel_hashes.append(pixel_sha256(np.asarray(image)))
                image.close()
            except Exception:  # noqa: BLE001
                pixel_hashes.append("")
        else:
            pixel_hashes.append("")
    df["pixel_sha256"] = pixel_hashes

    ids = df["image_id"].tolist()
    uf = UnionFind(ids)
    id_by_file: dict[str, str] = {}
    id_by_pixel: dict[str, str] = {}

    for _, row in df.iterrows():
        image_id = row["image_id"]
        file_hash = str(row.get("file_sha256") or "")
        pix_hash = str(row.get("pixel_sha256") or "")
        if file_hash:
            if file_hash in id_by_file:
                uf.union(image_id, id_by_file[file_hash])
            else:
                id_by_file[file_hash] = image_id
        if pix_hash:
            if pix_hash in id_by_pixel:
                uf.union(image_id, id_by_pixel[pix_hash])
            else:
                id_by_pixel[pix_hash] = image_id

    groups = uf.groups()
    group_id_of = {}
    group_size_of = {}
    for gidx, members in enumerate(sorted(groups.values(), key=lambda m: min(m)), start=1):
        gid = f"exact_{gidx:05d}"
        for member in members:
            group_id_of[member] = gid
            group_size_of[member] = len(members)

    df["exact_dup_group"] = df["image_id"].map(group_id_of)
    df["exact_dup_size"] = df["image_id"].map(group_size_of).astype(int)
    df["is_exact_duplicate"] = df["exact_dup_size"] > 1

    # Representative: prefer readable, larger file, then native resolution.
    df["is_exact_rep"] = False
    for gid, grp in df.groupby("exact_dup_group"):
        scored = grp.copy()
        scored["_score"] = (
            scored["is_readable"].map(lambda x: 1 if as_bool(x) else 0) * 1_000_000
            + pd.to_numeric(scored["file_bytes"], errors="coerce").fillna(0)
            + pd.to_numeric(scored["width"], errors="coerce").fillna(0)
            * pd.to_numeric(scored["height"], errors="coerce").fillna(0) / 1000.0
        )
        best = scored.sort_values(["_score", "image_id"], ascending=[False, True]).iloc[0]["image_id"]
        df.loc[df["image_id"] == best, "is_exact_rep"] = True

    save_index(df, settings)

    dup_rows = []
    dups = df[df["is_exact_duplicate"]].copy()
    for gid, grp in dups.groupby("exact_dup_group"):
        splits = sorted({s for s in grp["split"].tolist() if s})
        lesions = sorted({s for s in grp["lesion_type"].tolist() if s})
        risks = sorted({s for s in grp["current_risk_label"].tolist() if s})
        for _, row in grp.iterrows():
            partners = grp.loc[grp["image_id"] != row["image_id"], "image_path"].tolist()
            dup_rows.append(
                {
                    "exact_dup_group": gid,
                    "group_size": int(row["exact_dup_size"]),
                    "image_id": row["image_id"],
                    "image_path": row["image_path"],
                    "filename": row["filename"],
                    "split": row["split"],
                    "lesion_type": row["lesion_type"],
                    "current_risk_label": row["current_risk_label"],
                    "is_representative": bool(row["is_exact_rep"]),
                    "file_sha256": row.get("file_sha256", ""),
                    "pixel_sha256": row.get("pixel_sha256", ""),
                    "cross_split": len(splits) > 1,
                    "cross_lesion": len(lesions) > 1,
                    "cross_risk": len(risks) > 1,
                    "group_splits": "|".join(splits),
                    "group_lesions": "|".join(lesions),
                    "group_risks": "|".join(risks),
                    "duplicate_partners": " || ".join(partners),
                }
            )

    report = pd.DataFrame(dup_rows)
    report_path = save_csv(report, settings.reports_dir / "duplicates_report.csv")

    n_groups = int((df["exact_dup_size"] > 1).groupby(df["exact_dup_group"]).any().sum()) if len(df) else 0
    if not dups.empty:
        n_groups = dups["exact_dup_group"].nunique()
    else:
        n_groups = 0

    cross_split_groups = 0
    if not report.empty:
        cross_split_groups = int(report.loc[report["cross_split"], "exact_dup_group"].nunique())

    summary = {
        "images": len(df),
        "exact_duplicate_images": int(df["is_exact_duplicate"].sum()),
        "exact_duplicate_groups": n_groups,
        "groups_spanning_splits": cross_split_groups,
        "unique_file_hashes": int(df.loc[df["file_sha256"] != "", "file_sha256"].nunique()),
        "unique_pixel_hashes": int(df.loc[df["pixel_sha256"] != "", "pixel_sha256"].nunique()),
        "report": str(report_path),
    }
    print_summary("Exact duplicates", summary)
    result = StepResult("02_exact_duplicates", summary, [str(report_path)])
    write_step_summary(settings, result)
    logger.info("Exact duplicate detection complete: %s groups", n_groups)
    return result
