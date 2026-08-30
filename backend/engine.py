"""Load the screening head and run a single-image assessment."""

from __future__ import annotations

import json
import zipfile
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO

import numpy as np
from PIL import Image, ImageOps

from backend.config import (
    CKPT_CANDIDATES,
    CONFIDENCE_MIN,
    HEAD_META_PATH,
    HEAD_PATH,
    LESIONS,
    MARGIN_MIN,
    PIPELINE_OUTPUT,
    QUALITY_MIN,
    RISK_ORDER,
    V5_IMAGE_SIZE,
    V5_KERAS_SRC,
    V5_META_PATH,
    V5_WEIGHTS,
)
from backend.research import DISCLAIMER
from pipeline.common import quality_metrics
from pipeline.settings import Settings, load_settings

GUIDANCE = {
    "Low": {
        "headline": "Low risk — monitor with ordinary skincare.",
        "summary": (
            "Minor or common appearance with limited abnormality indicators. "
            "This is risk awareness, not clearance. Watch the area."
        ),
        "steps": [
            "Keep the area clean. Avoid picking or covering it with makeup.",
            "Photograph it again in two to three days, same light, same distance.",
            "See a clinician if it spreads, weeps, becomes painful, or you develop a fever.",
        ],
        "alert": None,
    },
    "Medium": {
        "headline": "Medium risk — observe, and seek guidance if it persists.",
        "summary": (
            "The condition may need monitoring. Medium is also where this dataset "
            "overlaps Low and High, so do not treat a single score as a verdict."
        ),
        "steps": [
            "Note pain, itch, warmth, discharge, or rapid change.",
            "If it is not settling, book a clinician. Sooner if it is worsening.",
            "Do not start aggressive home treatment while you wait.",
        ],
        "alert": "If the condition persists or worsens, seek professional dermatological guidance.",
    },
    "High": {
        "headline": "High risk — consult a dermatologist.",
        "summary": (
            "Stronger abnormality indicators or a higher-severity pattern. "
            "This is not an emergency diagnosis. It is a reason to seek clinical evaluation."
        ),
        "steps": [
            "Consult a dermatologist for further evaluation.",
            "Seek timely care if there is spreading redness, severe pain, fever, or streaking.",
            "If symptoms escalate quickly, use urgent or emergency services rather than this tool.",
        ],
        "alert": "Higher-risk indicators detected. Please consult a dermatologist. This is not a diagnosis.",
    },
}

ABSTAIN_GUIDANCE = {
    "headline": "No single grade — the safety filter held the result.",
    "summary": (
        "The two leading grades are too close, or confidence is too low, to commit. "
        "The proposal requires a caution message instead of a forced label."
    ),
    "steps": [
        "Read the probability distribution rather than a winner.",
        "Retake the photograph in daylight, lesion filling most of the frame.",
        "See a clinician if the area is painful, spreading, or changing quickly.",
    ],
    "alert": "Prediction confidence is low. Do not interpret this as a risk grade. Retake the photo or consult a clinician.",
}

QUALITY_GUIDANCE = {
    "headline": "This frame is not suitable for screening.",
    "summary": (
        "Brightness, focus, or resolution failed the quality gate. "
        "The proposal rejects the image before lesion analysis."
    ),
    "steps": [
        "Hold steady. Motion looks like blur to the model.",
        "Use side daylight. Avoid flash and heavy digital zoom.",
        "Fill the ring with the lesion and run the screening again.",
    ],
    "alert": "Image quality is too low for a reliable screen. Please upload a clearer photograph.",
}

POLICY = {
    "confidence_min": CONFIDENCE_MIN,
    "margin_min": MARGIN_MIN,
    "quality_min": QUALITY_MIN,
    "note": (
        "Abstain when confidence or top-two margin is below threshold. "
        "Reject the frame when quality is below threshold."
    ),
}


@dataclass
class ModelHandle:
    kind: str
    classes: list[str]
    meta: dict
    backbone: object | None = None
    transform: object | None = None
    coef: np.ndarray | None = None
    intercept: np.ndarray | None = None
    mean: np.ndarray | None = None
    scale: np.ndarray | None = None
    torch_model: object | None = None
    keras_model: object | None = None
    image_size: int = 224


