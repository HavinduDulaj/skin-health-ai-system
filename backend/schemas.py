"""OpenAPI contracts for the Derma-Safe AI screening API."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

Decision = Literal["grade", "abstain", "quality_reject", "unavailable"]
ModelKind = Literal["keras_v5", "efficientnet_finetune", "linear_probe"]


class Policy(BaseModel):
    confidence_min: float
    margin_min: float
    quality_min: float
    note: str


class QualityBlock(BaseModel):
    score: float
    flags: list[str]
    blur: float
    brightness: float
    width: int
    height: int
    is_low_quality: bool


class Guidance(BaseModel):
    headline: str
    summary: str
    steps: list[str]
    alert: Optional[str] = None


class ConditionBlock(BaseModel):
    detected: str
    used: Optional[str] = None
    source: Optional[str] = None
    overridden: bool = False
    uncertain: bool = False
    index: Optional[int] = None
    probabilities: dict[str, float] = Field(default_factory=dict)
    method: str = ""
    note: str = ""


class Indicators(BaseModel):
    texture_energy: float
    color_variation: float
    structural_irregularity: float
    estimated_extent: float
    entropy: float
    width: int
    height: int
    notes: list[str] = Field(default_factory=list)


class Preprocess(BaseModel):
    resized_to: list[int]
    color_space: str
    normalization: str
    noise_reduction: str


class ReportCard(BaseModel):
    detected_condition: Optional[str] = None
    risk_level: Optional[str] = None
    confidence: Optional[float] = None
    advisory: Optional[str] = None
    alert: Optional[str] = None
    disclaimer: str


class ModelInfo(BaseModel):
    loaded: bool
    kind: Optional[ModelKind] = None
    meta: dict = Field(default_factory=dict)


class LesionEffect(BaseModel):
    """How conditioning on lesion type moved the softmax (V5 only)."""

    provided: str
    risk_conditioned: Optional[str] = None
    risk_marginal: Optional[str] = None
    probability_shift: dict[str, float]
    l1: float
    note: str


class PipelineStep(BaseModel):
    id: str
    title: str
    status: str
    detail: str


class Explainability(BaseModel):
    method: str
    available: bool = False
    layer: Optional[str] = None
    class_index: Optional[int] = None
    class_name: Optional[str] = None
    lesion_context: Optional[str] = None
    backbone_layers_copied: Optional[int] = None
    backend: Optional[str] = None
    overlay_jpeg: Optional[str] = None
    heatmap_jpeg: Optional[str] = None
    note: str = ""


class ProjectRef(BaseModel):
    code: str
    component: str
    student_id: str


class AnalyzeResponse(BaseModel):
    decision: Decision
    risk: Optional[str] = None
    probabilities: dict[str, Optional[float]]
    confidence: Optional[float] = None
    margin: Optional[float] = None
    entropy: Optional[float] = None
    uncertain: bool
    caution: bool = False
    lesion: Optional[str] = None
    condition: Optional[ConditionBlock] = None
    indicators: Optional[Indicators] = None
    preprocess: Optional[Preprocess] = None
    lesion_effect: Optional[LesionEffect] = None
    quality: QualityBlock
    guidance: Optional[Guidance] = None
    explainability: Optional[Explainability] = None
    pipeline: list[PipelineStep] = Field(default_factory=list)
    risk_module: list[PipelineStep] = Field(default_factory=list)
    report: Optional[ReportCard] = None
    model: ModelInfo
    policy: Policy
    disclaimer: str
    project: Optional[ProjectRef] = None


class HealthResponse(BaseModel):
    ok: bool
    name: str
    version: str
    model_loaded: bool
    model_kind: Optional[ModelKind] = None
    samples: int
    docs: str = "/docs"


class SampleItem(BaseModel):
    id: str
    lesion: str
    risk: str
    filename: str


class SampleList(BaseModel):
    items: list[SampleItem]
