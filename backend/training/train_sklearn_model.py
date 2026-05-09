from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from PIL import Image, ImageEnhance, ImageOps
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

try:
    from .sklearn_features import extract_features, iter_images
except ImportError:  # Keeps direct script execution working.
    from sklearn_features import extract_features, iter_images


RISK_BY_LABEL = {
    "acne": "Low",
    "rashes": "Medium",
    "burns": "High",
    "warts": "Medium",
}

CONDITION_BY_LABEL = {
    "acne": "Acne",
    "rashes": "Rashes",
    "burns": "Burns",
    "warts": "Warts",
}


def augment_image(image: Image.Image):
    image = ImageOps.exif_transpose(image).convert("RGB")
    yield image
    yield ImageOps.mirror(image)
    yield image.rotate(8, resample=Image.Resampling.BICUBIC, expand=False)
    yield image.rotate(-8, resample=Image.Resampling.BICUBIC, expand=False)
    yield ImageEnhance.Color(image).enhance(1.12)
    yield ImageEnhance.Contrast(image).enhance(1.12)


def load_split(split_dir: Path, augment: bool = False, include_advanced: bool = True):
    features = []
    labels = []
    paths = []
    skipped = []

    for label, image_path in iter_images(split_dir):
        if label not in RISK_BY_LABEL:
            continue

        try:
            with Image.open(image_path) as image:
                images = augment_image(image) if augment else [ImageOps.exif_transpose(image).convert("RGB")]
                for candidate in images:
                    features.append(extract_features(candidate, include_advanced=include_advanced))
                    labels.append(label)
                    paths.append(str(image_path))
        except Exception as exc:
            skipped.append({"path": str(image_path), "error": str(exc)})
            continue

    if not features:
        return np.empty((0, 1), dtype=np.float32), np.asarray([]), paths, skipped

    return np.vstack(features), np.asarray(labels), paths, skipped


def build_model():
    svc = make_pipeline(
        StandardScaler(),
        SVC(C=8, gamma="scale", kernel="rbf", probability=True, class_weight="balanced"),
    )
    forest = RandomForestClassifier(
        n_estimators=700,
        max_features="sqrt",
        min_samples_leaf=1,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )
    trees = ExtraTreesClassifier(
        n_estimators=900,
        max_features="sqrt",
        min_samples_leaf=1,
        class_weight="balanced",
        random_state=7,
        n_jobs=-1,
    )
    return VotingClassifier(
        estimators=[("svc", svc), ("forest", forest), ("trees", trees)],
        voting="soft",
        weights=[2, 1, 2],
        n_jobs=-1,
    )


def evaluate(name: str, model, features: np.ndarray, labels: np.ndarray):
    if len(labels) == 0:
        return {"samples": 0, "conditionAccuracy": 0, "riskAccuracy": 0}

    predictions = model.predict(features)
    risk_labels = np.asarray([RISK_BY_LABEL[label] for label in labels])
    risk_predictions = np.asarray([RISK_BY_LABEL[label] for label in predictions])
    ordered_labels = sorted(RISK_BY_LABEL)

    return {
        "samples": int(len(labels)),
        "conditionAccuracy": round(float(accuracy_score(labels, predictions)), 4),
        "riskAccuracy": round(float(accuracy_score(risk_labels, risk_predictions)), 4),
        "confusionMatrix": {
            actual: {
                predicted: int(value)
                for predicted, value in zip(ordered_labels, row)
                if int(value) > 0
            }
            for actual, row in zip(ordered_labels, confusion_matrix(labels, predictions, labels=ordered_labels))
        },
        "classificationReport": classification_report(
            labels,
            predictions,
            labels=ordered_labels,
            output_dict=True,
            zero_division=0,
        ),
        "name": name,
    }


def main():
    parser = argparse.ArgumentParser(description="Train a stronger skin lesion risk model.")
    parser.add_argument("--dataset", default="dataset")
    parser.add_argument(
        "--feature-set",
        choices=["legacy", "advanced"],
        default="legacy",
        help="Use legacy features for the strongest current metrics, or advanced for richer experimental features.",
    )
    parser.add_argument(
        "--augment",
        action="store_true",
        help="Train with mirrored, rotated, color, and contrast image variants.",
    )
    parser.add_argument(
        "--output",
        default="backend/models/risk_model.joblib",
    )
    args = parser.parse_args()

    dataset_dir = Path(args.dataset).resolve()
    output_path = Path(args.output).resolve()
    include_advanced = args.feature_set == "advanced"

    train_x, train_y, train_paths, skipped_train = load_split(
        dataset_dir / "train",
        augment=args.augment,
        include_advanced=include_advanced,
    )
    val_x, val_y, val_paths, skipped_val = load_split(
        dataset_dir / "val",
        include_advanced=include_advanced,
    )
    test_x, test_y, test_paths, skipped_test = load_split(
        dataset_dir / "test",
        include_advanced=include_advanced,
    )

    if len(train_y) == 0:
        raise SystemExit("No usable training images were found.")

    model = build_model()
    model.fit(train_x, train_y)

    metrics = {
        "train": evaluate("train", model, train_x, train_y),
        "val": evaluate("val", model, val_x, val_y),
        "test": evaluate("test", model, test_x, test_y),
    }

    package = {
        "modelType": "sklearn-ensemble-image-classifier",
        "featureSet": args.feature_set,
        "augmentationEnabled": bool(args.augment),
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "model": model,
        "labels": sorted(RISK_BY_LABEL),
        "riskByLabel": RISK_BY_LABEL,
        "conditionByLabel": CONDITION_BY_LABEL,
        "trainingCounts": dict(Counter(train_y)),
        "metrics": metrics,
        "paths": {
            "train": train_paths,
            "val": val_paths,
            "test": test_paths,
        },
        "skippedImages": skipped_train + skipped_val + skipped_test,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(package, output_path)

    summary_path = output_path.with_suffix(".metrics.json")
    summary = {key: value for key, value in package.items() if key not in {"model", "paths"}}
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Saved model: {output_path}")
    print(f"Saved metrics: {summary_path}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
