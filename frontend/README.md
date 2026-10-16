# Browser demo

Legacy web UI for demos without a phone. Same screening flow as the Expo app.

## Run

With the API and UI together:

```bash
python serve.py
```

Open http://127.0.0.1:8000

Split processes:

```bash
python -m backend          # API on :8000
python -m frontend         # UI on :5173
```

The mobile app lives in `mobile/`.
