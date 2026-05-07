from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from risk_logic import predict_risk

app = FastAPI(title="Skin Risk Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Symptoms(BaseModel):
    pain: str
    itching: str
    redness: str
    swelling: str
    duration: str


class Profile(BaseModel):
    infection: str
    previousIssue: str
    sensitivity: str
    sunExposure: str


class RiskRequest(BaseModel):
    condition: str
    confidence: int
    symptoms: Symptoms
    profile: Profile


@app.get("/")
def home():
    return {"message": "Skin Risk Prediction API is running"}


@app.post("/predict-risk")
def predict(request: RiskRequest):
    data = request.dict()
    result = predict_risk(data)

    return {
        "condition": request.condition,
        "detectionConfidence": request.confidence,
        **result,
    }