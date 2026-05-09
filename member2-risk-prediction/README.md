# Skin Risk Prediction Module

This folder is now kept as a legacy member module. The active backend has been moved to the standard project-level `backend/` folder.

## Folder structure

- `../backend/app` - FastAPI upload endpoint used by the mobile app
- `../backend/training` - feature extraction and model training code
- `../backend/models/risk_model.joblib` - trained model artifact used by the API
- `../dataset/train` - training images grouped by lesion type
- `../dataset/val` - validation images grouped by lesion type
- `../dataset/test` - test images grouped by lesion type

## Risk mapping

- `acne` -> Low
- `rashes` or `rash` -> Medium
- `warts` -> Medium
- `burns` -> High

## Train the model

Run this from the project root:

```powershell
.\.venv312\Scripts\python.exe member2-risk-prediction\training\train_sklearn_model.py --dataset dataset --output member2-risk-prediction\saved_model\risk_model.joblib
```

Use the new command instead:

```powershell
$env:PYTHONPATH=(Resolve-Path '.py314-packages').Path
python backend\training\train_sklearn_model.py --dataset dataset --output backend\models\risk_model.joblib --feature-set legacy
```

## Start the backend

Run this from the project root:

```powershell
$env:PYTHONPATH=(Resolve-Path '.py314-packages').Path
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

The mobile app posts the uploaded image to `/predict-risk` as multipart form data.
