# DermaSafe AI — Mobile (Expo React Native)

React Native + Expo + TypeScript client for the DermaSafe AI screening system.

## Tech stack

| Layer | Technologies |
|---|---|
| Mobile frontend | React Native, Expo, JavaScript/TypeScript |
| Screening API | Python REST API (`backend/`, FastAPI) |
| Ingredient KB | Node.js + Express + JSON |
| AI/ML | TensorFlow, Keras, scikit-learn (Python backend) |
| On-device storage | SQLite (`expo-sqlite`) |
| Data exchange | JSON over HTTP |

## Prerequisites

1. Python screening API running on port **8000**
2. Optional ingredient service on port **3001**
3. [Expo Go](https://expo.dev/go) on a phone, or an Android/iOS emulator

## Run

Terminal 1 — Python screening API:

```bash
pip install -r requirements.txt
python -m backend
```

Terminal 2 — Node ingredient knowledge-base (optional):

```bash
cd services/ingredients
npm install
npm start
```

Terminal 3 — mobile app:

```bash
cd mobile
npm install
npx expo start
```

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to your machine's LAN IP when testing on a physical device (e.g. `http://192.168.1.10:8000`).

## Screens

- **Home** — project overview and API status
- **Session** — disclaimer + on-device profile (SQLite)
- **Screening** — camera / gallery upload, lesion picker, analyze
- **Result** — risk grades, Grad-CAM, ingredient suggestions
- **Guidance / Report** — structured follow-up copy
- **Lab / Method** — dataset integrity and research notes
- **History** — local SQLite screening log

The legacy browser UI remains in `frontend/` for demos without a phone.