def _softmax(logits: np.ndarray) -> np.ndarray:
    z = logits - logits.max()
    e = np.exp(z)
    return e / e.sum()


def _entropy(probs: np.ndarray) -> float:
    p = np.clip(probs.astype(np.float64), 1e-12, 1.0)
    return float(-(p * np.log(p)).sum())


@lru_cache(maxsize=1)
def _settings() -> Settings:
    return load_settings(output_root=PIPELINE_OUTPUT)


def _load_backbone():
    import torch
    from torchvision import models

    from pipeline.augmentation import torchvision_eval_transforms

    weights = models.EfficientNet_B0_Weights.DEFAULT
    backbone = models.efficientnet_b0(weights=weights)
    backbone.classifier = torch.nn.Identity()
    backbone.eval()
    return backbone, torchvision_eval_transforms()


def v5_available() -> bool:
    return V5_KERAS_SRC.exists() or V5_WEIGHTS.exists()


def _extract_v5_weights():
    V5_WEIGHTS.parent.mkdir(parents=True, exist_ok=True)
    if V5_WEIGHTS.exists():
        return V5_WEIGHTS
    if not V5_KERAS_SRC.exists():
        raise FileNotFoundError(f"Missing V5 checkpoint at {V5_KERAS_SRC}")
    with zipfile.ZipFile(V5_KERAS_SRC) as archive:
        V5_WEIGHTS.write_bytes(archive.read("model.weights.h5"))
    return V5_WEIGHTS


def _build_v5_model():
    import keras
    from keras import layers

    image = keras.Input(shape=(V5_IMAGE_SIZE, V5_IMAGE_SIZE, 3), name="image", dtype="float32")
    lesion = keras.Input(shape=(len(LESIONS),), name="lesion", dtype="float32")
    backbone = keras.applications.EfficientNetV2B0(
        include_top=False,
        pooling="avg",
        weights=None,
        input_shape=(V5_IMAGE_SIZE, V5_IMAGE_SIZE, 3),
        name="efficientnetv2-b0",
    )
    image_feat = layers.Dropout(0.25, name="dropout")(backbone(image, training=False))
    lesion_feat = layers.Dropout(0.1, name="dropout_1")(
        layers.Dense(32, activation="silu", name="dense")(lesion)
    )
    merged = layers.Concatenate(name="concatenate")([image_feat, lesion_feat])
    hidden = layers.Dense(256, activation="silu", name="dense_1")(merged)
    hidden = layers.BatchNormalization(name="batch_normalization")(hidden)
    hidden = layers.Dropout(0.4, name="dropout_2")(hidden)
    risk = layers.Dense(len(RISK_ORDER), activation="softmax", name="risk")(hidden)
    model = keras.Model({"image": image, "lesion": lesion}, risk, name="skin_risk_v5")
    model.load_weights(_extract_v5_weights())
    return model


def _load_v5() -> ModelHandle:
    meta = {}
    if V5_META_PATH.exists():
        meta = json.loads(V5_META_PATH.read_text(encoding="utf-8"))
    return ModelHandle(
        kind="keras_v5",
        classes=list(RISK_ORDER),
        meta={
            "architecture": meta.get(
                "architecture",
                "EfficientNetV2B0 + lesion context (V5)",
            ),
            "checkpoint": "skin_risk_v5_final.keras",
            "test_accuracy": meta.get("test_accuracy"),
            "test_macro_f1": meta.get("test_macro_f1"),
            "image_size": meta.get("image_size", V5_IMAGE_SIZE),
        },
        keras_model=_build_v5_model(),
        image_size=int(meta.get("image_size", V5_IMAGE_SIZE)),
    )


