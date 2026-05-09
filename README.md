# Skin Health AI System

Skin lesion risk prediction project with a standard backend/frontend layout.

## Project structure

- `backend/` - FastAPI risk prediction API, model training code, and trained model files
- `frontend/mobile-app/` - Expo mobile app
- `mobile-app/` - original mobile app copy kept for compatibility with existing local workflows
- `dataset/` - train, validation, and test images grouped by condition
- `docs/` - project documentation
- `screenshots/` - screenshots and visual evidence

## Retrain the risk model

Run from the project root:

```powershell
$env:PYTHONPATH=(Resolve-Path '.py314-packages').Path
python backend\training\train_sklearn_model.py --dataset dataset --output backend\models\risk_model.joblib --feature-set legacy
```

The retrained model writes:

- `backend/models/risk_model.joblib`
- `backend/models/risk_model.metrics.json`

## Start the backend

Run from the project root:

```powershell
$env:PYTHONPATH=(Resolve-Path '.py314-packages').Path
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

The API accepts image uploads at:

```text
POST /predict-risk
```

## Start the mobile app

Run from the standard frontend folder:

```powershell
cd frontend\mobile-app
npm install
npm start
```
