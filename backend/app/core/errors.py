"""Helpers for safe API error responses."""

from app.core.config import APP_ENV


def service_error_detail(message: str, error: Exception) -> str | dict[str, str]:
    """Keep stack context in logs, but avoid exposing internals in production."""
    if APP_ENV == "production":
        return message
    return {"message": message, "error": f"{type(error).__name__}: {error}"}