def load_model() -> ModelHandle | None:
    if v5_available():
        return _load_v5()

    if any(path.exists() for path in CKPT_CANDIDATES):
        import torch

        from pipeline.augmentation import torchvision_eval_transforms
        from train_v4 import build_model

        ckpt_path = next(path for path in CKPT_CANDIDATES if path.exists())
        device = torch.device("cpu")
        ckpt = torch.load(ckpt_path, map_location=device)
        classes = list(ckpt.get("classes") or RISK_ORDER)
        model = build_model(len(classes), device)
        model.load_state_dict(ckpt["model"])
        model.eval()
        return ModelHandle(
            kind="efficientnet_finetune",
            classes=classes,
            meta={
                "architecture": "EfficientNet-B0 fine-tuned (train_v4.py)",
                "checkpoint": str(ckpt_path.name),
            },
            transform=torchvision_eval_transforms(),
            torch_model=model,
        )

    if not HEAD_PATH.exists():
        return None

    payload = np.load(HEAD_PATH)
    meta = {}
    if HEAD_META_PATH.exists():
        meta = json.loads(HEAD_META_PATH.read_text(encoding="utf-8"))
    backbone, transform = _load_backbone()
    classes = [str(x) for x in payload["classes"].tolist()]
    return ModelHandle(
        kind="linear_probe",
        classes=classes,
        meta=meta,
        backbone=backbone,
        transform=transform,
        coef=payload["coef"],
        intercept=payload["intercept"],
        mean=payload["mean"],
        scale=payload["scale"],
    )


_MODEL: ModelHandle | None = None


def get_model() -> ModelHandle | None:
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    try:
        _MODEL = load_model()
    except Exception as exc:  # noqa: BLE001
        print(f"Model load failed: {exc}")
        _MODEL = None
    return _MODEL


def model_kind() -> str | None:
    handle = get_model()
    return None if handle is None else handle.kind


def open_image(data: bytes) -> Image.Image:
    image = Image.open(BytesIO(data))
    image = ImageOps.exif_transpose(image)
    return image.convert("RGB")


def _predict_probe(handle: ModelHandle, image: Image.Image) -> np.ndarray:
    import torch

    tensor = handle.transform(image).unsqueeze(0)
    with torch.no_grad():
        features = handle.backbone(tensor).cpu().numpy()[0]
    scaled = (features - handle.mean) / np.clip(handle.scale, 1e-6, None)
    logits = scaled @ handle.coef.T + handle.intercept
    return _softmax(logits.astype(np.float64))


def _predict_torch(handle: ModelHandle, image: Image.Image) -> np.ndarray:
    import torch
    import torch.nn.functional as F

    tensor = handle.transform(image).unsqueeze(0)
    with torch.no_grad():
        logits = handle.torch_model(tensor)
        probs = F.softmax(logits, dim=1).cpu().numpy()[0]
    return probs


def _keras_image_batch(image: Image.Image, size: int, n: int = 1) -> np.ndarray:
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    arr = np.asarray(resized, dtype=np.float32)[None, ...]
    if n == 1:
        return arr
    return np.repeat(arr, n, axis=0)


def _keras_forward(handle: ModelHandle, images: np.ndarray, lesions: np.ndarray) -> np.ndarray:
    out = handle.keras_model.predict({"image": images, "lesion": lesions}, verbose=0)
    return np.asarray(out)


def _keras_risk_by_lesion(handle: ModelHandle, image: Image.Image) -> np.ndarray:
    """Risk softmax for each of the four lesion families — one batch."""
    size = handle.image_size or V5_IMAGE_SIZE
    images = _keras_image_batch(image, size, len(LESIONS))
    lesions = np.eye(len(LESIONS), dtype=np.float32)
    return _keras_forward(handle, images, lesions)


def _identify_condition(matrix: np.ndarray) -> dict:
    """Most probable lesion family from the lesion-conditioned risk head (FR5).

    For each family the head returns a Low/Medium/High distribution. The family
    whose leading grade is most confident (then lowest entropy) is the detected
    condition. That output is passed into the risk module, as the proposal
    specifies. A user-supplied family may override it.
    """
    confidences = matrix.max(axis=1)
    entropies = np.array([_entropy(row) for row in matrix], dtype=np.float64)
    ranked = np.lexsort((entropies, -confidences))
    idx = int(ranked[0])
    scores = _softmax(confidences.astype(np.float64))
    order = np.argsort(scores)[::-1]
    margin = float(scores[order[0]] - scores[order[1]]) if len(order) > 1 else 1.0
    uncertain = margin < 0.06
    note = (
        f"Most probable family: {LESIONS[idx]} "
        f"({scores[idx]:.0%} among the four lesion contexts)."
    )
    if uncertain:
        note += " The four families are close; confirm the type if you know it."
    return {
        "detected": LESIONS[idx],
        "index": idx,
        "probabilities": {name: float(scores[i]) for i, name in enumerate(LESIONS)},
        "method": "lesion-conditioned confidence",
        "uncertain": uncertain,
        "note": note,
    }


