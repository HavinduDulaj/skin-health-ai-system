#!/usr/bin/env python3
"""Train a CPU-friendly linear risk head on frozen EfficientNet-B0 features.

Full fine-tuning is slow without a GPU. This probe is honest about that:
it is not the V5 Keras checkpoint. It is a screening head fitted on the
cleaned V4 train split so the clinic UI can return real probabilities.
"""

from __future__ import annotations

import json
import random
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
DATA_ROOT = ROOT / "pipeline_output" / "Skin_Risk_Dataset_V4"
OUT_DIR = ROOT / "models"
RISK_ORDER = ["Low", "Medium", "High"]
VALID_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
PER_CLASS = 90


def list_samples(split: str) -> dict[str, list[Path]]:
    root = DATA_ROOT / split
    buckets: dict[str, list[Path]] = defaultdict(list)
    if not root.exists():
        raise FileNotFoundError(f"Missing dataset at {root}")
    for lesion_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        for risk_dir in sorted(p for p in lesion_dir.iterdir() if p.is_dir()):
            if risk_dir.name not in RISK_ORDER:
                continue
            for path in risk_dir.iterdir():
                if path.is_file() and path.suffix.lower() in VALID_EXTS:
                    buckets[risk_dir.name].append(path)
    return buckets


def take(buckets: dict[str, list[Path]], k: int, seed: int) -> tuple[list[Path], list[int]]:
    rng = random.Random(seed)
    paths: list[Path] = []
    labels: list[int] = []
    for idx, name in enumerate(RISK_ORDER):
        pool = list(buckets.get(name, []))
        rng.shuffle(pool)
        chosen = pool[: min(k, len(pool))]
        paths.extend(chosen)
        labels.extend([idx] * len(chosen))
    return paths, labels


def extract_features(paths: list[Path]) -> np.ndarray:
    import torch
    from torch.utils.data import DataLoader, Dataset
    from torchvision import models

    from pipeline.augmentation import torchvision_eval_transforms

    class Paths(Dataset):
        def __init__(self, files):
            self.files = files
            self.tf = torchvision_eval_transforms()

        def __len__(self):
            return len(self.files)

        def __getitem__(self, i):
            image = Image.open(self.files[i]).convert("RGB")
            return self.tf(image)

    device = torch.device("cpu")
    weights = models.EfficientNet_B0_Weights.DEFAULT
    backbone = models.efficientnet_b0(weights=weights)
    backbone.classifier = torch.nn.Identity()
    backbone.eval().to(device)

    loader = DataLoader(Paths(paths), batch_size=8, shuffle=False, num_workers=0)
    chunks = []
    with torch.no_grad():
        for batch in loader:
            chunks.append(backbone(batch.to(device)).cpu().numpy())
    return np.concatenate(chunks, axis=0)


def main() -> None:
    print(f"Dataset: {DATA_ROOT}")
    train_paths, train_y = take(list_samples("train"), PER_CLASS, 42)
    val_paths, val_y = take(list_samples("val"), 40, 7)
    print(f"Extracting train features: {len(train_paths)}")
    x_train = extract_features(train_paths)
    print(f"Extracting val features: {len(val_paths)}")
    x_val = extract_features(val_paths)

    scaler = StandardScaler()
    x_train_s = scaler.fit_transform(x_train)
    x_val_s = scaler.transform(x_val)

    clf = LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        C=0.4,
        solver="lbfgs",
    )
    clf.fit(x_train_s, np.array(train_y))
    pred = clf.predict(x_val_s)
    acc = float(accuracy_score(val_y, pred))
    f1 = float(f1_score(val_y, pred, average="macro"))
    print(f"Val accuracy={acc:.3f}  macro F1={f1:.3f}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    np.savez(
        OUT_DIR / "risk_head.npz",
        coef=clf.coef_.astype(np.float32),
        intercept=clf.intercept_.astype(np.float32),
        mean=scaler.mean_.astype(np.float32),
        scale=scaler.scale_.astype(np.float32),
        classes=np.array(RISK_ORDER),
    )
    meta = {
        "architecture": "EfficientNet-B0 frozen features + logistic regression",
        "train_images": len(train_paths),
        "val_images": len(val_paths),
        "val_accuracy": acc,
        "val_macro_f1": f1,
        "note": "Linear probe for the clinic UI. Not the V5 Keras checkpoint. Medium remains the hard class.",
        "classes": RISK_ORDER,
    }
    (OUT_DIR / "risk_head.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_DIR / 'risk_head.npz'}")


if __name__ == "__main__":
    main()
