"""Cached, read-only analytics over the supplied student performance CSV."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import pandas as pd

from app.core.config import DATASET_PATH, METADATA_PATH


@lru_cache(maxsize=1)
def _load_dataset() -> pd.DataFrame:
    with METADATA_PATH.open(encoding="utf-8") as metadata_file:
        metadata = json.load(metadata_file)
    frame = pd.read_csv(DATASET_PATH)
    required = set(metadata["input_features"]) | {"G3", "academic_risk"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Supplied dataset is missing columns: {sorted(missing)}")
    if frame["academic_risk"].isna().any():
        raise ValueError("Supplied dataset has missing academic_risk labels")
    return frame


class DatasetService:
    """Calculate descriptive summaries from the actual supplied CSV."""

    @property
    def frame(self) -> pd.DataFrame:
        return _load_dataset()

    @property
    def feature_names(self) -> list[str]:
        with METADATA_PATH.open(encoding="utf-8") as metadata_file:
            return json.load(metadata_file)["input_features"]

    def overview(self) -> dict[str, Any]:
        frame = self.frame
        counts = frame["academic_risk"].value_counts().sort_index()
        return {
            "dataset": DATASET_PATH.name,
            "row_count": int(len(frame)),
            "input_feature_count": len(self.feature_names),
            "missing_cell_count": int(frame.isna().sum().sum()),
            "target": "academic_risk",
            "target_definition": "1 if G3 < 10, otherwise 0",
            "target_is_dropout": False,
            "academic_risk_distribution": [
                {
                    "class": int(label),
                    "count": int(count),
                    "percentage": float(count / len(frame) * 100),
                }
                for label, count in counts.items()
            ],
            "source": "Supplied dataset labels; descriptive statistics only",
        }

    def distribution(self) -> dict[str, Any]:
        frame = self.frame
        categorical_features = [
            name for name in self.feature_names if not pd.api.types.is_numeric_dtype(frame[name])
        ]
        numeric_features = [
            name for name in self.feature_names if pd.api.types.is_numeric_dtype(frame[name])
        ]

        def value_counts(feature: str) -> list[dict[str, Any]]:
            counts = frame[feature].value_counts(dropna=False, sort=False)
            return [
                {
                    "value": None if pd.isna(value) else value.item() if hasattr(value, "item") else value,
                    "count": int(count),
                }
                for value, count in counts.items()
            ]

        return {
            "row_count": int(len(frame)),
            "categorical": {feature: value_counts(feature) for feature in categorical_features},
            "numeric": {feature: value_counts(feature) for feature in numeric_features},
            "academic_risk": value_counts("academic_risk"),
            "source": "Observed frequencies in the supplied dataset",
        }

    def grades(self) -> dict[str, Any]:
        frame = self.frame
        grade_columns = ["G1", "G2", "G3"]
        summary = {}
        for grade in grade_columns:
            values = frame[grade]
            summary[grade] = {
                "count": int(values.count()),
                "mean": float(values.mean()),
                "median": float(values.median()),
                "standard_deviation": float(values.std()),
                "minimum": int(values.min()),
                "maximum": int(values.max()),
            }

        by_target = []
        for label, group in frame.groupby("academic_risk", sort=True):
            by_target.append(
                {
                    "academic_risk": int(label),
                    "student_count": int(len(group)),
                    "grade_means": {
                        grade: float(group[grade].mean()) for grade in grade_columns
                    },
                }
            )
        return {
            "grades": summary,
            "by_academic_risk": by_target,
            "note": (
                "G3 and academic_risk are included here for descriptive dataset "
                "analytics. Neither is accepted as a prediction input."
            ),
        }

    def factors(self) -> dict[str, Any]:
        frame = self.frame
        factors: dict[str, list[dict[str, Any]]] = {}
        for feature in self.feature_names:
            grouped = frame.groupby(feature, dropna=False, sort=True)["academic_risk"]
            rows = []
            for value, target in grouped:
                rows.append(
                    {
                        "value": None if pd.isna(value) else value.item() if hasattr(value, "item") else value,
                        "student_count": int(target.size),
                        "academic_risk_count": int(target.sum()),
                        "academic_risk_rate": float(target.mean()),
                    }
                )
            factors[feature] = rows
        return {
            "target_definition": "1 if G3 < 10, otherwise 0",
            "factors": factors,
            "interpretation": (
                "These are unadjusted group summaries in the supplied dataset. "
                "They describe association and do not establish causes."
            ),
        }


dataset_service = DatasetService()
