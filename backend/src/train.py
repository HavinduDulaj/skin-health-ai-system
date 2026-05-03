import json
import os
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from PIL import Image, UnidentifiedImageError
from sklearn.metrics import classification_report, confusion_matrix
from tensorflow.keras import callbacks, layers, regularizers


SEED = 42
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
INITIAL_EPOCHS = 12
FINE_TUNE_EPOCHS = 18
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif"}
CONVERT_EXTENSIONS = {".webp", ".avif"}

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "dataset"
TRAIN_DIR = DATASET_DIR / "train"
VAL_DIR = DATASET_DIR / "val"
TEST_DIR = DATASET_DIR / "test"
MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = MODELS_DIR / "skin_model_mobilenet.keras"
METADATA_PATH = MODELS_DIR / "skin_model_mobilenet_metadata.json"
PLOT_PATH = MODELS_DIR / "training_history.png"
EVALUATION_PATH = MODELS_DIR / "evaluation_summary.json"
CSV_LOG_PATH = MODELS_DIR / "training_log.csv"


def set_seed() -> None:
    tf.keras.utils.set_random_seed(SEED)
    np.random.seed(SEED)


def ensure_rgb(image: Image.Image) -> Image.Image:
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def convert_extra_images(split_dir: Path) -> int:
    converted = 0
    for image_path in split_dir.rglob("*"):
        if not image_path.is_file():
            continue

        extension = image_path.suffix.lower()
        if extension not in CONVERT_EXTENSIONS:
            continue

        converted_path = image_path.with_suffix(".png")
        if converted_path.exists():
            continue

        try:
            with Image.open(image_path) as img:
                ensure_rgb(img).save(converted_path, format="PNG")
            converted += 1
        except UnidentifiedImageError:
            print(f"Skipping unreadable file during conversion: {image_path}")

    return converted


def remove_corrupt_images(split_dir: Path) -> list[str]:
    removed_files: list[str] = []

    for image_path in split_dir.rglob("*"):
        if not image_path.is_file():
            continue

        if image_path.suffix.lower() not in SUPPORTED_EXTENSIONS | CONVERT_EXTENSIONS:
            continue

        try:
            with Image.open(image_path) as img:
                img.verify()
        except (UnidentifiedImageError, OSError):
            removed_files.append(str(image_path))
            image_path.unlink(missing_ok=True)

    return removed_files


def count_supported_images(split_dir: Path) -> dict[str, int]:
    counts = {}
    for class_dir in sorted(path for path in split_dir.iterdir() if path.is_dir()):
        counts[class_dir.name] = sum(
            1
            for image_path in class_dir.iterdir()
            if image_path.is_file() and image_path.suffix.lower() in SUPPORTED_EXTENSIONS
        )
    return counts


def prepare_dataset(split_dir: Path, shuffle: bool, training: bool) -> tuple[tf.data.Dataset, list[str]]:
    dataset = tf.keras.utils.image_dataset_from_directory(
        split_dir,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=shuffle,
        seed=SEED,
    )

    class_names = dataset.class_names
    dataset = dataset.map(
        lambda images, labels: (tf.cast(images, tf.float32), labels),
        num_parallel_calls=tf.data.AUTOTUNE,
    )

    if not training:
        dataset = dataset.cache()

    dataset = dataset.prefetch(tf.data.AUTOTUNE)
    return dataset, class_names


