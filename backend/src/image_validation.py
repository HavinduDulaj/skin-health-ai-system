"""Input validation for the Member 1 skin-condition classifier."""

from pathlib import Path

import cv2
import numpy as np


MIN_WIDTH = 96
MIN_HEIGHT = 96
MIN_SKIN_COVERAGE = 0.20
MIN_BRIGHTNESS = 28.0
MAX_BRIGHTNESS = 238.0
MIN_SHARPNESS = 12.0


def validate_skin_image(image_path: Path) -> dict:
    """Check that an upload resembles a usable close-up skin photograph.

    The disease classifier is closed-set and must never be asked to force a
    phone, animal, document, or scenery image into one of its disease labels.
    This gate measures skin-colour agreement in two colour spaces together
    with basic capture quality before inference is allowed.
    """

    image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if image is None:
        return _reject("The uploaded file could not be decoded as an image.")

    height, width = image.shape[:2]
    if width < MIN_WIDTH or height < MIN_HEIGHT:
        return _reject(
            "The image is too small. Please upload a close, clear skin photo of at least 96 x 96 pixels."
        )

    sample = cv2.resize(image, (224, 224), interpolation=cv2.INTER_AREA)
    blue, green, red = cv2.split(sample)
    _, cr, cb = cv2.split(cv2.cvtColor(sample, cv2.COLOR_BGR2YCrCb))
    hue, saturation, value = cv2.split(cv2.cvtColor(sample, cv2.COLOR_BGR2HSV))

    channel_range = np.maximum(np.maximum(red, green), blue) - np.minimum(
        np.minimum(red, green), blue
    )
    rgb_skin = (
        (red > 35)
        & (green > 20)
        & (blue > 12)
        & (channel_range > 8)
        & (red > green)
        & (red > blue)
    )
    chroma_skin = (cr >= 125) & (cr <= 185) & (cb >= 70) & (cb <= 145)
    hsv_skin = (
        ((hue <= 28) | (hue >= 170))
        & (saturation >= 15)
        & (saturation <= 220)
        & (value >= 35)
    )
    skin_mask = chroma_skin & (rgb_skin | hsv_skin)
    skin_coverage = float(np.mean(skin_mask))

    gray = cv2.cvtColor(sample, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    metrics = {
        "width": int(width),
        "height": int(height),
        "skinCoverage": round(skin_coverage, 4),
        "brightness": round(brightness, 2),
        "sharpness": round(sharpness, 2),
    }

    if skin_coverage < MIN_SKIN_COVERAGE:
        return _reject(
            "This does not appear to be a close-up skin image. Please upload only the affected skin area - not a phone, animal, document, or other object.",
            metrics,
        )
    if brightness < MIN_BRIGHTNESS:
        return _reject("The skin image is too dark. Retake it in brighter, even lighting.", metrics)
    if brightness > MAX_BRIGHTNESS:
        return _reject("The skin image is overexposed. Retake it without flash glare.", metrics)
    if sharpness < MIN_SHARPNESS:
        return _reject("The skin image is too blurry. Hold the camera steady and focus on the affected area.", metrics)

    return {"accepted": True, "message": "Skin image accepted.", "metrics": metrics}


def _reject(message: str, metrics: dict | None = None) -> dict:
    return {"accepted": False, "message": message, "metrics": metrics or {}}
