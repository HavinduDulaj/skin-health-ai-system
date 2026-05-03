import json
from pathlib import Path
from uuid import uuid4

from werkzeug.security import generate_password_hash


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
USERS_PATH = DATA_DIR / "users.json"

DATA_DIR.mkdir(exist_ok=True)


def read_users() -> list[dict]:
    if not USERS_PATH.exists():
        return []

    with open(USERS_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def write_users(users: list[dict]) -> None:
    with open(USERS_PATH, "w", encoding="utf-8") as file:
        json.dump(users, file, indent=2)


def sanitize_user(user: dict) -> dict:
    return {
        key: value
        for key, value in user.items()
        if key != "password_hash"
    }


def register_user(payload: dict) -> dict:
    required_fields = [
        "fullName",
        "email",
        "phone",
        "age",
        "gender",
        "address",
        "password",
    ]

    missing_fields = [field for field in required_fields if not str(payload.get(field, "")).strip()]
    if missing_fields:
        raise ValueError("All registration fields are required.")

    users = read_users()
    normalized_email = payload["email"].strip().lower()

    if any(user["email"].lower() == normalized_email for user in users):
        raise ValueError("An account with this email already exists.")

    user = {
        "id": uuid4().hex,
        "fullName": payload["fullName"].strip(),
        "email": normalized_email,
        "phone": payload["phone"].strip(),
        "age": int(payload["age"]),
        "gender": payload["gender"].strip(),
        "address": payload["address"].strip(),
        "password_hash": generate_password_hash(payload["password"]),
    }

    users.append(user)
    write_users(users)

    return sanitize_user(user)


def list_users() -> list[dict]:
    return [sanitize_user(user) for user in read_users()]
