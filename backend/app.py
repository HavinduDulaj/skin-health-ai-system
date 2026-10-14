from pathlib import Path
import importlib.util
import json
import sys
import tempfile
from uuid import uuid4

from flask import Flask, jsonify, request
from flask_cors import CORS

sys.path.insert(0, str(Path(__file__).resolve().parent))
from src.users import list_users, login_user, register_user


BASE_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BASE_DIR.parents[2]
RISK_ANALYSIS_ROOT = (
    WORKSPACE_DIR
    / "second part"
    / "skin-health-ai-system"
    / "risk-level-analysis"
)
UPLOADS_DIR = BASE_DIR / "uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

UPLOADS_DIR.mkdir(exist_ok=True)


def load_risk_predictor():
    if not RISK_ANALYSIS_ROOT.exists():
        return None

    risk_root = str(RISK_ANALYSIS_ROOT)
    if risk_root not in sys.path:
        sys.path.insert(0, risk_root)

    from backend.engine import assess_image

    def predict_updated_risk(image_bytes: bytes, clinical_metadata=None, lesion_prediction=None):
        lesion = str((lesion_prediction or {}).get("condition") or "").strip().lower()
        assessment = assess_image(image_bytes, lesion=lesion, explain=True)
        probabilities = assessment.get("probabilities") or {}
        decision = assessment.get("decision")
        risk_level = assessment.get("risk") if decision == "grade" else None
        probability = probabilities.get(risk_level) if risk_level else None
        guidance = assessment.get("guidance") or {}
        indicators = assessment.get("indicators") or {}
        quality = assessment.get("quality") or {}
        risk_score = None
        if all(isinstance(probabilities.get(level), (int, float)) for level in ("Low", "Medium", "High")):
            risk_score = round(
                probabilities["Low"] * 25
                + probabilities["Medium"] * 60
                + probabilities["High"] * 90
            )

        action = guidance.get("summary") or guidance.get("headline")
        if not action:
            action = {
                "abstain": "The model is uncertain and did not force a risk grade. Use a clearer image or seek professional review.",
                "quality_reject": "The image did not pass the quality gate. Retake it in good lighting and focus.",
                "unavailable": "The updated Member 2 screening model is not installed on this device.",
            }.get(decision)

        factors = list(indicators.get("notes") or [])
        factors.extend(f"Image quality: {flag}" for flag in quality.get("flags") or [])
        return {
            "riskLevel": risk_level,
            "riskScore": risk_score,
            "riskConfidence": round(float(probability) * 100) if isinstance(probability, (int, float)) else None,
            "suggestedAction": action,
            "riskScores": [
                {"riskLevel": level, "score": round(float(score) * 100, 2)}
                for level, score in probabilities.items()
                if isinstance(score, (int, float))
            ],
            "riskFactors": factors,
            "riskDecision": decision,
            "riskQuality": quality,
            "riskExplainability": assessment.get("explainability"),
            "modelInfo": assessment.get("model") or {},
        }

    return predict_updated_risk


predict_image_risk = None


def get_lesion_predictor():
    from src.predict import predict_image

    return predict_image


def get_risk_predictor():
    global predict_image_risk  # noqa: PLW0603

    if predict_image_risk is None:
        predict_image_risk = load_risk_predictor()

    return predict_image_risk


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


def parse_clinical_metadata() -> dict:
    raw_metadata = request.form.get("clinicalMetadata")
    if not raw_metadata:
        return {}

    try:
        metadata = json.loads(raw_metadata)
    except json.JSONDecodeError:
        return {}

    return metadata if isinstance(metadata, dict) else {}


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


@app.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}

    try:
        user = login_user(payload)
        return jsonify({"message": "Signed in successfully.", "user": user})
    except ValueError as error:
        return jsonify({"message": str(error)}), 401


@app.get("/api/users")
def get_users():
    return jsonify({"users": list_users()})


def apply_healthy_skin_guidance(prediction: dict) -> None:
    if str(prediction.get("condition", "")).strip().lower() != "healthy":
        return

    prediction.update(
        {
            "riskLevel": "Low",
            "riskScore": 5,
            "riskConfidence": 95,
            "suggestedAction": (
                "No visible skin condition was detected in this image. Keep normal skincare habits and "
                "monitor again if symptoms such as pain, itching, bleeding, spreading, or fever appear."
            ),
            "riskScores": [
                {"riskLevel": "Low", "score": 95.0},
                {"riskLevel": "Medium", "score": 4.0},
                {"riskLevel": "High", "score": 1.0},
            ],
            "riskFactors": [],
        }
    )


@app.post("/api/analysis/upload")
def analyze_upload():
    # Keep native image dependencies out of the authentication-only startup path.
    # This also makes registration/login usable when the ML runtime is unavailable.
    from PIL import Image, UnidentifiedImageError

    if "image" not in request.files:
        return jsonify({"message": "Image file is required."}), 400

    image_file = request.files["image"]

    if not image_file.filename:
        return jsonify({"message": "Image file is required."}), 400

    if not is_allowed_file(image_file.filename) and not (image_file.content_type or "").lower().startswith("image/"):
        return jsonify({"message": "Unsupported image format."}), 400

    suffix = resolve_upload_suffix(image_file.filename, image_file.content_type)
    # The running desktop service may not have write access to the repository
    # folder (for example when Codex launches it in a restricted process). Use
    # the operating-system temp directory for transient inference input.
    temp_path = Path(tempfile.gettempdir()) / f"dermasafe-{uuid4().hex}{suffix}"

    try:
        image_file.save(temp_path)

        with Image.open(temp_path) as uploaded_image:
            uploaded_image.verify()

        from src.image_validation import validate_skin_image

        image_validation = validate_skin_image(temp_path)
        if not image_validation["accepted"]:
            return jsonify(
                {
                    "message": image_validation["message"],
                    "code": "INVALID_SKIN_IMAGE",
                    "imageValidation": image_validation,
                }
            ), 422

        clinical_metadata = parse_clinical_metadata()
        prediction = get_lesion_predictor()(temp_path)
        prediction["imageValidation"] = image_validation
        risk_predictor = get_risk_predictor()
        if risk_predictor is not None:
            try:
                risk_prediction = risk_predictor(
                    temp_path.read_bytes(),
                    clinical_metadata=clinical_metadata,
                    lesion_prediction=prediction,
                )
                prediction.update(
                    {
                        "riskLevel": risk_prediction.get("riskLevel"),
                        "riskScore": risk_prediction.get("riskScore"),
                        "riskConfidence": risk_prediction.get("riskConfidence"),
                        "suggestedAction": risk_prediction.get("suggestedAction"),
                        "riskScores": risk_prediction.get("riskScores", []),
                        "riskFactors": risk_prediction.get("riskFactors", []),
                        "riskDecision": risk_prediction.get("riskDecision"),
                        "riskQuality": risk_prediction.get("riskQuality", {}),
                        "riskExplainability": risk_prediction.get("riskExplainability"),
                        "riskModelInfo": risk_prediction.get("modelInfo", {}),
                    }
                )
            except Exception as error:  # noqa: BLE001
                prediction["riskWarning"] = f"Risk prediction unavailable: {error}"
        apply_healthy_skin_guidance(prediction)
        return jsonify(prediction)
    except UnidentifiedImageError:
        return jsonify({"message": "The uploaded file is not a valid image."}), 400
    except Exception as error:  # noqa: BLE001
        return jsonify({"message": f"Prediction failed: {error}"}), 500
    finally:
        if temp_path.exists():
            temp_path.unlink()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
