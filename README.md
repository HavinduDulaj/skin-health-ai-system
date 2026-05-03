# skin-health-ai-system
AI-Based Skin Health Decision Support System

## Ingredient Recommendation Module

This branch includes the Ingredient Recommendation and Rebeka Chatbot module:

- `ingredient-mobile/` - React Native TypeScript mobile UI
- `ingredient-recommendation-system/` - FastAPI recommendation backend and dermatology-informed knowledge base

Run backend:

```powershell
cd ingredient-recommendation-system/backend
python -m uvicorn main_api:app --host 0.0.0.0 --port 8001
```

Run frontend:

```powershell
cd ingredient-mobile
npm install
npm start
```
