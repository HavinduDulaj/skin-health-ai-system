#!/usr/bin/env python3
"""Train a Low/Medium/High risk classifier on Skin_Risk_Dataset_V4.

Scientific constraints
----------------------
- Train on train/ only.
- Tune on val/ only.
- Evaluate test/ once at the end.
- Never augment val or test.
- Never report training accuracy as test accuracy.
- Class weights are used instead of duplicating images.

This script cannot guarantee 90%+ test accuracy. If Medium remains
confused with Low and High after a clean split, the photographs may
not contain enough information to separate those labels.
"""

from __future__ import annotations

import argparse
import json
import random
from collections import Counter
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import models
from tqdm import tqdm

from pipeline.augmentation import torchvision_eval_transforms, torchvision_train_transforms

RISK_ORDER = ["Low", "Medium", "High"]
VALID_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


class RiskFolder(Dataset):
    """Flatten lesion-type folders so the label is Low / Medium / High only."""

    def __init__(self, root, transform=None):
        self.root = Path(root)
        self.transform = transform
        self.classes = list(RISK_ORDER)
        self.class_to_idx = {name: idx for idx, name in enumerate(self.classes)}
        self.samples = []
        for lesion_dir in sorted(p for p in self.root.iterdir() if p.is_dir()):
            for risk_dir in sorted(p for p in lesion_dir.iterdir() if p.is_dir()):
                if risk_dir.name not in self.class_to_idx:
                    continue
                label = self.class_to_idx[risk_dir.name]
                for path in sorted(risk_dir.iterdir()):
                    if path.is_file() and path.suffix.lower() in VALID_EXTS:
                        self.samples.append((str(path), label))
        if not self.samples:
            raise FileNotFoundError(f"No images found under {self.root}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int):
        path, label = self.samples[index]
        image = Image.open(path).convert("RGB")
        if self.transform is not None:
            image = self.transform(image)
        return image, label


def class_weights(dataset: RiskFolder, device: torch.device) -> torch.Tensor:
    counts = Counter(sample[1] for sample in dataset.samples)
    n = sum(counts.values())
    weights = []
    for idx in range(len(dataset.classes)):
        c = counts.get(idx, 1)
        weights.append(n / (len(dataset.classes) * c))
    return torch.tensor(weights, dtype=torch.float32, device=device)


def sample_weights(dataset: RiskFolder) -> list[float]:
    counts = Counter(label for _, label in dataset.samples)
    return [1.0 / counts[label] for _, label in dataset.samples]


def accuracy(logits: torch.Tensor, y: torch.Tensor) -> float:
    return float((logits.argmax(1) == y).float().mean().item())


@torch.no_grad()
def evaluate(model, loader, device, criterion) -> dict:
    model.eval()
    total_loss = 0.0
    n = 0
    correct = 0
    all_y = []
    all_p = []
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        logits = model(x)
        loss = criterion(logits, y)
        total_loss += float(loss.item()) * y.size(0)
        pred = logits.argmax(1)
        correct += int((pred == y).sum().item())
        n += y.size(0)
        all_y.extend(y.cpu().tolist())
        all_p.extend(pred.cpu().tolist())
    return {
        "loss": total_loss / max(n, 1),
        "acc": correct / max(n, 1),
        "y": all_y,
        "pred": all_p,
    }


def classification_table(y, pred, class_names) -> str:
    from collections import defaultdict

    counts = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0, "support": 0})
    for t, p in zip(y, pred):
        counts[t]["support"] += 1
        if t == p:
            counts[t]["tp"] += 1
        else:
            counts[t]["fn"] += 1
            counts[p]["fp"] += 1
    lines = ["class      precision  recall  f1     support"]
    f1s = []
    for idx, name in enumerate(class_names):
        tp = counts[idx]["tp"]
        fp = counts[idx]["fp"]
        fn = counts[idx]["fn"]
        support = counts[idx]["support"]
        prec = tp / (tp + fp) if (tp + fp) else 0.0
        rec = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        f1s.append(f1)
        lines.append(f"{name:<10} {prec:8.3f}  {rec:6.3f}  {f1:5.3f}  {support:7d}")
    lines.append(f"macro F1   {sum(f1s)/len(f1s):.3f}")
    return "\n".join(lines)


