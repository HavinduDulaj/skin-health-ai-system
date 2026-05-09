from __future__ import annotations

from functools import lru_cache
from io import BytesIO
from pathlib import Path

import joblib
from PIL import Image

import sys

TRAINING_DIR = Path(__file__).resolve().parents[1] / "training"
if str(TRAINING_DIR) not in sys.path:
    sys.path.append(str(TRAINING_DIR))

from sklearn_features import extract_features  # noqa: E402


MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "risk_model.joblib"

RISK_SCORE = {"Low": 25, "Medium": 60, "High": 90}
RISK_ACTION = {
    "Low": "Monitor the area and follow basic skincare. Recheck if it changes.",
    "Medium": "Monitor closely and consult a dermatologist if it persists, spreads, or worsens.",
    "High": "Consult a medical professional as soon as possible for further evaluation.",
}


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        raise RuntimeError(
            "Trained model not found. Run: python backend/training/train_sklearn_model.py"
        )
    return joblib.load(MODEL_PATH)


def _risk_probabilities(class_probabilities, package):
    risk_by_label = package["riskByLabel"]
    risk_scores = {"Low": 0.0, "Medium": 0.0, "High": 0.0}

    for label, probability in class_probabilities.items():
        risk_scores[risk_by_label[label]] += probability

    return risk_scores


def _select_risk_level(risk_probabilities, top_label_risk=None, top_probability=0.0):
    ranked = sorted(risk_probabilities.items(), key=lambda item: item[1], reverse=True)
    risk_level = ranked[0][0]
    low = risk_probabilities["Low"]
    medium = risk_probabilities["Medium"]
    high = risk_probabilities["High"]

    # Medical triage should not hide meaningful higher-risk evidence behind a
    # narrow low-risk condition prediction.
    if top_label_risk == "High" and top_probability >= 0.30:
        return "High"

    if high >= 0.30 and high >= risk_probabilities[risk_level] - 0.20:
        return "High"

    if risk_level == "Low":
        if high >= 0.20 and high >= low - 0.15:
            return "High"
        if medium >= 0.30 or (medium + high) >= 0.40:
            return "Medium"

    if risk_level == "Medium" and high >= 0.35 and high >= medium - 0.10:
        return "High"

    return risk_level


def _weighted_risk_score(risk_probabilities):
    weighted = sum(RISK_SCORE[risk] * probability for risk, probability in risk_probabilities.items())
    return max(1, min(99, round(weighted)))


def predict_image_risk(image_bytes: bytes):
    try:
        image = Image.open(BytesIO(image_bytes))
    except Exception as exc:
        raise ValueError("Could not read the uploaded image.") from exc

    package = load_model()
    model = package["model"]
    feature = extract_features(image)
    expected_features = getattr(model, "n_features_in_", None)
    if expected_features is not None and feature.size != expected_features:
        feature = extract_features(image, include_advanced=False)
    feature = feature.reshape(1, -1)

    probabilities = model.predict_proba(feature)[0]
    class_probabilities = {
        label: float(probability)
        for label, probability in zip(model.classes_, probabilities)
    }
    predicted_label = max(class_probabilities, key=class_probabilities.get)
    risk_probabilities = _risk_probabilities(class_probabilities, package)
    risk_level = _select_risk_level(
        risk_probabilities,
        top_label_risk=package["riskByLabel"][predicted_label],
        top_probability=class_probabilities[predicted_label],
    )
    condition = package["conditionByLabel"][predicted_label]
    confidence = round(risk_probabilities[risk_level] * 100)

    return {
        "condition": condition,
        "riskLevel": risk_level,
        "riskScore": _weighted_risk_score(risk_probabilities),
        "riskConfidence": max(1, min(99, confidence)),
        "suggestedAction": RISK_ACTION[risk_level],
        "allScores": [
            {
                "condition": package["conditionByLabel"][label],
                "riskLevel": package["riskByLabel"][label],
                "score": round(class_probabilities[label] * 100, 2),
            }
            for label in sorted(class_probabilities, key=class_probabilities.get, reverse=True)
        ],
        "riskScores": [
            {"riskLevel": risk, "score": round(score * 100, 2)}
            for risk, score in sorted(risk_probabilities.items(), key=lambda item: item[1], reverse=True)
        ],
        "disclaimer": "This result is for research decision-support only and is not a medical diagnosis.",
    }
