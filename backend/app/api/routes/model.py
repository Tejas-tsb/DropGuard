"""Model verification endpoint."""

import logging

from fastapi import APIRouter, HTTPException

from app.core.errors import service_error_detail
from app.services.evaluation_service import evaluation_service
from app.services.model_service import model_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/model", tags=["model"])


@router.get("/verify")
def verify_model() -> dict[str, object]:
    try:
        result = model_service.verify()
    except Exception as exc:
        logger.exception("Unable to verify the supplied fitted model")
        raise HTTPException(
            status_code=503,
            detail=service_error_detail(
                "The supplied model could not be verified. Check backend logs for the compatibility or data error.",
                exc,
            ),
        ) from exc
    return {
        "status": "verified",
        "model_name": result.model_name,
        "model_type": result.model_type,
        "input_feature_count": result.feature_count,
        "sample_prediction": result.sample_prediction,
        "sample_probabilities": result.sample_probabilities,
        "target_definition": result.target_definition,
        "prediction_stage": result.prediction_stage,
        "sample_source": "first supplied dataset row; G3 and academic_risk excluded",
    }


@router.get("/metrics")
def model_metrics() -> dict[str, object]:
    try:
        return evaluation_service.metrics()
    except Exception as exc:
        logger.exception("Unable to read supplied model metrics")
        raise HTTPException(
            status_code=503,
            detail=service_error_detail("Supplied model metrics are unavailable.", exc),
        ) from exc


@router.get("/comparison")
def model_comparison() -> dict[str, object]:
    try:
        return evaluation_service.comparison()
    except Exception as exc:
        logger.exception("Unable to read supplied model comparison artifacts")
        raise HTTPException(
            status_code=503,
            detail=service_error_detail("Model comparison data are unavailable.", exc),
        ) from exc


@router.get("/confusion-matrix")
def confusion_matrix() -> dict[str, object]:
    try:
        return evaluation_service.confusion_matrices()
    except Exception as exc:
        logger.exception("Unable to calculate confusion matrices from held-out predictions")
        raise HTTPException(
            status_code=503,
            detail=service_error_detail(
                "Held-out confusion-matrix data are unavailable or invalid.", exc
            ),
        ) from exc


@router.get("/roc-data")
def roc_data() -> dict[str, object]:
    try:
        return evaluation_service.roc_data()
    except Exception as exc:
        logger.exception("Unable to calculate ROC curves from held-out probabilities")
        raise HTTPException(
            status_code=503,
            detail=service_error_detail(
                "Held-out ROC data are unavailable or invalid.", exc
            ),
        ) from exc


@router.get("/feature-importance")
def feature_importance() -> dict[str, object]:
    try:
        return model_service.feature_importance()
    except Exception as exc:
        logger.exception("Unable to extract fitted-model feature importance")
        raise HTTPException(
            status_code=503,
            detail=service_error_detail(
                "Feature importance could not be extracted from the supplied fitted pipeline.",
                exc,
            ),
        ) from exc
