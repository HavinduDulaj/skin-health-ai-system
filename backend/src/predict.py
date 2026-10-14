import json
import sys
import zipfile
from base64 import b64encode
from io import BytesIO
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras.preprocessing import image


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "skin_model_mobilenet.keras"
METADATA_PATH = BASE_DIR / "models" / "skin_model_mobilenet_metadata.json"
RUNTIME_MODEL_DIR = BASE_DIR / "models" / "_runtime"
SANITIZED_MODEL_PATH = RUNTIME_MODEL_DIR / "skin_model_mobilenet_compatible.keras"
MODEL = None
METADATA = None
GRAD_COMPONENTS = None
GRAD_LAYER_NAME = None


def load_metadata() -> dict:
    with open(METADATA_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def load_model() -> tf.keras.Model:
    global MODEL  # noqa: PLW0603

    if MODEL is None:
        MODEL = tf.keras.models.load_model(get_compatible_model_path(), compile=False)

    return MODEL


def remove_unsupported_config_keys(value):
    if isinstance(value, dict):
        value.pop("quantization_config", None)
        for child in value.values():
            remove_unsupported_config_keys(child)
    elif isinstance(value, list):
        for child in value:
            remove_unsupported_config_keys(child)


def get_compatible_model_path() -> Path:
    if SANITIZED_MODEL_PATH.exists() and SANITIZED_MODEL_PATH.stat().st_mtime >= MODEL_PATH.stat().st_mtime:
        return SANITIZED_MODEL_PATH

    RUNTIME_MODEL_DIR.mkdir(exist_ok=True)

    with zipfile.ZipFile(MODEL_PATH, "r") as source_zip:
        config = json.loads(source_zip.read("config.json"))
        remove_unsupported_config_keys(config)

        with zipfile.ZipFile(SANITIZED_MODEL_PATH, "w", compression=zipfile.ZIP_DEFLATED) as target_zip:
            for item in source_zip.infolist():
                if item.filename == "config.json":
                    target_zip.writestr(item, json.dumps(config).encode("utf-8"))
                else:
                    target_zip.writestr(item, source_zip.read(item.filename))

    return SANITIZED_MODEL_PATH


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


def prediction_entropy(probabilities: np.ndarray) -> float:
    clipped = np.clip(probabilities.astype(np.float32), 1e-7, 1.0)
    entropy = -np.sum(clipped * np.log(clipped))
    max_entropy = np.log(len(clipped)) if len(clipped) > 1 else 1.0
    return float(entropy / max_entropy)


def confidence_band(confidence: float, uncertainty: float) -> str:
    if confidence >= 0.80 and uncertainty <= 0.35:
        return "High"
    if confidence >= 0.55 and uncertainty <= 0.65:
        return "Moderate"
    return "Low"


def review_required(confidence: float, uncertainty: float, probabilities: np.ndarray) -> bool:
    ranked = np.sort(probabilities)[::-1]
    margin = float(ranked[0] - ranked[1]) if len(ranked) > 1 else 1.0
    return confidence < 0.70 or uncertainty > 0.55 or margin < 0.20


def get_grad_components() -> tuple[tf.keras.layers.Layer | None, tf.keras.Model, list[tf.keras.layers.Layer], str]:
    global GRAD_COMPONENTS, GRAD_LAYER_NAME  # noqa: PLW0603

    if GRAD_COMPONENTS is not None and GRAD_LAYER_NAME is not None:
        return GRAD_COMPONENTS

    model = load_model()
    feature_index, feature_layer = next(
        (
            (index, layer)
            for index, layer in enumerate(model.layers)
            if hasattr(layer, "layers") and "mobilenet" in layer.name.lower()
        ),
        (None, None),
    )
    if feature_index is None or feature_layer is None:
        raise RuntimeError("Grad-CAM feature layer was not found in the model.")

    GRAD_LAYER_NAME = feature_layer.name
    preprocessing_layer = model.layers[feature_index - 1] if feature_index > 0 else None
    head_layers = list(model.layers[feature_index + 1 :])
    GRAD_COMPONENTS = (preprocessing_layer, feature_layer, head_layers, GRAD_LAYER_NAME)
    return GRAD_COMPONENTS


def heatmap_overlay_data_uri(img_path: Path, img_array: np.ndarray, class_index: int) -> dict:
    preprocessing_layer, feature_layer, head_layers, layer_name = get_grad_components()
    input_batch = tf.convert_to_tensor(np.expand_dims(img_array, axis=0), dtype=tf.float32)

    with tf.GradientTape() as tape:
        x = input_batch
        if preprocessing_layer is not None:
            x = preprocessing_layer(x, training=False)
        x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
        conv_outputs = feature_layer(x, training=False)
        predictions = conv_outputs
        for layer in head_layers:
            predictions = layer(predictions, training=False)
        class_channel = predictions[:, class_index]

    gradients = tape.gradient(class_channel, conv_outputs)
    if gradients is None:
        raise RuntimeError("Grad-CAM gradients could not be calculated.")

    pooled_gradients = tf.reduce_mean(gradients, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = tf.reduce_sum(conv_outputs * pooled_gradients, axis=-1)
    heatmap = tf.maximum(heatmap, 0)
    max_value = tf.reduce_max(heatmap)
    heatmap = heatmap / tf.maximum(max_value, tf.keras.backend.epsilon())
    heatmap_array = heatmap.numpy()

    with Image.open(img_path) as original:
        original = original.convert("RGB")
        original.thumbnail((640, 640))
        width, height = original.size

    heatmap_image = Image.fromarray(np.uint8(heatmap_array * 255), mode="L").resize(
        (width, height),
        Image.Resampling.BICUBIC,
    )
    heatmap_np = np.asarray(heatmap_image, dtype=np.float32) / 255.0
    overlay = np.zeros((height, width, 4), dtype=np.uint8)
    overlay[:, :, 0] = 255
    overlay[:, :, 1] = np.uint8(185 * heatmap_np)
    overlay[:, :, 3] = np.uint8(150 * heatmap_np)

    with Image.open(img_path) as original:
        base = original.convert("RGB")
        base.thumbnail((640, 640))
        base = base.convert("RGBA")

    heat_layer = Image.fromarray(overlay, mode="RGBA")
    composed = Image.alpha_composite(base, heat_layer).convert("RGB")
    buffer = BytesIO()
    composed.save(buffer, format="JPEG", quality=88)

    return {
        "image": f"data:image/jpeg;base64,{b64encode(buffer.getvalue()).decode('ascii')}",
        "targetLayer": layer_name,
        "method": "Grad-CAM",
    }


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
    uncertainty = prediction_entropy(averaged_prediction)

    ranked_indices = np.argsort(averaged_prediction)[::-1]
    top_predictions = [
        {
            "condition": class_names[index],
            "confidence": float(averaged_prediction[index]),
        }
        for index in ranked_indices[: min(3, len(class_names))]
    ]
    grad_cam = None
    try:
        grad_cam = heatmap_overlay_data_uri(img_path, img_array, predicted_index)
    except Exception as error:  # noqa: BLE001
        grad_cam = {"error": str(error), "method": "Grad-CAM"}

    return {
        "condition": class_names[predicted_index],
        "confidence": confidence,
        "confidenceBand": confidence_band(confidence, uncertainty),
        "uncertainty": uncertainty,
        "reviewRequired": review_required(confidence, uncertainty, averaged_prediction),
        "top_predictions": top_predictions,
        "modelInfo": {
            "name": "MobileNetV2 transfer-learning skin classifier",
            "imageSize": list(image_size),
            "ttaEnabled": tta_enabled,
            "bestValidationAccuracy": metadata.get("best_val_accuracy"),
            "bestValidationTop2Accuracy": metadata.get("best_val_top_2_accuracy"),
        },
        "gradCam": grad_cam,
    }


if __name__ == "__main__":
    sample_path = BASE_DIR / "dataset" / "test" / "acne" / "acne-cystic-39.jpg"
    image_path = Path(sys.argv[1]) if len(sys.argv) > 1 else sample_path
    result = predict_image(image_path)

    print("Image:", image_path)
    print("Prediction:", result["condition"])
    print("Confidence:", result["confidence"])
    print("Top predictions:", result["top_predictions"])