def _predict_keras(
    handle: ModelHandle, image: Image.Image, lesion_key: str | None
) -> tuple[np.ndarray, dict, dict]:
    matrix = _keras_risk_by_lesion(handle, image)
    identification = _identify_condition(matrix)
    used = lesion_key or identification["detected"]
    if used not in LESIONS:
        used = identification["detected"]
    used_idx = LESIONS.index(used)
    source = "user" if lesion_key else "model"
    identification["used"] = used
    identification["source"] = source
    identification["overridden"] = bool(lesion_key and lesion_key != identification["detected"])
    if identification["overridden"]:
        identification["note"] = (
            f"You confirmed {lesion_key}. The identification module estimated "
            f"{identification['detected']}."
        )
    elif source == "user":
        identification["note"] = f"Lesion family confirmed as {used}."
    conditioned = matrix[used_idx]
    uniform = matrix.mean(axis=0)
    shift = {
        name: float(conditioned[idx] - uniform[idx]) for idx, name in enumerate(handle.classes)
    }
    cond_risk = handle.classes[int(np.argmax(conditioned))]
    marg_risk = handle.classes[int(np.argmax(uniform))]
    l1 = float(np.abs(conditioned - uniform).sum())
    effect = {
        "provided": used,
        "risk_conditioned": cond_risk,
        "risk_marginal": marg_risk,
        "probability_shift": shift,
        "l1": l1,
        "note": (
            f"Lesion context ({used}, {source}) "
            + (
                f"moved the leading grade from {marg_risk} to {cond_risk} (L1 {l1:.3f})."
                if cond_risk != marg_risk
                else f"kept the leading grade as {cond_risk} (L1 {l1:.3f} vs mean lesion prior)."
            )
        ),
    }
    return conditioned, effect, identification


def _summarize(handle: ModelHandle, probs: np.ndarray) -> tuple[str, float, float, bool, float]:
    order = np.argsort(probs)[::-1]
    risk = handle.classes[int(order[0])]
    confidence = float(probs[order[0]])
    second = float(probs[order[1]]) if len(order) > 1 else 0.0
    margin = confidence - second
    uncertain = confidence < CONFIDENCE_MIN or margin < MARGIN_MIN
    return risk, confidence, margin, uncertain, _entropy(probs)


def _pipeline_trace(
    *,
    image: Image.Image,
    quality_score: float,
    flags: list[str],
    decision: str,
    identification: dict | None,
    indicators: dict | None,
    risk: str | None,
    confidence: float | None,
    margin: float | None,
    explain: dict | None,
    guidance: dict | None,
) -> list[dict]:
    """Proposal §4.1 — the seven modules, as a run-time trace."""
    quality_ok = decision != "quality_reject"
    model_ran = decision not in {"quality_reject", "unavailable"}
    explain_ok = bool(explain and explain.get("available"))
    detected = (identification or {}).get("detected")
    used = (identification or {}).get("used") or detected
    source = (identification or {}).get("source")
    notes = (indicators or {}).get("notes") or []
    return [
        {
            "id": "input",
            "title": "Image Input",
            "status": "passed",
            "detail": (
                f"{image.width}×{image.height} photograph accepted. "
                "Preprocessed to 260×260 RGB for EfficientNetV2-B0."
            ),
        },
        {
            "id": "quality",
            "title": "Image Quality Assessment",
            "status": "passed" if quality_ok else "rejected",
            "detail": (
                f"Quality score {quality_score:.2f}."
                + (f" Flags: {', '.join(flags)}." if flags else " No quality flags.")
                + ("" if quality_ok else " Frame rejected before lesion analysis.")
            ),
        },
        {
            "id": "lesion",
            "title": "Skin Lesion Identification",
            "status": "skipped" if not model_ran else "passed",
            "detail": (
                "Not run — photograph failed the quality gate."
                if not model_ran
                else (identification or {}).get("note")
                or (f"Condition: {used}." if used else "Condition not identified.")
            ),
        },
        {
            "id": "risk",
            "title": "Risk-Level Screening",
            "status": "skipped" if not model_ran else ("passed" if decision == "grade" else "held"),
            "detail": (
                "Not run — photograph failed the quality gate."
                if decision == "quality_reject"
                else "Screening head is not loaded."
                if decision == "unavailable"
                else (
                    f"Indicators: {notes[0] if notes else 'none'}. "
                    f"Leading grade {risk} at {confidence:.0%} (margin {margin:.0%})."
                    if risk and confidence is not None and margin is not None
                    else "Risk head produced a distribution."
                )
            ),
        },
        {
            "id": "confidence",
            "title": "Confidence-Based Safety Filter",
            "status": (
                "skipped"
                if not model_ran
                else "held"
                if decision == "abstain"
                else "passed"
            ),
            "detail": (
                "Not applied — no grade was computed."
                if not model_ran
                else "Top-two grades too close or confidence below threshold — model abstains."
                if decision == "abstain"
                else f"Confidence {confidence:.0%} and margin {margin:.0%} cleared the thresholds."
                if confidence is not None and margin is not None
                else POLICY["note"]
            ),
        },
        {
            "id": "explain",
            "title": "Explainability (Grad-CAM)",
            "status": "passed" if explain_ok else ("skipped" if not model_ran else "unavailable"),
            "detail": (
                explain.get("note")
                if explain
                else "Heatmap is only computed after a usable photograph and a loaded V5 head."
            ),
        },
        {
            "id": "advisory",
            "title": "Decision Support / Output",
            "status": "passed",
            "detail": (guidance or {}).get("headline")
            or "Advisory messages are screening guidance, not a diagnosis.",
        },
    ]


