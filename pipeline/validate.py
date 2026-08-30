"""Step 1: recursive dataset validation."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from PIL import Image
from tqdm import tqdm

from .common import (
    StepResult,
    classify_path,
    file_sha256,
    is_probable_image,
    load_index,
    print_summary,
    relative_to_dataset,
    save_csv,
    save_index,
    setup_logging,
    write_step_summary,
)
from .settings import Settings


def _scan_files(settings: Settings) -> list[Path]:
    if not settings.dataset_root.exists():
        raise FileNotFoundError(
            f"Dataset root does not exist: {settings.dataset_root}\n"
            "Set --dataset-root or the DATASET_ROOT environment variable."
        )
    files = [p for p in settings.dataset_root.rglob("*") if is_probable_image(p)]
    return sorted(files)


def _folder_inventory(settings: Settings) -> pd.DataFrame:
    rows = []
    for path in settings.expected_class_dirs():
        exists = path.exists() and path.is_dir()
        n_files = 0
        if exists:
            n_files = sum(1 for p in path.iterdir() if p.is_file() and not p.name.startswith("."))
        try:
            rel = str(path.resolve().relative_to(settings.dataset_root.resolve())).replace("\\", "/")
        except ValueError:
            rel = str(path)
        split, lesion, risk = classify_path(path / "placeholder.jpg", settings)
        rows.append(
            {
                "folder": rel,
                "exists": exists,
                "file_count": n_files,
                "split": split,
                "lesion_type": lesion,
                "risk_label": risk,
                "status": "OK" if exists else "MISSING",
            }
        )
    return pd.DataFrame(rows)


def _tag_synthetic(df: pd.DataFrame, settings: Settings) -> pd.DataFrame:
    """Mark V5 manifest synthetic copies so rebuild can exclude them."""
    manifest = settings.dataset_root / "DATASET_MANIFEST_V5.csv"
    if not manifest.exists():
        df["is_synthetic"] = False
        return df
    meta = pd.read_csv(manifest)
    if "output_filepath" not in meta.columns or "is_synthetic" not in meta.columns:
        df["is_synthetic"] = False
        return df
    flag = {
        str(path).replace("\\", "/"): bool(synth)
        for path, synth in zip(meta["output_filepath"], meta["is_synthetic"])
    }
    rel = df["rel_path"] if "rel_path" in df.columns else df["image_path"].map(
        lambda p: str(p).replace("\\", "/")
    )
    df["is_synthetic"] = rel.map(lambda p: flag.get(str(p).replace("\\", "/"), False))
    return df


def validate_dataset(settings: Settings) -> StepResult:
    logger = setup_logging(settings)
    settings.ensure_dirs()
    logger.info("Scanning dataset at %s", settings.dataset_root)

    folder_df = _folder_inventory(settings)
    missing = folder_df.loc[~folder_df["exists"], "folder"].tolist()
    files = _scan_files(settings)

    records = []
    for idx, path in enumerate(tqdm(files, desc="Validate images", unit="img")):
        split, lesion, risk = classify_path(path, settings)
        ext = path.suffix.lower()
        file_bytes = path.stat().st_size if path.exists() else 0
        is_empty = file_bytes < settings.min_file_bytes
        is_valid_ext = ext in settings.valid_extensions
        notes: list[str] = []
        width = height = channels = 0
        mode = ""
        readable = False
        corrupted = False
        too_small = False
        unusual_aspect = False

        if not is_valid_ext:
            notes.append(f"unsupported_extension:{ext or 'none'}")
        if is_empty:
            notes.append("empty_or_tiny_file")
        if split is None or lesion is None or risk is None:
            notes.append("unexpected_folder_location")

        if is_valid_ext and not is_empty:
            try:
                with Image.open(path) as image:
                    image.verify()
                with Image.open(path) as image:
                    image.load()
                    width, height = image.size
                    mode = image.mode
                    channels = len(image.getbands())
                    readable = True
                    too_small = width < settings.min_width or height < settings.min_height
                    if height > 0:
                        ratio = width / height
                        unusual_aspect = ratio > settings.unusual_aspect_ratio or ratio < (
                            1.0 / settings.unusual_aspect_ratio
                        )
                    if too_small:
                        notes.append(f"too_small:{width}x{height}")
                    if unusual_aspect:
                        notes.append(f"unusual_aspect:{width}x{height}")
            except Exception as exc:  # noqa: BLE001 – we want every unreadable file flagged
                corrupted = True
                notes.append(f"corrupted:{type(exc).__name__}: {exc}")
        elif is_valid_ext and is_empty:
            corrupted = True

        if not is_valid_ext:
            status = "UNSUPPORTED"
        elif corrupted or is_empty:
            status = "INVALID"
        elif not readable:
            status = "INVALID"
        elif too_small:
            status = "WARN"
        else:
            status = "OK"

        records.append(
            {
                "image_id": f"img_{idx:06d}",
                "image_path": str(path.resolve()),
                "rel_path": relative_to_dataset(path, settings),
                "filename": path.name,
                "split": split or "",
                "lesion_type": lesion or "",
                "current_risk_label": risk or "",
                "extension": ext,
                "file_bytes": file_bytes,
                "width": width,
                "height": height,
                "channels": channels,
                "mode": mode,
                "is_readable": readable,
                "is_valid_extension": is_valid_ext,
                "is_empty": is_empty,
                "is_corrupted": corrupted,
                "is_too_small": too_small,
                "is_unusual_aspect": unusual_aspect,
                "validation_status": status,
                "validation_notes": ";".join(notes),
                "file_sha256": file_sha256(path) if path.exists() and file_bytes > 0 else "",
                "is_synthetic": False,
            }
        )

    df = pd.DataFrame(records)
    if df.empty:
        df = load_index(settings)
    else:
        df = _tag_synthetic(df, settings)

    existing = load_index(settings)
    if not existing.empty and not df.empty:
        keep = [c for c in existing.columns if c not in df.columns]
        if keep:
            df = df.merge(existing[["image_path", *keep]], on="image_path", how="left")

    save_index(df, settings)
    invalid = df[df["validation_status"].isin(["INVALID", "UNSUPPORTED"])].copy()
    warn = df[df["validation_status"] == "WARN"].copy()
    invalid_path = save_csv(invalid, settings.reports_dir / "validation_invalid.csv")
    warn_path = save_csv(warn, settings.reports_dir / "validation_warnings.csv")
    folder_path = save_csv(folder_df, settings.reports_dir / "folder_inventory.csv")
    full_path = save_csv(
        df[
            [
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
                "validation_status",
                "validation_notes",
            ]
        ],
        settings.reports_dir / "validation_report.csv",
    )

    summary = {
        "dataset_root": str(settings.dataset_root),
        "expected_folders": len(folder_df),
        "missing_folders": len(missing),
        "files_scanned": len(df),
        "readable_ok": int((df["validation_status"] == "OK").sum()) if not df.empty else 0,
        "warnings": int(len(warn)),
        "invalid_or_corrupted": int(((df["is_corrupted"] == True) | (df["validation_status"] == "INVALID")).sum()) if not df.empty else 0,
        "unsupported": int((df["validation_status"] == "UNSUPPORTED").sum()) if not df.empty else 0,
        "empty_or_tiny_files": int((df["is_empty"] == True).sum()) if not df.empty else 0,
        "synthetic_images": int((df["is_synthetic"] == True).sum()) if not df.empty else 0,
        "outside_expected_tree": int((df["split"] == "").sum()) if not df.empty else 0,
    }
    if missing:
        summary["missing_folder_list"] = "; ".join(missing)
    print_summary("Dataset validation", summary)
    result = StepResult("01_validate", summary, [str(full_path), str(invalid_path), str(warn_path), str(folder_path)])
    write_step_summary(settings, result)
    logger.info("Validation complete. Invalid report: %s", invalid_path)
    return result
