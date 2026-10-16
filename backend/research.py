"""Research narrative served to the frontend and OpenAPI clients.

Aligned with proposal R26-IT-058, Member 2: Skin Risk Level Identification
& Prediction (N.A.V.P. Nishshanka, IT22179494).
"""

from __future__ import annotations

CONTRIBUTIONS = [
    {
        "id": "integrity",
        "title": "Leakage-free reconstruction",
        "summary": (
            "Exact hashes, perceptual near-duplicates, and a post-rebuild leakage "
            "check keep near-duplicate groups inside one split. Synthetic copies "
            "are held out of the reported set."
        ),
    },
    {
        "id": "conditioning",
        "title": "Lesion-conditioned risk head",
        "summary": (
            "EfficientNetV2-B0 reads the photograph. A one-hot lesion channel "
            "(acne, burns, rash, warts) is fused before the softmax. The API "
            "reports the shift versus a uniform lesion prior."
        ),
    },
    {
        "id": "selective",
        "title": "Selective screening",
        "summary": (
            "The system may return a grade, abstain when the top-two classes "
            "are close, or reject the frame when photograph quality is too low. "
            "Forced 90% accuracy is not the objective."
        ),
    },
    {
        "id": "explain",
        "title": "Grad-CAM risk explanation",
        "summary": (
            "After a usable photograph, Grad-CAM highlights the regions that "
            "raised the leading Low / Medium / High grade. The heatmap explains "
            "the risk head. It is not a lesion outline and not a diagnosis."
        ),
    },
]

ARCHITECTURE = [
    {
        "id": "input",
        "title": "Image Input",
        "summary": "Accept a consumer photograph of one lesion area.",
    },
    {
        "id": "quality",
        "title": "Image Quality Assessment",
        "summary": (
            "Blur, exposure, contrast, and resolution are scored first. A weak "
            "frame is rejected before any risk grade is computed."
        ),
    },
    {
        "id": "lesion",
        "title": "Skin Lesion Identification",
        "summary": (
            "The photograph is classified into acne, burns, rash, or warts. "
            "That condition, plus severity indicators, is passed into the risk head. "
            "You may confirm the family if you know it (Member 1 interface)."
        ),
    },
    {
        "id": "risk",
        "title": "Risk-Level Screening",
        "summary": (
            "The research artefact: map the photograph to Low, Medium, or High "
            "without naming a disease."
        ),
    },
    {
        "id": "confidence",
        "title": "Confidence-Based Safety Filter",
        "summary": (
            "If confidence or the top-two margin is below threshold, the API "
            "abstains and returns the distribution instead of a forced winner."
        ),
    },
    {
        "id": "explain",
        "title": "Explainability (Grad-CAM)",
        "summary": "Heatmap of the regions that increased the leading risk grade.",
    },
    {
        "id": "advisory",
        "title": "Decision Support / Output",
        "summary": (
            "Advisory copy by risk grade, plus a non-diagnostic disclaimer. "
            "High-risk language asks the user to see a clinician."
        ),
    },
]

METHOD = {
    "title": "Derma-Safe AI",
    "subtitle": "Leakage-aware dermatological risk screening",
    "code": "R26-IT-058",
    "student": "N.A.V.P. Nishshanka",
    "student_id": "IT22179494",
    "component": "Skin Risk Level Identification & Prediction",
    "problem": (
        "Four lesion families — acne, burns, rash, and warts — labelled Low, "
        "Medium, or High. The screen turns a photograph into understandable "
        "risk awareness without a medical diagnosis."
    ),
    "pipeline": [
        "Validate files, extensions, corruption, and size.",
        "Exact duplicates via file SHA-256 and decoded-pixel SHA-256.",
        "Near-duplicates via pHash / dHash; cross-split groups are leakage.",
        "Quality scores (blur, exposure, contrast, entropy) flag review — no silent deletes.",
        "Label consistency is checked inside each lesion type only. No auto-relabel.",
        "Rebuild a stratified 70 / 15 / 15 split. Near-duplicate groups stay together.",
        "Leakage check on the rebuilt tree must pass before training is trusted.",
        "Serve grades through a versioned API that may abstain, reject the frame, and show Grad-CAM.",
    ],
    "model": (
        "Training uses EfficientNetV2-B0 with a lesion one-hot input and a "
        "three-way softmax. Class weights replace duplicated files. Augmentation "
        "is train-only. Validation is for early stopping. Test is read once. "
        "At serving time the proposal modules run in order: quality gate, "
        "lesion identification, severity indicators, risk grade, confidence "
        "filter, Grad-CAM, then advisory output."
    ),
    "limitations": [
        "Not a melanoma detector, not triage, not a diagnosis.",
        "Consumer-camera photographs, not dermoscopy.",
        "Medium remains the weakly separable class.",
        "Selecting the lesion type is part of the model, not an optional hint.",
        "HAM10000 is a melanoma dermoscopy benchmark; this component is trained on common-lesion risk grades, not ISIC disease labels.",
    ],
}

DISCLAIMER = (
    "Not a diagnosis. If a skin concern looks serious or is getting worse, see a clinician."
)
