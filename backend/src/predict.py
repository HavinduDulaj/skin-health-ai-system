import json
import sys
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras.preprocessing import image


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "skin_model_mobilenet.keras"
METADATA_PATH = BASE_DIR / "models" / "skin_model_mobilenet_metadata.json"
MODEL = None
METADATA = None


def load_metadata() -> dict:
    with open(METADATA_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def load_model() -> tf.keras.Model:
    global MODEL  # noqa: PLW0603

    if MODEL is None:
        MODEL = tf.keras.models.load_model(MODEL_PATH)

    return MODEL


def get_metadata() -> dict:
    global METADATA  # noqa: PLW0603

    if METADATA is None:
        METADATA = load_metadata()

    return METADATA


def load_rgb_image(img_path: Path, image_size: tuple[int, int]) -> np.ndarray:
    with Image.open(img_path) as pil_image:
        pil_image = pil_image.convert("RGB").resize(image_size)
        return image.img_to_array(pil_image)


def build_tta_batch(img_array: np.ndarray, tta_enabled: bool) -> np.ndarray:
    variants = [img_array]

    if tta_enabled:
        variants.append(np.fliplr(img_array))

        brighter = np.clip(img_array * 1.05, 0, 255)
        darker = np.clip(img_array * 0.95, 0, 255)
        variants.extend([brighter, darker])

    return np.stack(variants, axis=0)


def predict_image(img_path: Path) -> dict:
    metadata = get_metadata()
    class_names = metadata["class_names"]
    image_size = tuple(metadata["image_size"])
    tta_enabled = bool(metadata.get("tta_enabled", True))
    model = load_model()

    img_array = load_rgb_image(img_path, image_size)
    batch = build_tta_batch(img_array, tta_enabled=tta_enabled)

    predictions = model.predict(batch, verbose=0)
    averaged_prediction = np.mean(predictions, axis=0)
    predicted_index = int(np.argmax(averaged_prediction))
    confidence = float(averaged_prediction[predicted_index])

    ranked_indices = np.argsort(averaged_prediction)[::-1]
    top_predictions = [
        {
            "condition": class_names[index],
            "confidence": float(averaged_prediction[index]),
        }
        for index in ranked_indices[: min(3, len(class_names))]
    ]

    return {
        "condition": class_names[predicted_index],
        "confidence": confidence,
        "top_predictions": top_predictions,
    }


if __name__ == "__main__":
    sample_path = BASE_DIR / "dataset" / "test" / "acne" / "acne-cystic-39.jpg"
    image_path = Path(sys.argv[1]) if len(sys.argv) > 1 else sample_path
    result = predict_image(image_path)

    print("Image:", image_path)
    print("Prediction:", result["condition"])
    print("Confidence:", result["confidence"])
    print("Top predictions:", result["top_predictions"])
