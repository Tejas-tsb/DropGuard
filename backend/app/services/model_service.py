"""Load and verify the supplied academic-risk model pipeline."""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.core.config import DATASET_PATH, METADATA_PATH, MODEL_PATH

logger = logging.getLogger(__name__)
FORBIDDEN_FEATURES = {"G3", "academic_risk"}


@dataclass(frozen=True)
class ModelVerification:
    model_name: str
    model_type: str
    feature_count: int
    sample_prediction: int
    sample_probabilities: dict[str, float] | None
    target_definition: str
    prediction_stage: str


class ModelService:
    """Owns the loaded joblib pipeline and its metadata-defined input schema."""

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        metadata_path: Path = METADATA_PATH,
        dataset_path: Path = DATASET_PATH,
    ) -> None:
        self.model_path = model_path
        self.metadata_path = metadata_path
        self.dataset_path = dataset_path
        self._pipeline: Any | None = None
        self._feature_names: list[str] | None = None
        self._metadata: dict[str, Any] | None = None
        self._load_error: str | None = None
        self._load_lock = threading.RLock()

    @property
    def is_loaded(self) -> bool:
        return self._pipeline is not None

    @property
    def load_error(self) -> str | None:
        return self._load_error

    def load(self) -> None:
        """Load the supplied pipeline and validate its metadata schema."""
        with self._load_lock:
            if self.is_loaded:
                return
            try:
                with self.metadata_path.open(encoding="utf-8") as metadata_file:
                    metadata = json.load(metadata_file)

                features = metadata.get("input_features")
                if not isinstance(features, list) or len(features) != 32:
                    raise ValueError("metadata.json must define exactly 32 input_features")
                if len(set(features)) != len(features):
                    raise ValueError("metadata.json contains duplicate input features")
                forbidden = FORBIDDEN_FEATURES.intersection(features)
                if forbidden:
                    raise ValueError(
                        "Forbidden prediction input(s) present in metadata: "
                        + ", ".join(sorted(forbidden))
                    )
                if metadata.get("target_column") != "academic_risk":
                    raise ValueError("metadata target_column must be academic_risk")

                # Load the complete preprocessing and estimator pipeline as supplied.
                pipeline = joblib.load(self.model_path)
                if not callable(getattr(pipeline, "predict", None)):
                    raise TypeError("Loaded model does not expose predict()")

                self._pipeline = pipeline
                self._feature_names = features
                self._metadata = metadata
                self._load_error = None
                logger.info(
                    "Loaded supplied model pipeline from %s with %d metadata features",
                    self.model_path,
                    len(features),
                )
            except Exception as exc:
                self._load_error = f"{type(exc).__name__}: {exc}"
                logger.exception(
                    "Unable to load or validate supplied model at %s", self.model_path
                )
                raise

    @property
    def feature_names(self) -> list[str]:
        self.load()
        assert self._feature_names is not None
        return self._feature_names.copy()

    @property
    def metadata(self) -> dict[str, Any]:
        self.load()
        assert self._metadata is not None
        return self._metadata.copy()

    def predict(self, values: dict[str, Any]) -> tuple[int, float, float]:
        """Return model class, class-1 probability, and the model's boundary."""
        self.load()
        assert self._pipeline is not None
        assert self._feature_names is not None
        assert self._metadata is not None
        missing = [name for name in self._feature_names if name not in values]
        extras = sorted(set(values) - set(self._feature_names))
        if missing or extras:
            raise ValueError(f"Input schema mismatch; missing={missing}, extra={extras}")

        sample = pd.DataFrame(
            [{name: values[name] for name in self._feature_names}],
            columns=self._feature_names,
        )
        prediction_values = self._pipeline.predict(sample)
        probabilities = self._pipeline.predict_proba(sample)
        classes = list(self._pipeline.classes_)
        if len(prediction_values) != 1 or probabilities.shape[0] != 1:
            raise ValueError("Model did not return exactly one prediction")

        predicted_class = int(prediction_values[0])
        if predicted_class not in (0, 1):
            raise ValueError(f"Model returned unexpected academic-risk class: {predicted_class}")
        class_one_index = classes.index(1)
        risk_probability = float(probabilities[0, class_one_index])
        if not 0.0 <= risk_probability <= 1.0:
            raise ValueError("Model returned an invalid probability")
        if abs(float(probabilities[0].sum()) - 1.0) > 1e-6:
            raise ValueError("Model probabilities do not sum to 1")

        # sklearn's classifier predict() selects argmax(predict_proba()); class 0
        # wins an exact tie because it is first in classes_. This is not a tuned
        # intervention or counseling threshold.
        return predicted_class, risk_probability, 0.5

    def feature_importance(self) -> dict[str, Any]:
        """Return native RF importances and aggregate transformed columns by input."""
        self.load()
        assert self._pipeline is not None
        assert self._feature_names is not None

        named_steps = getattr(self._pipeline, "named_steps", {})
        preprocessor = named_steps.get("preprocessor")
        estimator = named_steps.get("classifier")
        if preprocessor is None or estimator is None:
            raise ValueError("The supplied pipeline does not expose expected named steps")
        importances = getattr(estimator, "feature_importances_", None)
        if importances is None:
            raise ValueError("The supplied estimator does not expose feature_importances_")

        transformed_names = list(preprocessor.get_feature_names_out())
        if len(transformed_names) != len(importances):
            raise ValueError("Feature-name and feature-importance lengths do not match")

        aggregated = {name: 0.0 for name in self._feature_names}
        transformed: list[dict[str, Any]] = []
        for transformed_name, raw_importance in zip(
            transformed_names, importances, strict=True
        ):
            importance = float(raw_importance)
            unprefixed = transformed_name.split("__", 1)[-1]
            matching_inputs = [
                name
                for name in self._feature_names
                if unprefixed == name or unprefixed.startswith(f"{name}_")
            ]
            original_feature = max(matching_inputs, key=len) if matching_inputs else None
            if original_feature is not None:
                aggregated[original_feature] += importance
            transformed.append(
                {
                    "transformed_feature": str(transformed_name),
                    "input_feature": original_feature,
                    "importance": importance,
                }
            )

        transformed.sort(key=lambda item: item["importance"], reverse=True)
        input_features = [
            {"feature": name, "importance": importance}
            for name, importance in aggregated.items()
        ]
        input_features.sort(key=lambda item: item["importance"], reverse=True)
        return {
            "method": "RandomForestClassifier.feature_importances_ (impurity-based)",
            "interpretation": (
                "Feature importance describes how the fitted model uses inputs. "
                "It is not a causal explanation and does not show that changing a "
                "feature would change a student's outcome."
            ),
            "input_feature_importance": input_features,
            "transformed_feature_importance": transformed,
        }

    def verify(self) -> ModelVerification:
        """Run one inference using only the 32 metadata-defined features."""
        self.load()
        assert self._pipeline is not None
        assert self._feature_names is not None
        assert self._metadata is not None

        frame = pd.read_csv(self.dataset_path, nrows=1)
        missing_columns = [name for name in self._feature_names if name not in frame.columns]
        if missing_columns:
            raise ValueError(
                "Dataset is missing metadata input feature(s): "
                + ", ".join(missing_columns)
            )

        # Select exactly metadata's input features. G3 and academic_risk are never
        # passed to the estimator, even though they exist in the supplied CSV.
        sample = frame.loc[:, self._feature_names]
        prediction_values = self._pipeline.predict(sample)
        if len(prediction_values) != 1:
            raise ValueError("Model predict() did not return exactly one result")
        prediction = int(prediction_values[0])
        if prediction not in (0, 1):
            raise ValueError(f"Model returned unexpected academic-risk class: {prediction}")

        probabilities: dict[str, float] | None = None
        predict_proba = getattr(self._pipeline, "predict_proba", None)
        if callable(predict_proba):
            probability_values = predict_proba(sample)
            classes = getattr(self._pipeline, "classes_", None)
            if probability_values.shape[0] != 1 or classes is None:
                raise ValueError("Model returned invalid class probabilities")
            probabilities = {
                str(int(label)): float(value)
                for label, value in zip(classes, probability_values[0], strict=True)
            }
            if any(value < 0.0 or value > 1.0 for value in probabilities.values()):
                raise ValueError("Model returned a probability outside [0, 1]")
            if abs(sum(probabilities.values()) - 1.0) > 1e-6:
                raise ValueError("Model probabilities do not sum to 1")

        return ModelVerification(
            model_name=self._metadata.get("model_name", "Supplied model"),
            model_type=type(self._pipeline).__name__,
            feature_count=len(self._feature_names),
            sample_prediction=prediction,
            sample_probabilities=probabilities,
            target_definition=self._metadata["target_definition"],
            prediction_stage=self._metadata["prediction_stage"],
        )


model_service = ModelService()
