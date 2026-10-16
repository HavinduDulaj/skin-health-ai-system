"""Step 3: near-duplicate detection with perceptual hashing."""

from __future__ import annotations

import pandas as pd
from tqdm import tqdm

from .common import (
    StepResult,
    UnionFind,
    as_bool,
    as_int,
    compute_hashes,
    hamming_hex,
    load_index,
    open_rgb,
    print_summary,
    save_csv,
    save_index,
    setup_logging,
    write_step_summary,
)
from .settings import Settings


def _pair_near_duplicates(df: pd.DataFrame, settings: Settings) -> UnionFind:
    usable = df[(df["phash"] != "") & df["image_id"].notna()].copy()
    ids = df["image_id"].tolist()
    uf = UnionFind(ids)
    items = list(usable[["image_id", "phash", "dhash"]].itertuples(index=False, name=None))
    # Full pairwise Hamming comparison. This is the leakage-critical check.
    for i, (id_a, pha, dha) in enumerate(tqdm(items, desc="Near-dup pairs")):
        for id_b, phb, dhb in items[i + 1 :]:
            # pHash is the primary near-dup signal. dHash is stored for review
            # but not OR-ed in, because that over-groups similar clinical photos.
            if hamming_hex(str(pha), str(phb)) <= settings.phash_threshold:
                uf.union(id_a, id_b)
    return uf


def detect_near_duplicates(settings: Settings) -> StepResult:
    logger = setup_logging(settings)
    df = load_index(settings)
    if df.empty:
        raise RuntimeError("Image index is empty. Run the validate step first.")

    phashes: list[str] = []
    dhashes: list[str] = []
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Perceptual hashes", unit="img"):
        if row.get("phash") and row.get("dhash"):
            phashes.append(str(row["phash"]))
            dhashes.append(str(row["dhash"]))
            continue
        if as_bool(row.get("is_readable")) and not as_bool(row.get("is_corrupted")):
            try:
                image = open_rgb(row["image_path"])
                phash, dhash = compute_hashes(image, settings)
                phashes.append(phash)
                dhashes.append(dhash)
                image.close()
            except Exception:  # noqa: BLE001
                phashes.append("")
                dhashes.append("")
        else:
            phashes.append("")
            dhashes.append("")
    df["phash"] = phashes
    df["dhash"] = dhashes

    uf = _pair_near_duplicates(df, settings)
    groups = uf.groups()

    group_id_of = {}
    group_size_of = {}
    for gidx, members in enumerate(sorted(groups.values(), key=lambda m: min(m)), start=1):
        gid = f"near_{gidx:05d}"
        for member in members:
            group_id_of[member] = gid
            group_size_of[member] = len(members)

    df["near_dup_group"] = df["image_id"].map(group_id_of)
    df["near_dup_size"] = df["image_id"].map(group_size_of).fillna(1).astype(int)
    df["is_near_duplicate"] = df["near_dup_size"] > 1

    min_dist = {image_id: 64 for image_id in df["image_id"]}
    hash_by_id = dict(zip(df["image_id"], df["phash"]))
    for members in groups.values():
        if len(members) < 2:
            continue
        for i, a in enumerate(members):
            for b in members[i + 1 :]:
                dist = hamming_hex(hash_by_id.get(a, ""), hash_by_id.get(b, ""))
                min_dist[a] = min(min_dist[a], dist)
                min_dist[b] = min(min_dist[b], dist)
    df["min_near_distance"] = df["image_id"].map(min_dist)

    cross_split = []
    cross_label = []
    cross_lesion = []
    for _, row in df.iterrows():
        grp = df[df["near_dup_group"] == row["near_dup_group"]]
        splits = {s for s in grp["split"].tolist() if s}
        lesions = {s for s in grp["lesion_type"].tolist() if s}
        risks = {s for s in grp["current_risk_label"].tolist() if s}
        cross_split.append(len(splits) > 1 and as_bool(row["is_near_duplicate"]))
        cross_label.append(len(risks) > 1 and as_bool(row["is_near_duplicate"]))
        cross_lesion.append(len(lesions) > 1 and as_bool(row["is_near_duplicate"]))
    df["is_cross_split_near_dup"] = cross_split
    df["is_cross_label_near_dup"] = cross_label
    df["is_cross_lesion_near_dup"] = cross_lesion

    save_index(df, settings)

    rows = []
    near = df[df["is_near_duplicate"]].copy()
    for gid, grp in near.groupby("near_dup_group"):
        splits = sorted({s for s in grp["split"].tolist() if s})
        lesions = sorted({s for s in grp["lesion_type"].tolist() if s})
        risks = sorted({s for s in grp["current_risk_label"].tolist() if s})
        for _, row in grp.iterrows():
            partners = grp.loc[grp["image_id"] != row["image_id"]]
            partner_desc = []
            for _, other in partners.iterrows():
                dist = hamming_hex(str(row["phash"]), str(other["phash"]))
                partner_desc.append(
                    f"{other['filename']} [{other['split']}/{other['lesion_type']}/{other['current_risk_label']}] d={dist}"
                )
            rows.append(
                {
                    "near_dup_group": gid,
                    "group_size": int(row["near_dup_size"]),
                    "image_id": row["image_id"],
                    "image_path": row["image_path"],
                    "filename": row["filename"],
                    "split": row["split"],
                    "lesion_type": row["lesion_type"],
                    "current_risk_label": row["current_risk_label"],
                    "phash": row["phash"],
                    "min_near_distance": as_int(row["min_near_distance"], 64),
                    "cross_split": len(splits) > 1,
                    "cross_lesion": len(lesions) > 1,
                    "cross_risk": len(risks) > 1,
                    "group_splits": "|".join(splits),
                    "group_lesions": "|".join(lesions),
                    "group_risks": "|".join(risks),
                    "possible_leakage": len(splits) > 1,
                    "partners": " || ".join(partner_desc),
                }
            )

    report = pd.DataFrame(rows)
    report_path = save_csv(report, settings.reports_dir / "near_duplicates_report.csv")
    leakage = report[report["possible_leakage"]].copy() if not report.empty else report
    leakage_path = save_csv(leakage, settings.reports_dir / "near_duplicate_leakage_candidates.csv")

    n_groups = near["near_dup_group"].nunique() if not near.empty else 0
    n_leak_groups = leakage["near_dup_group"].nunique() if not leakage.empty else 0
    summary = {
        "images": len(df),
        "near_duplicate_images": int(df["is_near_duplicate"].sum()),
        "near_duplicate_groups": int(n_groups),
        "groups_spanning_splits": int(n_leak_groups),
        "images_in_cross_split_groups": int(df["is_cross_split_near_dup"].sum()),
        "images_in_cross_label_groups": int(df["is_cross_label_near_dup"].sum()),
        "phash_threshold": settings.phash_threshold,
        "dhash_threshold": settings.dhash_threshold,
        "report": str(report_path),
    }
    print_summary("Near duplicates", summary)
    result = StepResult("03_near_duplicates", summary, [str(report_path), str(leakage_path)])
    write_step_summary(settings, result)
    logger.info("Near-duplicate detection complete: %s groups, %s cross-split", n_groups, n_leak_groups)
    return result
