"""Read and validate supplied evaluation artifacts for the trained models."""

from __future__ import annotations

import csv
import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix as sklearn_confusion_matrix,
    precision_recall_fscore_support,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
    f1_score,
)

from app.core.config import BACKEND_DIR, METADATA_PATH


TEST_COMPARISON_PATH = BACKEND_DIR / "data" / "test_model_comparison.csv"
CV_COMPARISON_PATH = BACKEND_DIR / "data" / "cv_model_comparison.csv"
TEST_PREDICTIONS_PATH = BACKEND_DIR / "data" / "test_predictions.csv"
EXPECTED_TEST_ROWS = 130
LABELS = (0, 1)

# Names match the five trained classifiers in the exported comparison file.
MODEL_COLUMNS = {
    "Random Forest": ("random_forest_prediction", "random_forest_probability"),
    "Logistic Regression": (
        "logistic_regression_prediction",
        "logistic_regression_probability",
    ),
    "SVM": ("svm_prediction", "svm_probability"),
    "Decision Tree": ("decision_tree_prediction", "decision_tree_probability"),
    "KNN": ("knn_prediction", "knn_probability"),
}


def _rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as source:
        return list(csv.DictReader(source))


def _random_forest_row(path: Path) -> dict[str, str]:
    for row in _rows(path):
        if row.get("Model") == "Random Forest":
            return row
    raise ValueError(f"Random Forest row is absent from {path.name}")


@lru_cache(maxsize=8)
def load_test_predictions(path: Path = TEST_PREDICTIONS_PATH) -> pd.DataFrame:
    """Load the held-out prediction table once and reject invalid evaluation data."""
    if not path.is_file():
        raise ValueError(f"Held-out prediction file is missing: {path}")

    try:
        frame = pd.read_csv(path)
    except Exception as exc:
        raise ValueError(f"Unable to parse held-out prediction file {path.name}: {exc}") from exc

    required_columns = {"y_true"}
    for prediction_column, probability_column in MODEL_COLUMNS.values():
        required_columns.update((prediction_column, probability_column))
    missing_columns = sorted(required_columns - set(frame.columns))
    if missing_columns:
        raise ValueError(
            "Held-out prediction file is missing required columns: "
            + ", ".join(missing_columns)
        )
    if len(frame) != EXPECTED_TEST_ROWS:
        raise ValueError(
            f"Expected {EXPECTED_TEST_ROWS} held-out records, found {len(frame)}"
        )

    evaluation_columns = sorted(required_columns)
    missing_values = {
        column: int(count)
        for column, count in frame[evaluation_columns].isna().sum().items()
        if count
    }
    if missing_values:
        raise ValueError(f"Held-out prediction file contains missing values: {missing_values}")

    for column in evaluation_columns:
        numeric = pd.to_numeric(frame[column], errors="coerce")
        if numeric.isna().any() or not np.isfinite(numeric.to_numpy(dtype=float)).all():
            raise ValueError(f"Column {column!r} must contain finite numeric values")
        frame[column] = numeric.astype(float)

    label_columns = ["y_true"] + [columns[0] for columns in MODEL_COLUMNS.values()]
    for column in label_columns:
        values = frame[column].to_numpy(dtype=float)
        if not np.equal(values, np.floor(values)).all():
            raise ValueError(f"Class labels in {column!r} must be integers 0 or 1")
        if not np.isin(values, LABELS).all():
            raise ValueError(f"Class labels in {column!r} must be 0 or 1")
        frame[column] = values.astype(np.int64)

    if set(frame["y_true"].unique()) != set(LABELS):
        raise ValueError("y_true must contain both classes 0 and 1 for ROC analysis")

    for _, probability_column in MODEL_COLUMNS.values():
        probabilities = frame[probability_column].to_numpy(dtype=float)
        if ((probabilities < 0.0) | (probabilities > 1.0)).any():
            raise ValueError(f"Probabilities in {probability_column!r} must be within [0, 1]")

    return frame


def _per_class_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> list[dict[str, Any]]:
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=LABELS, zero_division=0
    )
    return [
        {
            "class": label,
            "precision": float(precision[index]),
            "recall": float(recall[index]),
            "f1_score": float(f1[index]),
            "support": int(support[index]),
        }
        for index, label in enumerate(LABELS)
    ]


def _classification_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, pos_label=1, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, pos_label=1, zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, pos_label=1, zero_division=0)),
        "per_class_metrics": _per_class_metrics(y_true, y_pred),
    }