def build_model(num_classes: int) -> tuple[tf.keras.Model, tf.keras.Model]:
    augmentation = tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.12),
            layers.RandomZoom(0.15),
            layers.RandomTranslation(0.08, 0.08),
            layers.RandomContrast(0.15),
            layers.RandomBrightness(0.08),
        ],
        name="augmentation",
    )

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=IMG_SIZE + (3,),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=IMG_SIZE + (3,))
    x = augmentation(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dense(
        256,
        activation="relu",
        kernel_regularizer=regularizers.l2(1e-4),
    )(x)
    x = layers.Dropout(0.45)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    return model, base_model


def compile_model(model: tf.keras.Model, learning_rate: float) -> None:
    model.compile(
        optimizer=tf.keras.optimizers.AdamW(learning_rate=learning_rate, weight_decay=1e-4),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(label_smoothing=0.05),
        metrics=[
            "accuracy",
            tf.keras.metrics.SparseTopKCategoricalAccuracy(k=2, name="top_2_accuracy"),
        ],
    )


def plot_history(history: dict[str, list[float]], output_path: Path) -> None:
    epochs = range(1, len(history["accuracy"]) + 1)

    plt.figure(figsize=(12, 4))

    plt.subplot(1, 3, 1)
    plt.plot(epochs, history["accuracy"], label="Train")
    plt.plot(epochs, history["val_accuracy"], label="Validation")
    plt.title("Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()

    plt.subplot(1, 3, 2)
    plt.plot(epochs, history["loss"], label="Train")
    plt.plot(epochs, history["val_loss"], label="Validation")
    plt.title("Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()

    plt.subplot(1, 3, 3)
    plt.plot(epochs, history["top_2_accuracy"], label="Train")
    plt.plot(epochs, history["val_top_2_accuracy"], label="Validation")
    plt.title("Top-2 Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()

    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def evaluate_model(
    model: tf.keras.Model,
    dataset: tf.data.Dataset,
    class_names: list[str],
    split_name: str,
) -> dict:
    true_labels = np.concatenate([labels.numpy() for _, labels in dataset], axis=0)
    probabilities = model.predict(dataset, verbose=0)
    predicted_labels = np.argmax(probabilities, axis=1)

    split_metrics = model.evaluate(dataset, verbose=0, return_dict=True)
    split_confusion = confusion_matrix(true_labels, predicted_labels).tolist()
    split_report = classification_report(
        true_labels,
        predicted_labels,
        target_names=class_names,
        digits=4,
        zero_division=0,
        output_dict=True,
    )

    print(f"\n{split_name} metrics:")
    print(split_metrics)
    print(f"\n{split_name} confusion matrix:")
    print(np.array(split_confusion))
    print(f"\n{split_name} classification report:")
    print(
        classification_report(
            true_labels,
            predicted_labels,
            target_names=class_names,
            digits=4,
            zero_division=0,
        )
    )

    return {
        "metrics": {key: float(value) for key, value in split_metrics.items()},
        "confusion_matrix": split_confusion,
        "classification_report": split_report,
    }


def compute_class_weights(train_counts: dict[str, int], class_names: list[str]) -> dict[int, float] | None:
    counts = np.array([train_counts[name] for name in class_names], dtype=np.float32)
    imbalance_ratio = float(np.max(counts) / np.min(counts))

    if imbalance_ratio < 1.15:
        return None

    total = float(np.sum(counts))
    num_classes = float(len(class_names))
    weights = {
        index: total / (num_classes * count)
        for index, count in enumerate(counts)
    }
    return weights


def combine_histories(*histories: tf.keras.callbacks.History) -> dict[str, list[float]]:
    combined: dict[str, list[float]] = {}

    for history in histories:
        for key, values in history.history.items():
            combined.setdefault(key, []).extend(values)

    return combined


def save_metadata(class_names: list[str], train_counts: dict[str, int], history: dict[str, list[float]]) -> None:
    metadata = {
        "class_names": class_names,
        "image_size": list(IMG_SIZE),
        "batch_size": BATCH_SIZE,
        "seed": SEED,
        "train_counts": train_counts,
        "initial_epochs": INITIAL_EPOCHS,
        "fine_tune_epochs": FINE_TUNE_EPOCHS,
        "best_val_accuracy": max(history["val_accuracy"]),
        "best_val_top_2_accuracy": max(history["val_top_2_accuracy"]),
        "tta_enabled": True,
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def main() -> None:
    set_seed()
    MODELS_DIR.mkdir(exist_ok=True)

    total_converted = 0
    total_removed: list[str] = []
    for split_dir in (TRAIN_DIR, VAL_DIR, TEST_DIR):
        converted = convert_extra_images(split_dir)
        total_converted += converted
        removed = remove_corrupt_images(split_dir)
        total_removed.extend(removed)
        if converted:
            print(f"Converted {converted} files in {split_dir.name}.")

    if total_converted == 0:
        print("No format conversions were needed.")

    if total_removed:
        print(f"Removed {len(total_removed)} corrupt files.")

    train_counts = count_supported_images(TRAIN_DIR)
    val_counts = count_supported_images(VAL_DIR)
    test_counts = count_supported_images(TEST_DIR)

    print("Supported image counts after cleanup:")
    print("Train:", train_counts)
    print("Val:", val_counts)
    print("Test:", test_counts)

    train_ds, class_names = prepare_dataset(TRAIN_DIR, shuffle=True, training=True)
    val_ds, _ = prepare_dataset(VAL_DIR, shuffle=False, training=False)
    test_ds, _ = prepare_dataset(TEST_DIR, shuffle=False, training=False)

    print("Classes:", class_names)

    model, base_model = build_model(num_classes=len(class_names))
    compile_model(model, learning_rate=3e-4)

    class_weights = compute_class_weights(train_counts, class_names)
    if class_weights:
        print("Using class weights:", class_weights)
    else:
        print("Dataset is balanced enough; training without class weights.")

    training_callbacks = [
        callbacks.ModelCheckpoint(
            MODEL_PATH,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_loss",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.4,
            patience=2,
            min_lr=1e-6,
            verbose=1,
        ),
        callbacks.CSVLogger(CSV_LOG_PATH, append=False),
    ]

    history_initial = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=INITIAL_EPOCHS,
        callbacks=training_callbacks,
        class_weight=class_weights,
        verbose=1,
    )

    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False

    compile_model(model, learning_rate=5e-5)

    history_fine = model.fit(
        train_ds,
        validation_data=val_ds,
        initial_epoch=len(history_initial.history["accuracy"]),
        epochs=INITIAL_EPOCHS + FINE_TUNE_EPOCHS,
        callbacks=training_callbacks,
        class_weight=class_weights,
        verbose=1,
    )

    history = combine_histories(history_initial, history_fine)

    model = tf.keras.models.load_model(MODEL_PATH)
    save_metadata(class_names, train_counts, history)
    plot_history(history, PLOT_PATH)

    evaluation_summary = {
        "validation": evaluate_model(model, val_ds, class_names, "Validation"),
        "test": evaluate_model(model, test_ds, class_names, "Test"),
    }
    EVALUATION_PATH.write_text(json.dumps(evaluation_summary, indent=2), encoding="utf-8")

    print(f"Best model saved to {MODEL_PATH}")
    print(f"Metadata saved to {METADATA_PATH}")
    print(f"Training plot saved to {PLOT_PATH}")
    print(f"Evaluation summary saved to {EVALUATION_PATH}")


if __name__ == "__main__":
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    main()
