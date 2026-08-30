"""Derma-Safe AI FastAPI application."""

from __future__ import annotations

from contextlib import asynccontextmanager
from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps

from backend import __version__
from backend.config import CORS_ORIGINS, FRONTEND_DIR, MAX_UPLOAD_BYTES
from backend.engine import assess_image, get_model, model_kind
from backend.research import ARCHITECTURE
from backend.lab import lab_payload
from backend.samples import SAMPLE_INDEX, public_samples, sample_path
from backend.schemas import AnalyzeResponse, HealthResponse, SampleList


@asynccontextmanager
async def lifespan(_app: FastAPI):
    get_model()
    yield


app = FastAPI(
    title="Derma-Safe AI",
    description=(
        "R26-IT-058 · Skin risk-level identification and prediction. "
        "Leakage-aware screening with quality reject, abstain, and Grad-CAM. "
        "Not a diagnosis."
    ),
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health", response_model=HealthResponse)
def health() -> dict:
    kind = model_kind()
    return {
        "ok": True,
        "name": "Derma-Safe AI",
        "version": __version__,
        "model_loaded": kind is not None,
        "model_kind": kind,
        "samples": len(SAMPLE_INDEX),
        "docs": "/docs",
    }


@app.get("/api/v1/lab")
def lab() -> dict:
    return lab_payload()


@app.get("/api/v1/research")
def research() -> dict:
    payload = lab_payload()
    return {
        "contributions": payload["contributions"],
        "method": payload["method"],
        "architecture": payload.get("architecture") or ARCHITECTURE,
        "project": payload.get("project"),
        "policy": payload["policy"],
        "model_card": payload["model_card"],
        "integrity": payload["integrity"],
        "dataset": payload["dataset"],
    }


@app.get("/api/v1/samples", response_model=SampleList)
def samples() -> dict:
    return {"items": public_samples()}


@app.get("/api/v1/samples/{sample_id}")
def sample_image(sample_id: str):
    path = sample_path(sample_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Unknown sample")
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing")
    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    image.thumbnail((720, 720))
    buf = BytesIO()
    image.save(buf, format="JPEG", quality=84, optimize=True)
    return Response(content=buf.getvalue(), media_type="image/jpeg")


@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(
    image: UploadFile = File(...),
    lesion: str = Form(""),
    explain: str = Form("1"),
) -> dict:
    name = (image.filename or "").lower()
    typed = (image.content_type or "").lower()
    looks_image = typed.startswith("image/") or name.endswith(
        (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff")
    )
    if typed and not looks_image and typed not in {"application/octet-stream", ""}:
        raise HTTPException(status_code=400, detail="Please upload a photograph.")
    data = await image.read()
    if len(data) < 128:
        raise HTTPException(status_code=400, detail="File is too small to be a photograph.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Keep photographs under 12 MB.")
    try:
        return assess_image(data, lesion=lesion, explain=explain.strip() not in {"0", "false", "no"})
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400,
            detail=f"Could not read that image ({type(exc).__name__}).",
        ) from exc


# Legacy aliases so an older hash-routed UI still works during the split.
@app.get("/api/health")
def health_legacy() -> dict:
    return health()


@app.get("/api/lab")
def lab_legacy() -> dict:
    return lab()


@app.get("/api/samples")
def samples_legacy() -> dict:
    return samples()


@app.get("/api/samples/{sample_id}")
def sample_image_legacy(sample_id: str):
    return sample_image(sample_id)


@app.post("/api/analyze")
async def analyze_legacy(
    image: UploadFile = File(...),
    lesion: str = Form(""),
) -> dict:
    return await analyze(image=image, lesion=lesion)


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
