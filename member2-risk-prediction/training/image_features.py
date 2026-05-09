from __future__ import annotations

from math import sqrt
from pathlib import Path

from PIL import Image


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}


def normalize_label(label: str) -> str:
    cleaned = label.lower().strip()
    if cleaned == "rash":
        return "rashes"
    return cleaned


def display_condition(label: str) -> str:
    return {
        "acne": "Acne",
        "burns": "Burns",
        "rashes": "Rashes",
        "warts": "Warts",
    }.get(normalize_label(label), label.title())


def iter_images(split_dir: Path):
    for class_dir in sorted(path for path in split_dir.iterdir() if path.is_dir()):
        label = normalize_label(class_dir.name)
        for image_path in sorted(class_dir.iterdir()):
            if image_path.is_file() and image_path.suffix.lower() in IMAGE_EXTENSIONS:
                yield label, image_path


def _normalized(values: list[float]) -> list[float]:
    norm = sqrt(sum(value * value for value in values))
    if norm == 0:
        return values
    return [value / norm for value in values]


def _channel_histogram(pixels, channels: int, bins: int) -> list[float]:
    histograms = [[0.0] * bins for _ in range(channels)]
    total = max(1, len(pixels))

    for pixel in pixels:
        for channel in range(channels):
            value = pixel[channel] / 255.0
            bucket = min(bins - 1, int(value * bins))
            histograms[channel][bucket] += 1.0

    return [value / total for histogram in histograms for value in histogram]


def extract_features(image: Image.Image) -> list[float]:
    rgb_image = image.convert("RGB").resize((128, 128))
    hsv_image = rgb_image.convert("HSV")
    gray_image = rgb_image.convert("L").resize((24, 24))
    center_crop = rgb_image.crop((32, 32, 96, 96))

    pixels = list(rgb_image.getdata())
    hsv_pixels = list(hsv_image.getdata())
    center_pixels = list(center_crop.getdata())
    gray_pixels = [value / 255.0 for value in gray_image.getdata()]

    total = max(1, len(pixels))
    sums = [0.0, 0.0, 0.0]
    squared_sums = [0.0, 0.0, 0.0]

    for pixel in pixels:
        for channel, value in enumerate(pixel):
            normalized = value / 255.0
            sums[channel] += normalized
            squared_sums[channel] += normalized * normalized

    means = [value / total for value in sums]
    deviations = [
        sqrt(max(0.0, (squared_sums[index] / total) - (means[index] * means[index])))
        for index in range(3)
    ]

    edge_values = []
    size = 24
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            center = gray_pixels[y * size + x]
            right = gray_pixels[y * size + x + 1]
            bottom = gray_pixels[(y + 1) * size + x]
            edge_values.append(abs(center - right) + abs(center - bottom))

    edge_mean = sum(edge_values) / max(1, len(edge_values))
    edge_deviation = sqrt(
        sum((value - edge_mean) * (value - edge_mean) for value in edge_values)
        / max(1, len(edge_values))
    )

    feature = []
    feature.extend(_channel_histogram(pixels, channels=3, bins=24))
    feature.extend(_channel_histogram(hsv_pixels, channels=3, bins=18))
    feature.extend(_channel_histogram(center_pixels, channels=3, bins=16))
    feature.extend(means)
    feature.extend(deviations)
    feature.extend([edge_mean, edge_deviation])

    return _normalized(feature)


def cosine_similarity(first: list[float], second: list[float]) -> float:
    return sum(left * right for left, right in zip(first, second))