def _risk_module_trace(
    *,
    identification: dict | None,
    indicators: dict | None,
    decision: str,
    risk: str | None,
    confidence: float | None,
    guidance: dict | None,
) -> list[dict]:
    """Proposal §4.3 — internals of the risk-level screening module."""
    ran = decision not in {"quality_reject", "unavailable"}
    used = (identification or {}).get("used")
    notes = (indicators or {}).get("notes") or []
    return [
        {
            "id": "input_handler",
            "title": "Lesion Analysis Input Handler",
            "status": "passed" if ran else "skipped",
            "detail": f"Received condition '{used}' and probability scores." if used else "No condition scores.",
        },
        {
            "id": "indicators",
            "title": "Feature and Severity Indicator Extraction",
            "status": "passed" if indicators else "skipped",
            "detail": " ".join(notes) if notes else "No indicators extracted.",
        },
        {
            "id": "stratification",
            "title": "Risk Stratification Engine",
            "status": "passed" if ran else "skipped",
            "detail": "EfficientNetV2-B0 risk head with lesion one-hot and classical indicators.",
        },
        {
            "id": "classification",
            "title": "Risk Classification Unit",
            "status": "passed" if decision == "grade" else ("held" if ran else "skipped"),
            "detail": f"Assigned {risk} risk." if risk and decision == "grade" else "No committed grade.",
        },
        {
            "id": "confidence_unit",
            "title": "Confidence Evaluation Unit",
            "status": "held" if decision == "abstain" else ("passed" if ran else "skipped"),
            "detail": (
                f"Confidence {confidence:.0%}."
                if confidence is not None and ran
                else "Not evaluated."
            ),
        },
        {
            "id": "messages",
            "title": "Advisory Message Generator",
            "status": "passed",
            "detail": (guidance or {}).get("headline") or "Guidance prepared.",
        },
        {
            "id": "output",
            "title": "Structured Output Generator",
            "status": "passed",
            "detail": "Packaged condition, risk, confidence, heatmap, and advisory for the interface.",
        },
    ]


