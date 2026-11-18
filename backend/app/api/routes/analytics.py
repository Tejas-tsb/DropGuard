"""Dataset-backed descriptive analytics endpoints."""

import logging
from typing import Any, Callable

from fastapi import APIRouter, HTTPException

from app.core.errors import service_error_detail
from app.services.dataset_service import dataset_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


def _respond(operation: Callable[[], dict[str, Any]]) -> dict[str, Any]:
    try:
        return operation()
    except Exception as exc:
        logger.exception("Dataset analytics failed")
        raise HTTPException(
            status_code=503,
            detail=service_error_detail("Dataset analytics are unavailable.", exc),
        ) from exc


@router.get("/overview")
def overview() -> dict[str, Any]:
    return _respond(dataset_service.overview)


@router.get("/distribution")
def distribution() -> dict[str, Any]:
    return _respond(dataset_service.distribution)


@router.get("/grades")
def grades() -> dict[str, Any]:
    return _respond(dataset_service.grades)


@router.get("/factors")
def factors() -> dict[str, Any]:
    return _respond(dataset_service.factors)
