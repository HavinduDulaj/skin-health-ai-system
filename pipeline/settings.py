"""Load and resolve pipeline settings from YAML, environment, and CLI."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


DEFAULT_CONFIG_NAME = "config.yaml"


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


@dataclass
class Settings:
    seed: int = 42
    dataset_root: Path = Path(".")
    output_root: Path = Path("pipeline_output")
    splits: list[str] = field(default_factory=lambda: ["train", "val", "test"])
    lesion_types: list[str] = field(
        default_factory=lambda: ["acne", "burns", "rash", "warts"]
    )
    risk_levels: list[str] = field(default_factory=lambda: ["Low", "Medium", "High"])
    valid_extensions: list[str] = field(
        default_factory=lambda: [".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"]
    )
    min_width: int = 64
    min_height: int = 64
    min_file_bytes: int = 128
    unusual_aspect_ratio: float = 4.0
    phash_size: int = 8
    phash_threshold: int = 8
    dhash_threshold: int = 8
    exact_near_threshold: int = 2
    blur_laplacian_threshold: float = 40.0
    overexposure_ratio: float = 0.80
    underexposure_ratio: float = 0.80
    low_contrast_std: float = 10.0
    low_entropy: float = 3.0
    label_phash_threshold: int = 8
    medium_priority_threshold: int = 10
    train_ratio: float = 0.70
    val_ratio: float = 0.15
    test_ratio: float = 0.15
    exclude_unreviewed_flags: bool = True
    exclude_synthetic: bool = True
    keep_same_label_near_duplicates: bool = True
    final_dataset_name: str = "Skin_Risk_Dataset_V4"

    @property
    def reports_dir(self) -> Path:
        return self.output_root / "reports"

    @property
    def review_dir(self) -> Path:
        return self.output_root / "Review"

    @property
    def working_dir(self) -> Path:
        return self.output_root / "working"

    @property
    def logs_dir(self) -> Path:
        return self.output_root / "logs"

    @property
    def final_dir(self) -> Path:
        return self.output_root / self.final_dataset_name

    @property
    def index_path(self) -> Path:
        return self.working_dir / "image_index.csv"

    def ensure_dirs(self) -> None:
        for path in (
            self.output_root,
            self.reports_dir,
            self.review_dir,
            self.working_dir,
            self.logs_dir,
        ):
            path.mkdir(parents=True, exist_ok=True)

    def expected_class_dirs(self) -> list[Path]:
        paths = []
        for split in self.splits:
            for lesion in self.lesion_types:
                for risk in self.risk_levels:
                    paths.append(self.dataset_root / split / lesion / risk)
        return paths


def _as_path(value: str | Path | None, fallback: Path, base: Path) -> Path:
    if value is None or str(value).strip() == "":
        path = Path(fallback)
    else:
        path = Path(value).expanduser()
    if not path.is_absolute():
        path = base / path
    return path.resolve()


def load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Config file must be a mapping: {path}")
    return data


def load_settings(
    dataset_root: str | Path | None = None,
    output_root: str | Path | None = None,
    config_path: str | Path | None = None,
    seed: int | None = None,
) -> Settings:
    cfg_file = Path(config_path) if config_path else _project_root() / DEFAULT_CONFIG_NAME
    raw = load_yaml(cfg_file)

    settings = Settings()
    for key, value in raw.items():
        if hasattr(settings, key) and key not in {"dataset_root", "output_root"}:
            setattr(settings, key, value)

    env_dataset = os.environ.get("DATASET_ROOT")
    env_output = os.environ.get("OUTPUT_ROOT")
    root = _project_root()
    settings.dataset_root = _as_path(
        dataset_root or env_dataset or raw.get("dataset_root"),
        root / "data" / "raw" / "Skin_Risk_Dataset_V5_Synthetic",
        root,
    )
    settings.output_root = _as_path(
        output_root or env_output or raw.get("output_root"),
        root / "pipeline_output",
        root,
    )
    if seed is not None:
        settings.seed = int(seed)

    settings.valid_extensions = [
        ext.lower() if ext.startswith(".") else f".{ext.lower()}"
        for ext in settings.valid_extensions
    ]
    ratio_sum = settings.train_ratio + settings.val_ratio + settings.test_ratio
    if abs(ratio_sum - 1.0) > 1e-6:
        raise ValueError(f"Split ratios must sum to 1.0, got {ratio_sum}")
    return settings
