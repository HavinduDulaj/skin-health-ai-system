"""Severity indicators for the risk-level screening module (proposal §3.2 / §4.3).

These are explicit visual measurements — texture, irregularity, colour variation,
and a rough extent — passed into the risk module alongside the CNN outputs.
They are not a diagnosis.
"""

from __future__ import annotations

import numpy as np
from PIL import Image

from pipeline.common import laplacian_variance, shannon_entropy


def extract_severity_indicators(image: Image.Image) -> dict:
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    h, w = rgb.shape[:2]
    gray = np.mean(rgb, axis=2)
    texture = float(laplacian_variance(rgb))
    color_variation = float(np.mean(rgb.std(axis=(0, 1))))
    entropy = float(shannon_entropy(gray))
    left, right = np.array_split(gray, 2, axis=1)
    # Pad if odd width
    n = min(left.shape[1], right.shape[1])
    asymmetry = float(np.mean(np.abs(left[:, :n] - np.fliplr(right[:, :n])))) / 255.0
    median = np.median(rgb.reshape(-1, 3), axis=0)
    distance = np.linalg.norm(rgb.astype(np.float32) - median, axis=2)
    extent = float((distance > (distance.mean() + distance.std())).mean())

    notes: list[str] = []
    if texture > 400:
        notes.append("High local texture: irregular visual structure.")
    elif texture < 40:
        notes.append("Low texture energy: the region is relatively smooth or blurred.")
    if color_variation > 45:
        notes.append("Colour varies strongly across the frame.")
    if asymmetry > 0.18:
        notes.append("Left-right brightness is uneven (shape or lighting irregularity).")
    if extent > 0.35:
        notes.append("A large share of pixels differ from the background colour.")
    if not notes:
        notes.append("No strong abnormality flags from the classical indicators.")

    return {
        "texture_energy": round(texture, 2),
        "color_variation": round(color_variation, 2),
        "structural_irregularity": round(asymmetry, 4),
        "estimated_extent": round(extent, 4),
        "entropy": round(entropy, 3),
        "width": w,
        "height": h,
        "notes": notes,
    }
