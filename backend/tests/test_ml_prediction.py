"""
Unit tests for ML Model Loading and Prediction Service.
Run command: python -m unittest backend/tests/test_ml_prediction.py
"""

import os
import unittest
import pandas as pd
import numpy as np

from backend.app.ml.model_loader import (
    load_model_pipeline,
    load_model_metadata,
    get_artifact_paths,
)
from backend.app.ml.predict import (
    MLInferenceService,
    predict_road_blockage,
    validate_inference_input,
)


class TestMLPrediction(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Prepare sample valid feature data (excluding road_id, blockage_probability, blocked)."""
        cls.valid_feature_row = {
            "rainfall_mm": 180.5,
            "flood_level": 0.65,
            "elevation_m": 120.0,
            "road_type": "Local Road",
            "historical_blockages": 5,
            "traffic_density": 1100.0,
            "disaster_intensity": 0.70,
            "distance_to_waterbody_km": 1.2,
            "road_condition": 0.55,
        }

    def test_model_artifact_loading(self):
        """
        Verify:
        - model file exists
        - model loads successfully
        - loaded object can perform prediction
        """
        model_path, metadata_path = get_artifact_paths()
        self.assertTrue(
            os.path.exists(model_path),
            f"Model artifact pipeline missing at {model_path}!",
        )
        self.assertTrue(
            os.path.exists(metadata_path),
            f"Model metadata missing at {metadata_path}!",
        )

        pipeline = load_model_pipeline()
        metadata = load_model_metadata()

        self.assertIsNotNone(pipeline)
        self.assertIsNotNone(metadata)
        self.assertIn("model_name", metadata)

        # Test that loaded pipeline object can perform prediction directly
        df_single = pd.DataFrame([self.valid_feature_row])
        raw_pred = pipeline.predict(df_single)
        self.assertIn(raw_pred[0], [0, 1])

    def test_ml_prediction_output_properties(self):
        """
        Verify:
        - predicted class is binary (0 or 1)
        - blockage_probability is a float between 0.0 and 1.0
        - prediction works using valid feature data without requiring road_id/blockage_probability/blocked
        """
        service = MLInferenceService()
        result_df = service.predict_road_blockage(self.valid_feature_row)

        self.assertEqual(len(result_df), 1)
        self.assertIn("predicted_blocked", result_df.columns)
        self.assertIn("blockage_probability", result_df.columns)

        pred_class = result_df["predicted_blocked"].iloc[0]
        prob = float(result_df["blockage_probability"].iloc[0])

        # Binary class assertion
        self.assertIn(pred_class, [0, 1])
        self.assertIsInstance(int(pred_class), int)

        # Probability bounds assertion
        self.assertIsInstance(prob, float)
        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)

    def test_invalid_feature_input_error(self):
        """Verify that invalid/missing ML features produce a clear validation error."""
        invalid_input = self.valid_feature_row.copy()
        del invalid_input["rainfall_mm"]  # Remove required feature

        with self.assertRaises(ValueError) as cm:
            predict_road_blockage(invalid_input, is_expected_test_failure=True)

        self.assertIn("rainfall_mm", str(cm.exception))


if __name__ == "__main__":
    unittest.main()