class EvaluationService:
    def metrics(self) -> dict[str, Any]:
        with METADATA_PATH.open(encoding="utf-8") as source:
            metadata = json.load(source)
        test_row = _random_forest_row(TEST_COMPARISON_PATH)
        cv_row = _random_forest_row(CV_COMPARISON_PATH)
        test = metadata["test_metrics"]
        predictions = load_test_predictions()
        y_true = predictions["y_true"].to_numpy()
        rf_prediction_column = MODEL_COLUMNS["Random Forest"][0]
        random_forest_metrics = _classification_metrics(
            y_true, predictions[rf_prediction_column].to_numpy()
        )
        return {
            "model_name": metadata["model_name"],
            "target_definition": metadata["target_definition"],
            "test": {
                "accuracy": float(test["accuracy"]),
                "precision": float(test["precision"]),
                "recall": float(test["recall"]),
                "f1_score": float(test["f1_score"]),
                "roc_auc": float(test["roc_auc"]),
                "training_time_seconds": float(test_row["Training Time (s)"]),
                "per_class_metrics": random_forest_metrics["per_class_metrics"],
                "sample_count": int(len(predictions)),
                "source": (
                    "metadata.json, test_model_comparison.csv, and test_predictions.csv"
                ),
            },
            "cross_validation": {
                "accuracy": float(cv_row["CV Accuracy"]),
                "precision": float(cv_row["CV Precision"]),
                "recall": float(cv_row["CV Recall"]),
                "f1_score": float(cv_row["CV F1-Score"]),
                "roc_auc": float(cv_row["CV ROC-AUC"]),
                "source": "cv_model_comparison.csv",
            },
            "classification_rule": (
                "Scikit-learn predict() uses the highest class probability; for this "
                "binary classifier the class-1 decision boundary is 0.5, with class "
                "0 winning an exact tie."
            ),
            "classification_threshold": 0.5,
            "limitation": metadata["limitation"],
        }

    def comparison(self) -> dict[str, Any]:
        test_rows = _rows(TEST_COMPARISON_PATH)
        cv_rows_by_name = {row["Model"]: row for row in _rows(CV_COMPARISON_PATH)}
        predictions = load_test_predictions()
        y_true = predictions["y_true"].to_numpy()
        models = []
        for test_row in test_rows:
            name = test_row["Model"]
            cv = cv_rows_by_name.get(name)
            columns = MODEL_COLUMNS.get(name)
            if cv is None:
                raise ValueError(f"Cross-validation results are missing model {name!r}")
            if columns is None:
                raise ValueError(f"No held-out prediction columns are configured for {name!r}")
            prediction_column, probability_column = columns
            y_pred = predictions[prediction_column].to_numpy()
            derived = _classification_metrics(y_true, y_pred)
            derived["roc_auc"] = float(
                roc_auc_score(y_true, predictions[probability_column].to_numpy())
            )
            derived["sample_count"] = int(len(predictions))
            models.append(
                {
                    "model": name,
                    "test": {
                        "accuracy": float(test_row["Accuracy"]),
                        "precision": float(test_row["Precision"]),
                        "recall": float(test_row["Recall"]),
                        "f1_score": float(test_row["F1-Score"]),
                        "roc_auc": float(test_row["ROC-AUC"]),
                        "training_time_seconds": float(test_row["Training Time (s)"]),
                    },
                    "cross_validation": {
                        "accuracy": float(cv["CV Accuracy"]),
                        "precision": float(cv["CV Precision"]),
                        "recall": float(cv["CV Recall"]),
                        "f1_score": float(cv["CV F1-Score"]),
                        "roc_auc": float(cv["CV ROC-AUC"]),
                    },
                    "held_out_predictions": derived,
                    "per_class_metrics": derived["per_class_metrics"],
                    "sample_count": int(len(predictions)),
                }
            )
        return {
            "models": models,
            "sources": [
                TEST_COMPARISON_PATH.name,
                CV_COMPARISON_PATH.name,
                TEST_PREDICTIONS_PATH.name,
            ],
        }

    def confusion_matrices(self) -> dict[str, Any]:
        predictions = load_test_predictions()
        y_true = predictions["y_true"].to_numpy()
        models = []
        for name, (prediction_column, _) in MODEL_COLUMNS.items():
            y_pred = predictions[prediction_column].to_numpy()
            matrix = sklearn_confusion_matrix(y_true, y_pred, labels=LABELS)
            models.append(
                {
                    "model": name,
                    "labels": list(LABELS),
                    "matrix": matrix.tolist(),
                    "matrix_orientation": "rows=true labels, columns=predicted labels",
                    "true_negative": int(matrix[0, 0]),
                    "false_positive": int(matrix[0, 1]),
                    "false_negative": int(matrix[1, 0]),
                    "true_positive": int(matrix[1, 1]),
                    "sample_count": int(len(predictions)),
                    **_classification_metrics(y_true, y_pred),
                }
            )
        return {
            "available": True,
            "data": {
                "sample_count": int(len(predictions)),
                "positive_label": 1,
                "models": models,
            },
            "source": TEST_PREDICTIONS_PATH.name,
        }

    def roc_data(self) -> dict[str, Any]:
        predictions = load_test_predictions()
        y_true = predictions["y_true"].to_numpy()
        models = []
        for name, (_, probability_column) in MODEL_COLUMNS.items():
            probabilities = predictions[probability_column].to_numpy()
            fpr, tpr, thresholds = roc_curve(y_true, probabilities, drop_intermediate=False)
            models.append(
                {
                    "model": name,
                    "auc": float(roc_auc_score(y_true, probabilities)),
                    "fpr": [float(value) for value in fpr],
                    "tpr": [float(value) for value in tpr],
                    # sklearn's initial +inf threshold means predict every row negative.
                    "thresholds": [
                        float(value) if math.isfinite(float(value)) else None
                        for value in thresholds
                    ],
                    "sample_count": int(len(predictions)),
                }
            )
        return {
            "available": True,
            "data": {"sample_count": int(len(predictions)), "positive_label": 1, "models": models},
            "source": TEST_PREDICTIONS_PATH.name,
        }

evaluation_service = EvaluationService()
