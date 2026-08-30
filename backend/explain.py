"""Grad-CAM for the V5 EfficientNetV2-B0 risk head.

Proposal §4.1 component 6: highlight the photograph regions that raised the
leading risk grade. This is an explanation of the risk head, not lesion
segmentation and not a diagnosis.
"""

from __future__ import annotations

import base64
from io import BytesIO

import numpy as np
from PIL import Image

from backend.config import LESIONS, V5_IMAGE_SIZE


def _jpeg_data_url(image: Image.Image, quality: int = 74) -> str:
    buf = BytesIO()
    image.convert("RGB").save(buf, format="JPEG", quality=quality, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _copy_conv_weights(src_backbone, dest_backbone) -> int:
    copied = 0
    weights = {layer.name: layer.get_weights() for layer in src_backbone.layers}
    for layer in dest_backbone.layers:
        payload = weights.get(layer.name)
        if not payload:
            continue
        try:
            layer.set_weights(payload)
            copied += 1
        except ValueError:
            continue
    return copied


_CAM_CACHE: dict[int, tuple] = {}


def _cam_bundle(full_model):
    """Build a Grad-CAM graph that shares the trained V5 head.

    EfficientNetV2-B0 is constructed with global-average pooling, so the 4-D
    feature maps are not an output of the serving model. A pooling-free copy
    of the backbone is wired to the same classification head.
    """
    key = id(full_model)
    cached = _CAM_CACHE.get(key)
    if cached is not None:
        return cached

    import keras
    from keras import layers

    src = full_model.get_layer("efficientnetv2-b0")

    image = keras.Input(shape=(V5_IMAGE_SIZE, V5_IMAGE_SIZE, 3), name="image")
    lesion = keras.Input(shape=(len(LESIONS),), name="lesion")
    conv_base = keras.applications.EfficientNetV2B0(
        include_top=False,
        pooling=None,
        weights=None,
        input_shape=(V5_IMAGE_SIZE, V5_IMAGE_SIZE, 3),
    )
    copied = _copy_conv_weights(src, conv_base)
    conv_base.trainable = False
    conv_maps = conv_base(image, training=False)
    pooled = layers.GlobalAveragePooling2D(name="cam_gap")(conv_maps)

    image_feat = full_model.get_layer("dropout")(pooled, training=False)
    lesion_feat = full_model.get_layer("dropout_1")(
        full_model.get_layer("dense")(lesion), training=False
    )
    merged = full_model.get_layer("concatenate")([image_feat, lesion_feat])
    hidden = full_model.get_layer("dense_1")(merged)
    hidden = full_model.get_layer("batch_normalization")(hidden, training=False)
    hidden = full_model.get_layer("dropout_2")(hidden, training=False)
    risk = full_model.get_layer("risk")(hidden)
    cam_model = keras.Model({"image": image, "lesion": lesion}, [conv_maps, risk], name="v5_gradcam")
    bundle = (cam_model, copied)
    _CAM_CACHE[key] = bundle
    return bundle


def _heatmap_overlay(photo: Image.Image, cam: np.ndarray) -> Image.Image:
    cam = np.clip(cam.astype(np.float32), 0.0, 1.0)
    heat = Image.fromarray(np.uint8(cam * 255), mode="L").resize(photo.size, Image.Resampling.BILINEAR)
    heat_arr = np.asarray(heat, dtype=np.float32) / 255.0
    rgb = np.asarray(photo.convert("RGB"), dtype=np.float32)
    # Simple jet: blue → cyan → yellow → red
    r = np.clip(1.5 - np.abs(4 * heat_arr - 3), 0, 1)
    g = np.clip(1.5 - np.abs(4 * heat_arr - 2), 0, 1)
    b = np.clip(1.5 - np.abs(4 * heat_arr - 1), 0, 1)
    jet = np.stack([r, g, b], axis=-1)
    mask = heat_arr[..., None]
    blend = rgb * (1.0 - 0.52 * mask) + jet * 255.0 * (0.52 * mask)
    return Image.fromarray(np.uint8(np.clip(blend, 0, 255)))


def _cam_tensorflow(cam_model, images: np.ndarray, lesions: np.ndarray, class_index: int):
    import tensorflow as tf

    image_t = tf.convert_to_tensor(images)
    lesion_t = tf.convert_to_tensor(lesions)
    with tf.GradientTape() as tape:
        convs, preds = cam_model({"image": image_t, "lesion": lesion_t}, training=False)
        score = preds[:, int(class_index)]
    grads = tape.gradient(score, convs)
    if grads is None:
        return None
    weights = tf.reduce_mean(grads, axis=(1, 2))
    cam = tf.reduce_sum(convs * weights[:, None, None, :], axis=-1)
    return tf.nn.relu(cam)[0].numpy()


def _cam_torch(cam_model, images: np.ndarray, lesions: np.ndarray, class_index: int):
    import torch

    # The backbone is frozen, so the gradient graph only exists if the input
    # itself is differentiable.
    image_t = torch.as_tensor(images).requires_grad_(True)
    lesion_t = torch.as_tensor(lesions)
    convs, preds = cam_model({"image": image_t, "lesion": lesion_t}, training=False)
    score = preds[:, int(class_index)].sum()
    grads = torch.autograd.grad(score, convs, allow_unused=True)[0]
    if grads is None:
        return None
    weights = grads.mean(dim=(1, 2))
    cam = (convs * weights[:, None, None, :]).sum(dim=-1)
    return torch.relu(cam)[0].detach().cpu().numpy()


def gradcam_overlay(
    handle,
    image: Image.Image,
    lesion_key: str | None,
    class_index: int,
    class_name: str,
) -> dict | None:
    """Return overlay + heatmap data URLs, or None if Grad-CAM cannot run."""
    if handle is None or handle.kind != "keras_v5" or handle.keras_model is None:
        return None

    import keras

    backend = keras.backend.backend()
    gradient_fn = {"tensorflow": _cam_tensorflow, "torch": _cam_torch}.get(backend)
    if gradient_fn is None:
        return {
            "method": "Grad-CAM",
            "available": False,
            "note": f"The {backend} Keras backend has no Grad-CAM path here.",
        }

    try:
        cam_model, copied = _cam_bundle(handle.keras_model)
        size = handle.image_size or V5_IMAGE_SIZE
        resized = image.resize((size, size), Image.Resampling.LANCZOS)
        images = np.asarray(resized, dtype=np.float32)[None, ...]
        lesions = np.zeros((1, len(LESIONS)), dtype=np.float32)
        if lesion_key and lesion_key in LESIONS:
            lesions[0, LESIONS.index(lesion_key)] = 1.0
        else:
            lesions[:] = 1.0 / len(LESIONS)

        cam = gradient_fn(cam_model, images, lesions, class_index)
        if cam is None:
            return None
        peak = float(cam.max()) if cam.size else 0.0
        if peak > 0:
            cam = cam / peak
        else:
            cam = np.zeros_like(cam, dtype=np.float32)

        overlay = _heatmap_overlay(resized, cam)
        heat_img = Image.fromarray(np.uint8(np.clip(cam * 255.0, 0, 255))).convert("L").resize(
            resized.size, Image.Resampling.BILINEAR
        )
        return {
            "method": "Grad-CAM",
            "available": True,
            "layer": "top_activation",
            "class_index": int(class_index),
            "class_name": class_name,
            "lesion_context": lesion_key,
            "backbone_layers_copied": copied,
            "backend": backend,
            "overlay_jpeg": _jpeg_data_url(overlay),
            "heatmap_jpeg": _jpeg_data_url(heat_img.convert("RGB")),
            "note": (
                f"Warmer regions raised the {class_name} grade in the risk head. "
                "This is not a lesion outline and not a diagnosis."
            ),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "method": "Grad-CAM",
            "available": False,
            "note": f"Explainability skipped ({type(exc).__name__}).",
        }
