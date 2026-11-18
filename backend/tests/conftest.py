import json
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.core.config import BACKEND_DIR, DATASET_PATH, METADATA_PATH
from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def metadata():
    return json.loads(METADATA_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def dataset():
    return pd.read_csv(DATASET_PATH)


@pytest.fixture(scope="session")
def test_predictions():
    return pd.read_csv(BACKEND_DIR / "data" / "test_predictions.csv")


@pytest.fixture(scope="session")
def sample_input(dataset, metadata):
    row = dataset.iloc[0]
    values = {}
    for feature in metadata["input_features"]:
        value = row[feature]
        values[feature] = value.item() if hasattr(value, "item") else value
    return values
