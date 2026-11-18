"""Runtime settings derived from environment variables and project paths."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent
load_dotenv(PROJECT_DIR / ".env")
MODEL_PATH = BACKEND_DIR / "models" / "dropguard_model.joblib"
METADATA_PATH = BACKEND_DIR / "data" / "metadata.json"
DATASET_PATH = BACKEND_DIR / "data" / "student_performance.csv"

API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
CORS_ORIGINS_VALUE = os.getenv("CORS_ORIGINS")
CORS_ORIGINS = [
    origin.strip()
    for origin in (
        CORS_ORIGINS_VALUE
        if CORS_ORIGINS_VALUE is not None
        else "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

if APP_ENV == "production":
    if not CORS_ORIGINS_VALUE or not CORS_ORIGINS:
        raise RuntimeError("CORS_ORIGINS must be configured for production")
    if "*" in CORS_ORIGINS:
        raise RuntimeError("Wildcard CORS is not allowed in production")
    if any(
        urlsplit(origin).scheme != "https"
        or not urlsplit(origin).netloc
        or urlsplit(origin).path
        or urlsplit(origin).query
        or urlsplit(origin).fragment
        for origin in CORS_ORIGINS
    ):
        raise RuntimeError(
            "Production CORS_ORIGINS must contain exact HTTPS origins without paths"
        )
