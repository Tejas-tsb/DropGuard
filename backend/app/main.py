"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analytics, health, model, predictions
from app.core.config import CORS_ORIGINS
from app.services.dataset_service import dataset_service
from app.services.model_service import model_service


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Fail fast when deployment assets or the fitted pipeline are unavailable.
    model_service.load()
    _ = dataset_service.frame
    yield

app = FastAPI(
    title="DropGuard API",
    description=(
        "Foundation API for student academic-risk prediction. The model target is "
        "an academic-risk proxy (G3 < 10), not observed dropout."
    ),
    version="0.1.0",
    debug=False,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router, prefix="/api")
app.include_router(model.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
