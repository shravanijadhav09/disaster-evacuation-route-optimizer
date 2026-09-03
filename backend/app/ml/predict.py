"""
Inference Module for Disaster Evacuation Route Optimizer.
Provides functions for running predictions on single or batch road segments.
"""

import os
import sys
import logging
from typing import Union, List, Dict, Any, Optional
import pandas as pd
import numpy as np

from backend.app.ml.preprocessing import FEATURE_COLUMNS, CATEGORICAL_FEATURES, NUMERICAL_FEATURES
from backend.app.ml.model_loader import load_model_pipeline, load_model_metadata

logger = logging.getLogger(__name__)


def validate_inference_input(
    input_df: pd.DataFrame, is_expected_test_failure: bool = False
) -> pd.DataFrame:
    """
    Validate that input DataFrame contains all required feature columns.
    Excludes identifiers or target columns if present.
    """
    if input_df.empty:
        error_msg = "Inference failed: Input DataFrame is empty."
        if is_expected_test_failure:
            logger.info("[EXPECTED] Inference validation correctly rejected empty DataFrame.")
        else:
            logger.error(error_msg)
        raise ValueError(error_msg)

    missing_features = [col for col in FEATURE_COLUMNS if col not in input_df.columns]
    if missing_features:
        error_msg = f"Inference failed: Missing required feature columns: {missing_features}"
        if is_expected_test_failure:
            logger.info(
                f"[EXPECTED] Inference validation correctly rejected missing feature columns: {missing_features}"
            )
        else:
            logger.error(error_msg)
        raise ValueError(error_msg)

    # Return DataFrame containing only the feature columns in expected order
    return input_df[FEATURE_COLUMNS].copy()


class MLInferenceService:
    """
    ML Inference Service for loading trained sklearn pipeline and generating blockage predictions.
    """

    def __init__(self, artifacts_dir: Optional[str] = None):
        self.artifacts_dir = artifacts_dir
        self._pipeline = None

    @property
    def pipeline(self):
        if self._pipeline is None:
            self._pipeline = load_model_pipeline(self.artifacts_dir)
        return self._pipeline

    def predict_road_blockage(
        self,
        input_data: Union[pd.DataFrame, List[Dict[str, Any]], Dict[str, Any]],
        is_expected_test_failure: bool = False,
    ) -> pd.DataFrame:
        """
        Predict road blockage binary class (0=Open, 1=Blocked) and float blockage probability.
        """
        if isinstance(input_data, dict):
            df_raw = pd.DataFrame([input_data])
        elif isinstance(input_data, list):
            df_raw = pd.DataFrame(input_data)
        elif isinstance(input_data, pd.DataFrame):
            df_raw = input_data.copy()
        else:
            raise TypeError(f"Unsupported input type for prediction: {type(input_data)}")

        road_ids = df_raw["road_id"].values if "road_id" in df_raw.columns else None
        X_infer = validate_inference_input(
            df_raw, is_expected_test_failure=is_expected_test_failure
        )

        predictions = self.pipeline.predict(X_infer)

        if hasattr(self.pipeline, "predict_proba"):
            probabilities = self.pipeline.predict_proba(X_infer)[:, 1]
        else:
            probabilities = predictions.astype(float)

        output_df = pd.DataFrame()
        if road_ids is not None:
            output_df["road_id"] = road_ids

        output_df["predicted_blocked"] = predictions
        output_df["blockage_probability"] = np.round(probabilities, 4)
        output_df["status_label"] = np.where(predictions == 1, "Blocked", "Open")

        logger.info(f"Generated predictions for {len(output_df)} road segments.")
        return output_df


def predict_road_blockage(
    input_data: Union[pd.DataFrame, List[Dict[str, Any]], Dict[str, Any]],
    artifacts_dir: Optional[str] = None,
    is_expected_test_failure: bool = False,
) -> pd.DataFrame:
    """
    Convenience function for predicting road blockage.
    """
    service = MLInferenceService(artifacts_dir=artifacts_dir)
    return service.predict_road_blockage(
        input_data, is_expected_test_failure=is_expected_test_failure
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    logger.info("Executing sample inference test...")

    sample_road_data = [
        {
            "road_id": "TEST_R001",
            "rainfall_mm": 250.5,
            "flood_level": 0.85,
            "elevation_m": 45.0,
            "road_type": "Bridge",
            "historical_blockages": 12,
            "traffic_density": 1400.0,
            "disaster_intensity": 0.90,
            "distance_to_waterbody_km": 0.20,
            "road_condition": 0.40,
        },
        {
            "road_id": "TEST_R002",
            "rainfall_mm": 20.0,
            "flood_level": 0.05,
            "elevation_m": 650.0,
            "road_type": "Highway",
            "historical_blockages": 1,
            "traffic_density": 450.0,
            "disaster_intensity": 0.15,
            "distance_to_waterbody_km": 12.50,
            "road_condition": 0.92,
        },
    ]

    results = predict_road_blockage(sample_road_data)
    print("\n--- SAMPLE INFERENCE RESULTS ---")
    print(results.to_string(index=False))