def confusion(y, pred, class_names) -> str:
    k = len(class_names)
    mat = np.zeros((k, k), dtype=int)
    for t, p in zip(y, pred):
        mat[t, p] += 1
    header = "true\\pred " + " ".join(f"{n:>8}" for n in class_names)
    rows = [header]
    for i, name in enumerate(class_names):
        rows.append(f"{name:<10}" + " ".join(f"{v:8d}" for v in mat[i]))
    return "\n".join(rows)


def build_model(n_classes: int, device: torch.device) -> nn.Module:
    try:
        weights = models.EfficientNet_B0_Weights.DEFAULT
        model = models.efficientnet_b0(weights=weights)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, n_classes)
    except Exception:
        weights = models.ResNet18_Weights.DEFAULT
        model = models.resnet18(weights=weights)
        model.fc = nn.Linear(model.fc.in_features, n_classes)
    return model.to(device)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train risk classifier on Skin_Risk_Dataset_V4")
    parser.add_argument("--data-root", required=True, help="Path to Skin_Risk_Dataset_V4")
    parser.add_argument("--output-dir", default="training_output")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--num-workers", type=int, default=2)
    parser.add_argument("--patience", type=int, default=5)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    set_seed(args.seed)
    data_root = Path(args.data_root)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    print("Val/test transforms contain resize + normalize only. No augmentation.")

    train_ds = RiskFolder(data_root / "train", transform=torchvision_train_transforms())
    val_ds = RiskFolder(data_root / "val", transform=torchvision_eval_transforms())
    test_ds = RiskFolder(data_root / "test", transform=torchvision_eval_transforms())
    print("Classes:", train_ds.classes)
    print("Train / val / test:", len(train_ds), len(val_ds), len(test_ds))

    sampler = WeightedRandomSampler(sample_weights(train_ds), num_samples=len(train_ds), replacement=True)
    train_loader = DataLoader(
        train_ds, batch_size=args.batch_size, sampler=sampler, num_workers=args.num_workers
    )
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)

    model = build_model(len(train_ds.classes), device)
    weights = class_weights(train_ds, device)
    print("Class weights:", {train_ds.classes[i]: float(weights[i]) for i in range(len(train_ds.classes))})
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_val = -1.0
    stale = 0
    history = []
    for epoch in range(1, args.epochs + 1):
        model.train()
        running = 0.0
        seen = 0
        train_correct = 0
        for x, y in tqdm(train_loader, desc=f"Epoch {epoch}/{args.epochs}"):
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            running += float(loss.item()) * y.size(0)
            train_correct += int((logits.argmax(1) == y).sum().item())
            seen += y.size(0)
        scheduler.step()
        val_stats = evaluate(model, val_loader, device, criterion)
        train_acc = train_correct / max(seen, 1)
        row = {
            "epoch": epoch,
            "train_loss": running / max(seen, 1),
            "train_acc": train_acc,
            "val_loss": val_stats["loss"],
            "val_acc": val_stats["acc"],
        }
        history.append(row)
        print(
            f"epoch {epoch}: train_acc={train_acc:.3f} (not test)  "
            f"val_acc={val_stats['acc']:.3f}  val_loss={val_stats['loss']:.4f}"
        )
        if val_stats["acc"] > best_val:
            best_val = val_stats["acc"]
            stale = 0
            torch.save({"model": model.state_dict(), "classes": train_ds.classes}, out_dir / "best.pt")
        else:
            stale += 1
            if stale >= args.patience:
                print(f"Early stopping on validation (patience={args.patience}).")
                break

    ckpt = torch.load(out_dir / "best.pt", map_location=device)
    model.load_state_dict(ckpt["model"])
    print("\n=== FINAL TEST EVALUATION (single run, unseen test split) ===")
    test_stats = evaluate(model, test_loader, device, criterion)
    print(f"TEST accuracy: {test_stats['acc']:.4f}")
    print("This is the only number that should be reported as test performance.")
    print()
    print(classification_table(test_stats["y"], test_stats["pred"], train_ds.classes))
    print()
    print(confusion(test_stats["y"], test_stats["pred"], train_ds.classes))
    payload = {
        "val_best_acc": best_val,
        "test_acc": test_stats["acc"],
        "history": history,
        "classes": train_ds.classes,
        "note": "train_acc is not test performance. Medium confusion may indicate weak visual separability.",
    }
    (out_dir / "metrics.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"\nWrote {out_dir / 'metrics.json'} and {out_dir / 'best.pt'}")


if __name__ == "__main__":
    main()
