from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError

from src.predict import predict_image
from src.users import list_users, register_user


BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

UPLOADS_DIR.mkdir(exist_ok=True)


def is_allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def resolve_upload_suffix(filename: str, content_type: str | None) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in ALLOWED_EXTENSIONS:
        return suffix

    content_type_map = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/bmp": ".bmp",
        "image/heic": ".jpg",
    }

    return content_type_map.get((content_type or "").lower(), ".jpg")


@app.get("/api/health")
def health_check():
    return jsonify({"status": "ok"})


@app.post("/api/auth/register")
def register():
    payload = request.get_json(silent=True) or {}

    try:
        user = register_user(payload)
        return jsonify({"message": "User registered successfully.", "user": user}), 201
    except ValueError as error:
        return jsonify({"message": str(error)}), 400


@app.get("/api/users")
def get_users():
    return jsonify({"users": list_users()})


@app.post("/api/analysis/upload")
def analyze_upload():
    if "image" not in request.files:
        return jsonify({"message": "Image file is required."}), 400

    image_file = request.files["image"]

    if not image_file.filename:
        return jsonify({"message": "Image file is required."}), 400

    if not is_allowed_file(image_file.filename) and not (image_file.content_type or "").lower().startswith("image/"):
        return jsonify({"message": "Unsupported image format."}), 400

    suffix = resolve_upload_suffix(image_file.filename, image_file.content_type)
    temp_path = UPLOADS_DIR / f"{uuid4().hex}{suffix}"

    try:
        image_file.save(temp_path)

        with Image.open(temp_path) as uploaded_image:
            uploaded_image.verify()

        prediction = predict_image(temp_path)
        return jsonify(prediction)
    except UnidentifiedImageError:
        return jsonify({"message": "The uploaded file is not a valid image."}), 400
    except Exception as error:  # noqa: BLE001
        return jsonify({"message": f"Prediction failed: {error}"}), 500
    finally:
        if temp_path.exists():
            temp_path.unlink()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
