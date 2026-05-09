from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from math import exp
from pathlib import Path

from PIL import Image

from image_features import cosine_similarity, display_condition, extract_features, iter_images


RISK_BY_LABEL = {
    "acne": "Low",
    "rashes": "Medium",
    "burns": "High",
    "warts": "Medium",
}


def load_split(split_dir: Path):
    features = []
    skipped = []

    for label, image_path in iter_images(split_dir):
        if label not in RISK_BY_LABEL:
            continue

        try:
            with Image.open(image_path) as image:
                feature = extract_features(image)
        except Exception as exc:
            skipped.append({"path": str(image_path), "error": str(exc)})
            continue

        features.append({"label": label, "path": str(image_path), "feature": feature})

    return features, skipped


def train_centroids(samples):
    grouped = defaultdict(list)
    for sample in samples:
        grouped[sample["label"]].append(sample["feature"])

    centroids = {}
    for label, vectors in grouped.items():
        size = len(vectors[0])
        centroid = [sum(vector[index] for vector in vectors) / len(vectors) for index in range(size)]
        centroids[label] = centroid

    return centroids


def predict_label(feature, centroids):
    ranked = sorted(
        (
            {"label": label, "score": cosine_similarity(feature, centroid)}
            for label, centroid in centroids.items()
        ),
        key=lambda item: item["score"],
        reverse=True,
    )
    return ranked[0]["label"], ranked


def predict_label_from_references(feature, references, neighbors=35):
    matches = sorted(
        (
            {"label": sample["label"], "score": cosine_similarity(feature, sample["feature"])}
            for sample in references
        ),
        key=lambda item: item["score"],
        reverse=True,
    )[:neighbors]

    scores = defaultdict(float)
    for rank, item in enumerate(matches):
        scores[item["label"]] += exp(item["score"] * 8.0) / (rank + 1)

    ranked = sorted(
        ({"label": label, "score": score} for label, score in scores.items()),
        key=lambda item: item["score"],
        reverse=True,
    )
    return ranked[0]["label"], ranked


def evaluate(samples, references):
    total = 0
    correct_condition = 0
    correct_risk = 0
    confusion = defaultdict(Counter)

    for sample in samples:
        predicted_label, _ = predict_label_from_references(sample["feature"], references)
        actual_label = sample["label"]
        total += 1
        confusion[actual_label][predicted_label] += 1

        if predicted_label == actual_label:
            correct_condition += 1
        if RISK_BY_LABEL[predicted_label] == RISK_BY_LABEL[actual_label]:
            correct_risk += 1

    if total == 0:
        return {
            "samples": 0,
            "conditionAccuracy": 0,
            "riskAccuracy": 0,
            "confusionMatrix": {},
        }

    return {
        "samples": total,
        "conditionAccuracy": round(correct_condition / total, 4),
        "riskAccuracy": round(correct_risk / total, 4),
        "confusionMatrix": {
            actual: dict(predicted_counts)
            for actual, predicted_counts in sorted(confusion.items())
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Train the skin lesion risk model.")
    parser.add_argument("--dataset", default="dataset", help="Dataset folder with train/val/test splits.")
    parser.add_argument(
        "--output",
        default="member2-risk-prediction/saved_model/risk_model.json",
        help="Model JSON output path.",
    )
    args = parser.parse_args()

    dataset_dir = Path(args.dataset).resolve()
    output_path = Path(args.output).resolve()
    train_dir = dataset_dir / "train"
    val_dir = dataset_dir / "val"
    test_dir = dataset_dir / "test"

    if not train_dir.exists():
        raise SystemExit(f"Training folder not found: {train_dir}")

    train_samples, skipped_train = load_split(train_dir)
    if not train_samples:
        raise SystemExit("No usable training images were found.")

    centroids = train_centroids(train_samples)
    labels = sorted(centroids)

    val_samples, skipped_val = load_split(val_dir) if val_dir.exists() else ([], [])
    test_samples, skipped_test = load_split(test_dir) if test_dir.exists() else ([], [])

    model = {
        "modelType": "weighted-nearest-neighbor-image-feature-classifier",
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "labels": labels,
        "riskByLabel": RISK_BY_LABEL,
        "conditionByLabel": {label: display_condition(label) for label in labels},
        "centroids": centroids,
        "references": train_samples,
        "neighbors": 35,
        "trainingCounts": dict(Counter(sample["label"] for sample in train_samples)),
        "metrics": {
            "train": evaluate(train_samples, train_samples),
            "val": evaluate(val_samples, train_samples),
            "test": evaluate(test_samples, train_samples),
        },
        "skippedImages": skipped_train + skipped_val + skipped_test,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(model, indent=2), encoding="utf-8")

    print(f"Saved model: {output_path}")
    print(json.dumps(model["metrics"], indent=2))


if __name__ == "__main__":
    main()
