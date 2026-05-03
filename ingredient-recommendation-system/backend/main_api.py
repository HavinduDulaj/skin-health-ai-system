from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rebeka_chatbot import chat_with_rebeka
from recommendation_engine import RecommendationError, generate_recommendations


app = FastAPI(title="DermaSafe AI Ingredient Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProfileRequest(BaseModel):
    age: int = 22
    gender: str = "Female"
    skinType: str = "Oily"
    lesion: str = "Acne"
    severity: str = "Low"
    environment: str = "Humid"
    allergies: list[str] = Field(default_factory=lambda: ["Tea Tree Oil"])
    previousSkinIssues: list[str] = Field(default_factory=lambda: ["Acne"])
    geneticIssues: list[str] = Field(default_factory=list)
    usesSkincareProducts: bool = True
    sunExposure: str = "Medium"


class ChatRequest(BaseModel):
    message: str
    profile: ProfileRequest = Field(default_factory=ProfileRequest)


def model_to_dict(model):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


@app.get("/")
def home():
    return {
        "message": "DermaSafe AI Ingredient Recommendation API is running.",
        "knowledgeBaseType": "dermatology-informed knowledge base",
        "disclaimer": "This is general skincare guidance and not a medical diagnosis.",
        "endpoints": {
            "recommend": "POST /recommend",
            "chat": "POST /chat",
            "docs": "GET /docs",
        },
    }


@app.post("/recommend")
def recommend(profile: ProfileRequest):
    try:
        return generate_recommendations(model_to_dict(profile))
    except RecommendationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/chat")
def chat(request: ChatRequest):
    try:
        return chat_with_rebeka(
            message=request.message,
            profile=model_to_dict(request.profile),
        )
    except RecommendationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
