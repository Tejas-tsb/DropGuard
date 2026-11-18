from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

from app.services.evaluation_service import MODEL_COLUMNS, load_test_predictions


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["model_loaded"] is True
    assert response.json()["model_load_error"] is None


def test_local_frontend_cors_allows_prediction_post(client):
    response = client.options(
        "/api/predict",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_unconfigured_origin_is_not_granted_cors_access(client):
    response = client.options(
        "/api/predict",
        headers={
            "Origin": "https://not-the-configured-frontend.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_prediction_uses_supplied_row_and_returns_valid_probability(
    client, sample_input, metadata
):
    from app.services.model_service import model_service

    response = client.post("/api/predict", json=sample_input)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["predicted_class"] in (0, 1)
    assert 0 <= body["academic_risk_probability"] <= 1
    assert body["risk_category"] in {
        "No elevated academic risk indicated",
        "Elevated academic risk",
    }
    assert body["classification_threshold"] == 0.5
    assert body["target_definition"] == metadata["target_definition"]
    expected_class, expected_probability, _ = model_service.predict(sample_input)
    assert body["predicted_class"] == expected_class
    assert body["academic_risk_probability"] == pytest.approx(expected_probability)


def test_prediction_schema_matches_metadata_exactly(metadata):
    from app.schemas.prediction import PredictionRequest

    assert list(PredictionRequest.model_fields) == metadata["input_features"]


def test_prediction_rejects_missing_feature(client, sample_input):
    incomplete = dict(sample_input)
    incomplete.pop("age")
    response = client.post("/api/predict", json=incomplete)
    assert response.status_code == 422
    assert "age" in response.text


@pytest.mark.parametrize(
    "field,value",
    [("age", "17"), ("school", "UNKNOWN"), ("G1", 21), ("absences", -1)],
)
def test_prediction_rejects_invalid_values(client, sample_input, field, value):
    invalid = dict(sample_input)
    invalid[field] = value
    response = client.post("/api/predict", json=invalid)
    assert response.status_code == 422


def test_prediction_accepts_valid_numeric_boundaries(client, sample_input):
    boundary = dict(sample_input)
    boundary.update(
        age=15,
        Medu=0,
        Fedu=4,
        traveltime=1,
        studytime=4,
        failures=3,
        famrel=1,
        freetime=5,
        goout=1,
        Dalc=5,
        Walc=1,
        health=5,
        absences=0,
        G1=0,
        G2=20,
    )
    response = client.post("/api/predict", json=boundary)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["predicted_class"] in (0, 1)
    assert 0.0 <= body["academic_risk_probability"] <= 1.0


@pytest.mark.parametrize("field", ["G3", "academic_risk"])
def test_prediction_rejects_target_fields(client, sample_input, field):
    invalid = dict(sample_input)
    invalid[field] = 0
    response = client.post("/api/predict", json=invalid)
    assert response.status_code == 422
    assert field in response.text


def test_analytics_overview_matches_source_dataset(client, dataset):
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    body = response.json()
    assert body["row_count"] == len(dataset)
    assert body["input_feature_count"] == 32
    assert sum(item["count"] for item in body["academic_risk_distribution"]) == len(dataset)
    assert body["target_is_dropout"] is False
    expected_target = (dataset["G3"] < 10).astype(int)
    assert (dataset["academic_risk"] == expected_target).all()


def test_analytics_distribution_matches_source_dataset(client, dataset, metadata):
    response = client.get("/api/analytics/distribution")
    assert response.status_code == 200
    body = response.json()
    for feature in metadata["input_features"]:
        assert sum(item["count"] for item in body["categorical"].get(feature, body["numeric"].get(feature))) == len(dataset)
    assert sum(item["count"] for item in body["academic_risk"]) == len(dataset)


def test_analytics_grades_match_source_dataset(client, dataset):
    response = client.get("/api/analytics/grades")
    assert response.status_code == 200
    body = response.json()
    for grade in ("G1", "G2", "G3"):
        assert body["grades"][grade]["count"] == int(dataset[grade].count())
        assert body["grades"][grade]["mean"] == pytest.approx(float(dataset[grade].mean()))
    assert sum(group["student_count"] for group in body["by_academic_risk"]) == len(dataset)


def test_analytics_factors_are_dataset_group_summaries(client, dataset, metadata):
    response = client.get("/api/analytics/factors")
    assert response.status_code == 200
    factors = response.json()["factors"]
    assert set(factors) == set(metadata["input_features"])
    for groups in factors.values():
        assert sum(group["student_count"] for group in groups) == len(dataset)
        assert all(0 <= group["academic_risk_rate"] <= 1 for group in groups)


def test_model_metrics_match_supplied_artifacts(client, metadata):
    import pandas as pd

    response = client.get("/api/model/metrics")
    assert response.status_code == 200
    body = response.json()
    assert body["test"]["accuracy"] == metadata["test_metrics"]["accuracy"]
    assert body["test"]["roc_auc"] == metadata["test_metrics"]["roc_auc"]
    assert body["test"]["sample_count"] == 130
    assert {item["class"] for item in body["test"]["per_class_metrics"]} == {0, 1}
    cv = pd.read_csv("data/cv_model_comparison.csv").set_index("Model").loc["Random Forest"]
    assert body["cross_validation"]["roc_auc"] == pytest.approx(cv["CV ROC-AUC"])


def test_model_comparison_results_match_existing_test_metrics_for_all_five_models(client):
    response = client.get("/api/model/comparison")
    assert response.status_code == 200
    body = response.json()
    assert len(body["models"]) == 5
    exported = pd.read_csv("data/test_model_comparison.csv").set_index("Model")
    cross_validated = pd.read_csv("data/cv_model_comparison.csv").set_index("Model")
    predictions = pd.read_csv("data/test_predictions.csv")
    observed = {item["model"]: item for item in body["models"]}
    assert set(observed) == set(MODEL_COLUMNS)

    metric_pairs = {
        "accuracy": "Accuracy",
        "precision": "Precision",
        "recall": "Recall",
        "f1_score": "F1-Score",
        "roc_auc": "ROC-AUC",
    }
    for name, (prediction_column, probability_column) in MODEL_COLUMNS.items():
        item = observed[name]
        expected_test = exported.loc[name]
        expected_cv = cross_validated.loc[name]
        for api_key, csv_key in metric_pairs.items():
            assert item["test"][api_key] == pytest.approx(expected_test[csv_key])
        assert item["cross_validation"]["accuracy"] == pytest.approx(
            expected_cv["CV Accuracy"]
        )
        y_true = predictions["y_true"].to_numpy()
        y_pred = predictions[prediction_column].to_numpy()
        assert item["test"]["accuracy"] == pytest.approx(float((y_true == y_pred).mean()))
        assert item["test"]["precision"] == pytest.approx(
            precision_score(y_true, y_pred, zero_division=0)
        )
        assert item["test"]["recall"] == pytest.approx(recall_score(y_true, y_pred))
        assert item["test"]["f1_score"] == pytest.approx(f1_score(y_true, y_pred))
        assert item["test"]["roc_auc"] == pytest.approx(
            roc_auc_score(y_true, predictions[probability_column].to_numpy())
        )
        assert item["held_out_predictions"]["accuracy"] == pytest.approx(
            item["test"]["accuracy"]
        )
        assert item["held_out_predictions"]["precision"] == pytest.approx(
            item["test"]["precision"]
        )
        assert item["held_out_predictions"]["recall"] == pytest.approx(
            item["test"]["recall"]
        )
        assert item["held_out_predictions"]["f1_score"] == pytest.approx(
            item["test"]["f1_score"]
        )
        assert item["held_out_predictions"]["roc_auc"] == pytest.approx(
            item["test"]["roc_auc"]
        )
        assert item["sample_count"] == 130
        assert {metric["class"] for metric in item["per_class_metrics"]} == {0, 1}


def test_confusion_matrices_use_prediction_columns_for_all_models(client):
    response = client.get("/api/model/confusion-matrix")
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert body["source"] == "test_predictions.csv"
    predictions = pd.read_csv("data/test_predictions.csv")
    results = {item["model"]: item for item in body["data"]["models"]}
    assert set(results) == set(MODEL_COLUMNS)
    y_true = predictions["y_true"].to_numpy()
    for name, (prediction_column, _) in MODEL_COLUMNS.items():
        result = results[name]
        expected = confusion_matrix(y_true, predictions[prediction_column], labels=[0, 1])
        assert result["matrix"] == expected.tolist()
        assert result["matrix_orientation"] == "rows=true labels, columns=predicted labels"
        assert result["sample_count"] == len(predictions)
        precision, recall, f1, support = precision_recall_fscore_support(
            y_true, predictions[prediction_column], labels=[0, 1], zero_division=0
        )
        for index, class_metric in enumerate(result["per_class_metrics"]):
            assert class_metric["precision"] == pytest.approx(precision[index])
            assert class_metric["recall"] == pytest.approx(recall[index])
            assert class_metric["f1_score"] == pytest.approx(f1[index])
            assert class_metric["support"] == support[index]


def test_roc_data_matches_probability_columns_and_existing_auc_for_all_models(client):
    response = client.get("/api/model/roc-data")
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert body["source"] == "test_predictions.csv"
    predictions = pd.read_csv("data/test_predictions.csv")
    exported = pd.read_csv("data/test_model_comparison.csv").set_index("Model")
    results = {item["model"]: item for item in body["data"]["models"]}
    y_true = predictions["y_true"].to_numpy()
    for name, (_, probability_column) in MODEL_COLUMNS.items():
        result = results[name]
        probabilities = predictions[probability_column].to_numpy()
        expected_fpr, expected_tpr, _ = roc_curve(
            y_true, probabilities, drop_intermediate=False
        )
        assert result["auc"] == pytest.approx(exported.loc[name, "ROC-AUC"])
        assert result["auc"] == pytest.approx(roc_auc_score(y_true, probabilities))
        assert result["fpr"] == pytest.approx(expected_fpr)
        assert result["tpr"] == pytest.approx(expected_tpr)
        assert len(result["fpr"]) == len(result["tpr"]) == len(result["thresholds"])
        assert result["sample_count"] == 130


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        ("missing_column", "missing required columns"),
        ("missing_value", "missing values"),
        ("bad_probability", r"within \[0, 1\]"),
        ("bad_label", "must be 0 or 1"),
        ("wrong_row_count", "Expected 130"),
    ],
)
def test_test_prediction_loader_rejects_invalid_evaluation_data(
    test_predictions, tmp_path, mutation, message
):
    frame = test_predictions.copy()
    if mutation == "missing_column":
        frame = frame.drop(columns=["knn_probability"])
    elif mutation == "missing_value":
        frame.loc[0, "random_forest_prediction"] = np.nan
    elif mutation == "bad_probability":
        frame.loc[0, "random_forest_probability"] = 1.01
    elif mutation == "bad_label":
        frame.loc[0, "y_true"] = 2
    elif mutation == "wrong_row_count":
        frame = frame.iloc[:-1]

    bad_file = tmp_path / f"{mutation}.csv"
    frame.to_csv(bad_file, index=False)
    with pytest.raises(ValueError, match=message):
        load_test_predictions(bad_file)


def test_feature_importance_maps_back_to_32_inputs(client, metadata):
    response = client.get("/api/model/feature-importance")
    assert response.status_code == 200, response.text
    body = response.json()
    features = body["input_feature_importance"]
    assert {row["feature"] for row in features} == set(metadata["input_features"])
    assert sum(row["importance"] for row in features) == pytest.approx(1.0)
    assert body["transformed_feature_importance"]
    assert "not a causal" in body["interpretation"]


def test_model_verification_endpoint_loads_existing_pipeline(client):
    response = client.get("/api/model/verify")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "verified"
    assert body["model_type"] == "Pipeline"
    assert body["input_feature_count"] == 32
    assert sum(body["sample_probabilities"].values()) == pytest.approx(1.0)
