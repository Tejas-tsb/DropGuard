"""Student academic-risk prediction endpoint."""

import logging

from fastapi import APIRouter, HTTPException

from app.core.errors import service_error_detail
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.model_service import model_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["predictions"])


@router.post("/predict", response_model=PredictionResponse)
def predict_academic_risk(request: PredictionRequest) -> PredictionResponse:
    try:
        predicted_class, risk_probability, threshold = model_service.predict(
            request.model_dump()
        )
        metadata = model_service.metadata
    except Exception as exc:
        logger.exception("Academic-risk inference failed")
        raise HTTPException(
            status_code=503,
            detail=service_error_detail(
                "The supplied model could not produce a prediction.", exc
            ),
        ) from exc

    return PredictionResponse(
        predicted_class=predicted_class,
        academic_risk_probability=risk_probability,
        risk_category=(
            "Elevated academic risk"
            if predicted_class == 1
            else "No elevated academic risk indicated"
        ),
        classification_threshold=threshold,
        classification_rule=(
            "The fitted Scikit-learn classifier's predict() result (highest class "
            "probability); class 0 wins an exact tie."
        ),
        target_definition=metadata["target_definition"],
    )
