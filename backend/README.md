# DermaSafe Backend

Flask backend for skin condition image detection using the trained TensorFlow model in [models](/D:/RP/skin-project/backend/models).

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Endpoints

- `POST /api/auth/register`
- `GET /api/health`
- `GET /api/users`
- `POST /api/analysis/upload`

## Upload Request

Send `multipart/form-data` with an `image` file field.
