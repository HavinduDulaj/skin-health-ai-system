"""Step 9: post-rebuild exact and near-duplicate leakage check on V4."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, ImageOps
from tqdm import tqdm

from .common import (
    StepResult,
    UnionFind,
    compute_hashes,
    file_sha256,
    hamming_hex,
    is_probable_image,
    pixel_sha256,
    print_summary,
    save_csv,
    setup_logging,
    write_step_summary,
)
from .settings import Settings


def _iter_v4(settings: Settings) -> list[dict]:
    root = settings.final_dir
    if not root.exists():
        raise FileNotFoundError(f"Final dataset not found: {root}. Run rebuild first.")
    rows = []
    for path in sorted(p for p in root.rglob("*") if is_probable_image(p)):
        if path.suffix.lower() not in settings.valid_extensions:
            continue
        try:
            rel = path.resolve().relative_to(root.resolve())
            parts = rel.parts
        except ValueError:
            continue
        if len(parts) < 4:
            continue
        split, lesion, risk = parts[0], parts[1], parts[2]
        if split not in settings.splits:
            continue
        rows.append(
            {
                "image_path": str(path.resolve()),
                "filename": path.name,
                "split": split,
                "lesion_type": lesion,
                "current_risk_label": risk,
            }
        )
    return rows


def _hashes_for(path: str, settings: Settings) -> tuple[str, str, str, str]:
    p = Path(path)
    file_hash = file_sha256(p)
    image = Image.open(p)
    image = ImageOps.exif_transpose(image).convert("RGB")
    pix = pixel_sha256(np.asarray(image))
    phash, dhash = compute_hashes(image, settings)
    image.close()
    return file_hash, pix, phash, dhash


def check_leakage(settings: Settings) -> StepResult:
    logger = setup_logging(settings)
    records = _iter_v4(settings)
    if not records:
        raise RuntimeError("Skin_Risk_Dataset_V4 contains no images.")

    for row in tqdm(records, desc="V4 leakage hashes", unit="img"):
        try:
            file_hash, pix, phash, dhash = _hashes_for(row["image_path"], settings)
            row.update({"file_sha256": file_hash, "pixel_sha256": pix, "phash": phash, "dhash": dhash, "ok": True})
        except Exception as exc:  # noqa: BLE001
            row.update(
                {
                    "file_sha256": "",
                    "pixel_sha256": "",
                    "phash": "",
                    "dhash": "",
                    "ok": False,
                    "error": str(exc),
                }
            )

    df = pd.DataFrame(records)
    ids = [f"v4_{i:06d}" for i in range(len(df))]
    df["image_id"] = ids

    exact_uf = UnionFind(ids)
    file_map: dict[str, str] = {}
    pix_map: dict[str, str] = {}
    for _, row in df.iterrows():
        if row.get("file_sha256"):
            if row["file_sha256"] in file_map:
                exact_uf.union(row["image_id"], file_map[row["file_sha256"]])
            else:
                file_map[row["file_sha256"]] = row["image_id"]
        if row.get("pixel_sha256"):
            if row["pixel_sha256"] in pix_map:
                exact_uf.union(row["image_id"], pix_map[row["pixel_sha256"]])
            else:
                pix_map[row["pixel_sha256"]] = row["image_id"]

    near_uf = UnionFind(ids)
    items = list(df[["image_id", "phash", "dhash"]].itertuples(index=False, name=None))
    for i, (id_a, pha, dha) in enumerate(tqdm(items, desc="V4 near-dup pairs")):
        if not pha:
            continue
        for id_b, phb, dhb in items[i + 1 :]:
            if not phb:
                continue
            if hamming_hex(str(pha), str(phb)) <= settings.phash_threshold:
                near_uf.union(id_a, id_b)

    leak_rows = []

    def _collect(kind: str, groups: dict[str, list[str]]) -> int:
        leaked = 0
        for members in groups.values():
            if len(members) < 2:
                continue
            part = df[df["image_id"].isin(members)]
            splits = sorted(set(part["split"]))
            if len(splits) > 1:
                leaked += 1
                leak_rows.append(
                    {
                        "kind": kind,
                        "splits": "|".join(splits),
                        "group_size": len(members),
                        "lesions": "|".join(sorted(set(part["lesion_type"]))),
                        "risks": "|".join(sorted(set(part["current_risk_label"]))),
                        "files": " || ".join(part["image_path"].tolist()),
                    }
                )
        return leaked

    exact_leaks = _collect("exact", exact_uf.groups())
    near_leaks = _collect("near", near_uf.groups())

    report = pd.DataFrame(leak_rows)
    report_path = save_csv(report, settings.reports_dir / "leakage_report.csv")

    passed = exact_leaks == 0 and near_leaks == 0
    pairs = {
        "train_vs_val": _pair_leak(df, "train", "val", settings),
        "train_vs_test": _pair_leak(df, "train", "test", settings),
        "val_vs_test": _pair_leak(df, "val", "test", settings),
    }
    passed = passed and all(v == 0 for v in pairs.values())

    summary = {
        "v4_images": len(df),
        "exact_cross_split_groups": exact_leaks,
        "near_cross_split_groups": near_leaks,
        "train_vs_val_leaks": pairs["train_vs_val"],
        "train_vs_test_leaks": pairs["train_vs_test"],
        "val_vs_test_leaks": pairs["val_vs_test"],
        "result": "DATA LEAKAGE CHECK: PASSED" if passed else "DATA LEAKAGE CHECK: FAILED",
        "report": str(report_path),
    }
    print_summary("Final data-leakage check", summary)
    print()
    print(summary["result"])
    print()
    result = StepResult("09_leakage_check", summary, [str(report_path)])
    write_step_summary(settings, result)
    logger.info("%s", summary["result"])
    if not passed:
        logger.warning("Inspect %s and rebuild after resolving leaking groups.", report_path)
    return result


def _pair_leak(df: pd.DataFrame, split_a: str, split_b: str, settings: Settings) -> int:
    a = df[df["split"] == split_a]
    b = df[df["split"] == split_b]
    hashes_a = set(a["file_sha256"]) | set(a["pixel_sha256"])
    hashes_a.discard("")
    n_exact = int(b["file_sha256"].isin(hashes_a).sum() + b["pixel_sha256"].isin(hashes_a).sum())
    # Near: compare hashes across the two splits only.
    n_near = 0
    items_a = list(a[["phash", "dhash"]].itertuples(index=False, name=None))
    items_b = list(b[["phash", "dhash"]].itertuples(index=False, name=None))
    for pha, dha in items_a:
        if not pha:
            continue
        for phb, dhb in items_b:
            if not phb:
                continue
            if hamming_hex(str(pha), str(phb)) <= settings.phash_threshold:
                n_near += 1
                break
    return int(n_exact + n_near)
