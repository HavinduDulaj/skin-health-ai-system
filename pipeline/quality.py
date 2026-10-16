"""Step 4: image quality analysis. Flags images for review; does not delete them."""

from __future__ import annotations

import pandas as pd
from tqdm import tqdm

from .common import (
    StepResult,
    as_bool,
    load_index,
    open_rgb,
    print_summary,
    quality_metrics,
    save_csv,
    save_index,
    setup_logging,
    write_step_summary,
)
from .settings import Settings


def analyze_quality(settings: Settings) -> StepResult:
    logger = setup_logging(settings)
    df = load_index(settings)
    if df.empty:
        raise RuntimeError("Image index is empty. Run the validate step first.")

    metrics_rows = []
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Quality analysis", unit="img"):
        if as_bool(row.get("is_corrupted")) or not as_bool(row.get("is_readable")):
            metrics_rows.append(
                {
                    "blur_laplacian": "",
                    "brightness_mean": "",
                    "pixel_std": "",
                    "entropy": "",
                    "overexposure_ratio": "",
                    "underexposure_ratio": "",
                    "quality_score": 0.0,
                    "quality_flags": "unreadable_or_corrupted",
                    "is_low_quality": True,
                }
            )
            continue
        try:
            image = open_rgb(row["image_path"])
            metrics_rows.append(quality_metrics(image, settings))
            image.close()
        except Exception as exc:  # noqa: BLE001
            metrics_rows.append(
                {
                    "blur_laplacian": "",
                    "brightness_mean": "",
                    "pixel_std": "",
                    "entropy": "",
                    "overexposure_ratio": "",
                    "underexposure_ratio": "",
                    "quality_score": 0.0,
                    "quality_flags": f"quality_error:{type(exc).__name__}",
                    "is_low_quality": True,
                }
            )

    metrics_df = pd.DataFrame(metrics_rows)
    for col in metrics_df.columns:
        df[col] = metrics_df[col].values

    save_index(df, settings)
    report = df[
        [
            "image_id",
            "image_path",
            "filename",
            "split",
            "lesion_type",
            "current_risk_label",
            "width",
            "height",
            "quality_score",
            "blur_laplacian",
            "brightness_mean",
            "pixel_std",
            "entropy",
            "overexposure_ratio",
            "underexposure_ratio",
            "quality_flags",
            "is_low_quality",
            "is_corrupted",
            "validation_status",
        ]
    ].copy()
    report_path = save_csv(report, settings.reports_dir / "quality_report.csv")
    flagged_path = save_csv(
        report[report["is_low_quality"] == True],
        settings.reports_dir / "quality_flagged.csv",
    )

    flag_counts: dict[str, int] = {}
    for flags in df["quality_flags"].fillna(""):
        for flag in str(flags).split("|"):
            if flag:
                flag_counts[flag] = flag_counts.get(flag, 0) + 1

    summary = {
        "images": len(df),
        "low_quality_flagged": int(df["is_low_quality"].astype(bool).sum()),
        "mean_quality_score": round(float(pd.to_numeric(df["quality_score"], errors="coerce").mean() or 0), 4),
        "median_quality_score": round(float(pd.to_numeric(df["quality_score"], errors="coerce").median() or 0), 4),
        "flag_counts": flag_counts,
        "note": "Borderline images are flagged for Review/, not deleted.",
        "report": str(report_path),
    }
    print_summary("Image quality", {k: v for k, v in summary.items() if k != "flag_counts"})
    if flag_counts:
        print("  quality flag counts:")
        for key, value in sorted(flag_counts.items(), key=lambda kv: (-kv[1], kv[0])):
            print(f"    {key}: {value}")
    result = StepResult("04_quality", summary, [str(report_path), str(flagged_path)])
    write_step_summary(settings, result)
    logger.info("Quality analysis complete. Flagged %s images", summary["low_quality_flagged"])
    return result
