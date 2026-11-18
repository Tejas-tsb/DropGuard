"""Health check endpoint."""

from fastapi import APIRouter

from app.services.model_service import model_service

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str | bool | None]:
    ready = model_service.is_loaded and model_service.load_error is None
    return {
        "status": "ok" if ready else "degraded",
        "model_loaded": model_service.is_loaded,
        "model_load_error": model_service.load_error,
    }
