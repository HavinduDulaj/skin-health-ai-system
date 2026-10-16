# DermaSafe AI — Mobile (Expo React Native)

React Native + Expo + TypeScript client for the DermaSafe AI screening system.

## Tech stack

| Layer | Technologies |
|---|---|
| Mobile frontend | React Native, Expo, JavaScript/TypeScript |
| Screening API | Python REST API (`backend/`, FastAPI) |
| AI/ML | TensorFlow, Keras, scikit-learn (Python backend) |
| On-device storage | SQLite (`expo-sqlite`) |
| Data exchange | JSON over HTTP |

## Prerequisites

1. Python screening API running on port **8000**
2. [Expo Go](https://expo.dev/go) on a phone, or an Android/iOS emulator

## Run

Terminal 1 — Python screening API:

```bash
pip install -r requirements.txt
python -m backend
```

Terminal 2 — mobile app:

```bash
cd mobile
npm install
npx expo start
```

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to your machine's LAN IP when testing on a physical device (e.g. `http://192.168.1.10:8000`).

## Screens

- **Home** — start a screening
- **Get started** — short non-diagnostic confirmation
- **Photo** — camera or gallery upload, lesion type, analyze
- **Results** — detected condition, risk level, confidence, and guidance

The legacy browser UI remains in `frontend/` for demos without a phone.