def assess_image(data: bytes, lesion: str | None = None, explain: bool = True) -> dict:
    image = open_image(data)
    quality = quality_metrics(image, _settings())
    lesion_key = (lesion or "").strip().lower()
    if lesion_key not in LESIONS:
        lesion_key = None

    flags = [flag for flag in str(quality.get("quality_flags") or "").split("|") if flag]
    quality_score = float(quality["quality_score"])
    low_quality = bool(quality["is_low_quality"])
    quality_block = {
        "score": quality_score,
        "flags": flags,
        "blur": float(quality["blur_laplacian"] or 0),
        "brightness": float(quality["brightness_mean"] or 0),
        "width": image.width,
        "height": image.height,
        "is_low_quality": low_quality,
    }

    from backend.features import extract_severity_indicators

    indicators = extract_severity_indicators(image)
    preprocess = {
        "resized_to": [V5_IMAGE_SIZE, V5_IMAGE_SIZE],
        "color_space": "RGB",
        "normalization": "EfficientNetV2 preprocessing inside the backbone",
        "noise_reduction": "none on the inference tensor",
    }

    handle = get_model()
    probabilities = {name: None for name in RISK_ORDER}
    risk = None
    confidence = None
    margin = None
    entropy = None
    uncertain = True
    lesion_effect = None
    identification = None
    explainability = None
    model_info = {
        "loaded": handle is not None,
        "kind": None if handle is None else handle.kind,
        "meta": {} if handle is None else handle.meta,
    }
    class_index = 0
    used_lesion = lesion_key

    quality_reject = handle is not None and low_quality and quality_score < QUALITY_MIN

    if handle is None:
        decision = "unavailable"
        guidance = None
    elif quality_reject:
        decision = "quality_reject"
        guidance = QUALITY_GUIDANCE
    else:
        if handle.kind == "keras_v5":
            probs, lesion_effect, identification = _predict_keras(handle, image, lesion_key)
            used_lesion = identification.get("used")
        elif handle.kind == "efficientnet_finetune":
            probs = _predict_torch(handle, image)
        else:
            probs = _predict_probe(handle, image)
        for idx, name in enumerate(handle.classes):
            probabilities[name] = float(probs[idx])
        risk, confidence, margin, uncertain, entropy = _summarize(handle, probs)
        class_index = int(np.argmax(probs))
        if uncertain:
            decision = "abstain"
            guidance = ABSTAIN_GUIDANCE
        else:
            decision = "grade"
            guidance = GUIDANCE.get(risk) if risk else None
        if explain and handle.kind == "keras_v5" and risk:
            from backend.explain import gradcam_overlay

            explainability = gradcam_overlay(handle, image, used_lesion, class_index, risk)

    caution = bool(
        (guidance or {}).get("alert")
        or decision in {"abstain", "quality_reject"}
        or (decision == "grade" and risk == "High")
    )
    pipeline = _pipeline_trace(
        image=image,
        quality_score=quality_score,
        flags=flags,
        decision=decision,
        identification=identification,
        indicators=indicators,
        risk=risk,
        confidence=confidence,
        margin=margin,
        explain=explainability,
        guidance=guidance,
    )
    risk_module = _risk_module_trace(
        identification=identification,
        indicators=indicators,
        decision=decision,
        risk=risk,
        confidence=confidence,
        guidance=guidance,
    )

    condition_label = (identification or {}).get("used") or used_lesion
    report = {
        "detected_condition": condition_label,
        "risk_level": risk if decision == "grade" else None,
        "confidence": confidence,
        "advisory": (guidance or {}).get("headline"),
        "alert": (guidance or {}).get("alert"),
        "disclaimer": DISCLAIMER,
    }

    payload = {
        "decision": decision,
        "risk": risk,
        "probabilities": probabilities,
        "confidence": confidence,
        "margin": margin,
        "entropy": entropy,
        "uncertain": uncertain,
        "caution": caution,
        "lesion": used_lesion,
        "condition": identification,
        "indicators": indicators,
        "preprocess": preprocess,
        "lesion_effect": lesion_effect,
        "quality": quality_block,
        "guidance": guidance,
        "explainability": explainability,
        "pipeline": pipeline,
        "risk_module": risk_module,
        "report": report,
        "model": model_info,
        "policy": POLICY,
        "disclaimer": DISCLAIMER,
        "project": {
            "code": "R26-IT-058",
            "component": "Skin Risk Level Identification & Prediction",
            "student_id": "IT22179494",
        },
    }

    try:
        from backend.screening_log import append_screening_log

        append_screening_log(
            {
                "decision": decision,
                "risk": risk,
                "confidence": confidence,
                "margin": margin,
                "entropy": entropy,
                "lesion": used_lesion,
                "detected": (identification or {}).get("detected"),
                "quality_score": quality_score,
                "quality_flags": flags,
                "model_kind": model_info.get("kind"),
                "gradcam": bool(explainability and explainability.get("available")),
            },
            data,
        )
    except OSError:
        pass

    return payload
