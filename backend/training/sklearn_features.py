from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}


def normalize_label(label: str) -> str:
    cleaned = label.lower().strip()
    if cleaned == "rash":
        return "rashes"
    return cleaned


def iter_images(split_dir: Path):
    for class_dir in sorted(path for path in split_dir.iterdir() if path.is_dir()):
        label = normalize_label(class_dir.name)
        for image_path in sorted(class_dir.iterdir()):
            if image_path.is_file() and image_path.suffix.lower() in IMAGE_EXTENSIONS:
                yield label, image_path


def _hist(values: np.ndarray, bins: int, value_range=(0.0, 1.0)) -> np.ndarray:
    hist, _ = np.histogram(values, bins=bins, range=value_range)
    hist = hist.astype(np.float32)
    total = hist.sum()
    return hist / total if total else hist


def _lbp_hist(gray: np.ndarray) -> np.ndarray:
    center = gray[1:-1, 1:-1]
    code = np.zeros_like(center, dtype=np.uint8)
    offsets = [
        (-1, -1),
        (-1, 0),
        (-1, 1),
        (0, 1),
        (1, 1),
        (1, 0),
        (1, -1),
        (0, -1),
    ]
    for bit, (dy, dx) in enumerate(offsets):
        neighbor = gray[1 + dy : gray.shape[0] - 1 + dy, 1 + dx : gray.shape[1] - 1 + dx]
        code |= ((neighbor >= center).astype(np.uint8) << bit)
    return _hist(code, bins=32, value_range=(0, 256))


def _edge_stats(gray: np.ndarray) -> np.ndarray:
    gy, gx = np.gradient(gray)
    magnitude = np.sqrt((gx * gx) + (gy * gy))
    angle = (np.arctan2(gy, gx) + np.pi) / (2 * np.pi)
    return np.concatenate(
        [
            np.array(
                [
                    float(magnitude.mean()),
                    float(magnitude.std()),
                    float(np.percentile(magnitude, 75)),
                    float(np.percentile(magnitude, 90)),
                ],
                dtype=np.float32,
            ),
            _hist(angle, bins=18),
        ]
    )


def _region_stats(rgb: np.ndarray, hsv: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    regions = [
        (slice(0, h // 2), slice(0, w // 2)),
        (slice(0, h // 2), slice(w // 2, w)),
        (slice(h // 2, h), slice(0, w // 2)),
        (slice(h // 2, h), slice(w // 2, w)),
        (slice(h // 4, 3 * h // 4), slice(w // 4, 3 * w // 4)),
    ]
    features = []
    for ys, xs in regions:
        rgb_patch = rgb[ys, xs, :]
        hsv_patch = hsv[ys, xs, :]
        features.extend(rgb_patch.mean(axis=(0, 1)))
        features.extend(rgb_patch.std(axis=(0, 1)))
        features.extend(hsv_patch.mean(axis=(0, 1)))
        features.extend(hsv_patch.std(axis=(0, 1)))
    return np.asarray(features, dtype=np.float32)


def _channel_moments(values: np.ndarray) -> np.ndarray:
    flattened = values.reshape(-1, values.shape[-1])
    means = flattened.mean(axis=0)
    stds = flattened.std(axis=0)
    centered = flattened - means
    skew = np.mean(centered * centered * centered, axis=0) / np.maximum(stds**3, 1e-6)
    percentiles = np.percentile(flattened, [5, 25, 50, 75, 95], axis=0).reshape(-1)
    return np.concatenate([means, stds, skew, percentiles]).astype(np.float32)


def _skin_signal_stats(rgb: np.ndarray, hsv: np.ndarray) -> np.ndarray:
    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]
    hue = hsv[:, :, 0]
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    redness = np.clip(red - ((green + blue) / 2.0), 0.0, 1.0)
    dark_area = (value < 0.35).astype(np.float32)
    saturated_area = (saturation > 0.45).astype(np.float32)

    return np.asarray(
        [
            float(redness.mean()),
            float(redness.std()),
            float(np.percentile(redness, 90)),
            float(saturation.mean()),
            float(np.percentile(saturation, 75)),
            float(np.percentile(saturation, 90)),
            float(dark_area.mean()),
            float(saturated_area.mean()),
            float(((hue > 0.92) | (hue < 0.08)).mean()),
        ],
        dtype=np.float32,
    )


def extract_features(image: Image.Image, include_advanced: bool = True) -> np.ndarray:
    image = ImageOps.exif_transpose(image).convert("RGB").resize((128, 128))
    hsv_image = image.convert("HSV")
    gray_image = ImageOps.grayscale(image).resize((64, 64))

    rgb = np.asarray(image, dtype=np.float32) / 255.0
    hsv = np.asarray(hsv_image, dtype=np.float32) / 255.0
    gray = np.asarray(gray_image, dtype=np.float32) / 255.0

    features = []
    for channel in range(3):
        features.append(_hist(rgb[:, :, channel], bins=32))
        features.append(_hist(hsv[:, :, channel], bins=32))

    center = rgb[32:96, 32:96, :]
    for channel in range(3):
        features.append(_hist(center[:, :, channel], bins=24))

    features.append(_region_stats(rgb, hsv))
    if include_advanced:
        features.append(_channel_moments(rgb))
        features.append(_channel_moments(hsv))
        features.append(_skin_signal_stats(rgb, hsv))
    features.append(_lbp_hist(gray))
    features.append(_edge_stats(gray))

    vector = np.concatenate(features).astype(np.float32)
    norm = np.linalg.norm(vector)
    return vector / norm if norm else vector
