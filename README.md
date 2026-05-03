# DermaSafe Skin Detection

This repository is now split into two fully separate applications:

- [frontend](/D:/RP/skin-project/frontend): Expo React Native mobile app
- [backend](/D:/RP/skin-project/backend): Flask + TensorFlow image analysis API

The mobile app now includes a registration flow that collects and stores user details before allowing image analysis.

## Frontend

Location: [frontend](/D:/RP/skin-project/frontend)

```bash
cd frontend
npm install
npx expo start
```

## Backend

Location: [backend](/D:/RP/skin-project/backend)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## API

The mobile app sends a `POST` request to:

```text
http://<YOUR_IP>:5000/api/analysis/upload
```

Expected response:

```json
{
  "condition": "acne",
  "confidence": 0.87
}
```
