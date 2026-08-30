#!/usr/bin/env python3
"""Step-by-step skin-risk dataset pipeline.

Examples
--------
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output validate
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output exact-dups
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output all

Google Colab
------------
import os
os.environ["DATASET_ROOT"] = "/content/drive/MyDrive/your_dataset"
os.environ["OUTPUT_ROOT"] = "/content/pipeline_output"
%run run_pipeline.py all
"""

from __future__ import annotations

import argparse
import sys

from pipeline.augmentation import print_recommendations
from pipeline.exact_dups import detect_exact_duplicates
from pipeline.labels import analyze_label_consistency
from pipeline.leakage import check_leakage
from pipeline.near_dups import detect_near_duplicates
from pipeline.quality import analyze_quality
from pipeline.rebuild import rebuild_dataset
from pipeline.review import build_review_set
from pipeline.settings import load_settings
from pipeline.statistics import generate_statistics
from pipeline.validate import validate_dataset


STEPS = [
    ("validate", "Scan folders and verify images", validate_dataset),
    ("exact-dups", "Detect exact file/pixel duplicates", detect_exact_duplicates),
    ("near-dups", "Detect perceptual near-duplicates", detect_near_duplicates),
    ("quality", "Score image quality and flag problems", analyze_quality),
    ("labels", "Flag within-lesion risk-label ambiguity", analyze_label_consistency),
    ("review", "Build Review/ folders and review.csv", build_review_set),
    ("rebuild", "Apply decisions and write Skin_Risk_Dataset_V4", rebuild_dataset),
    ("stats", "Write statistics and README_DATASET_V4.txt", generate_statistics),
    ("leakage-check", "Re-check V4 for cross-split leakage", check_leakage),
    ("aug-help", "Print train-only augmentation guidance", None),
]


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit, review, and rebuild a skin-risk image dataset without modifying the original files."
    )
    parser.add_argument(
        "step",
        choices=[name for name, _, _ in STEPS] + ["all"],
        help="Pipeline step to run. Use 'all' to run every step in order.",
    )
    parser.add_argument("--dataset-root", default=None, help="Original dataset (train/val/test). Never overwritten.")
    parser.add_argument("--output-root", default=None, help="New directory for reports, Review/, and V4.")
    parser.add_argument("--config", default=None, help="Optional YAML config path.")
    parser.add_argument("--seed", type=int, default=None, help="Random seed (default from config.yaml: 42).")
    parser.add_argument(
        "--include-unreviewed",
        action="store_true",
        help="On rebuild, keep CHECK_LABEL / CHECK_QUALITY / REVIEW images instead of holding them out.",
    )
    return parser.parse_args(argv)


def run(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    settings = load_settings(
        dataset_root=args.dataset_root,
        output_root=args.output_root,
        config_path=args.config,
        seed=args.seed,
    )
    if args.include_unreviewed:
        settings.exclude_unreviewed_flags = False

    print(f"Dataset root : {settings.dataset_root}")
    print(f"Output root  : {settings.output_root}")
    print(f"Seed         : {settings.seed}")
    print("The original dataset will not be deleted or overwritten.")

    selected = [s for s in STEPS] if args.step == "all" else [s for s in STEPS if s[0] == args.step]
    for name, description, func in selected:
        print(f"\n---------- {name}: {description} ----------")
        if name == "aug-help":
            print_recommendations()
            continue
        func(settings)
    return 0


if __name__ == "__main__":
    sys.exit(run())
