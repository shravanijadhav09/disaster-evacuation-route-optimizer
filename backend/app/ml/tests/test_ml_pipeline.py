"""
Unit tests for Disaster Evacuation Route Optimizer ML Pipeline.
Run command: python -m unittest discover -s backend/app/ml/tests -p "test_*.py"
"""

import os
import unittest
import pandas as pd
import numpy as np

from backend.app.ml.preprocessing import (
    separate_features_target,
    validate_data,
    create_preprocessor,
    FEATURE_COLUMNS,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    TARGET_COLUMN,
    DROP_COLUMNS,
)
from backend.app.ml.model_loader import load_model_pipeline, load_model_metadata
from backend.app.ml.predict import predict_road_blockage


class TestMLPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Create mock synthetic dataset matching exact dataset schema."""
        np.random.seed(42)
        n_samples = 100
        cls.sample_df = pd.DataFrame(
            {
                "road_id": [f"R{i:05d}" for i in range(1, n_samples + 1)],
                "rainfall_mm": np.random.uniform(0, 300, n_samples),
                "flood_level": np.random.uniform(0, 1, n_samples),
                "elevation_m": np.random.uniform(10, 800, n_samples),
                "road_type": np.random.choice(
                    ["Local Road", "Main Road", "Rural Road", "Highway", "Bridge"],
                    n_samples,
                ),
                "historical_blockages": np.random.randint(0, 20, n_samples),
                "traffic_density": np.random.uniform(10, 2000, n_samples),
                "disaster_intensity": np.random.uniform(0, 1, n_samples),
                "distance_to_waterbody_km": np.random.uniform(0.1, 20, n_samples),
                "road_condition": np.random.uniform(0.1, 1, n_samples),
                "blockage_probability": np.random.uniform(0, 1, n_samples),
                "blocked": np.random.choice([0, 1], n_samples),
            }
        )

    def test_feature_selection(self):
        """Test feature separation and dropped leakage columns."""
        X, y = separate_features_target(self.sample_df)

        # Assert dropped columns are NOT in X
        for col in DROP_COLUMNS:
            self.assertNotIn(col, X.columns, f"Column '{col}' should be dropped!")

        # Assert target is NOT in X
        self.assertNotIn(TARGET_COLUMN, X.columns)

        # Assert all feature columns match defined feature list
        self.assertListEqual(list(X.columns), FEATURE_COLUMNS)
        self.assertEqual(len(y), len(self.sample_df))

    def test_schema_validation_error(self):
        """Test that missing required columns raise ValueError (with expected test tag)."""
        invalid_df = self.sample_df.drop(columns=["rainfall_mm"])
        with self.assertRaises(ValueError):
            validate_data(invalid_df, is_expected_test_failure=True)

    def test_preprocessing_transformation(self):
        """Test ColumnTransformer fits and transforms input data."""
        X, _ = separate_features_target(self.sample_df)
        preprocessor = create_preprocessor()

        transformed_matrix = preprocessor.fit_transform(X)

        # 5 categories for road_type + 8 numerical features = 13 transformed features
        expected_features = len(CATEGORICAL_FEATURES) * 5 + len(NUMERICAL_FEATURES)
        self.assertEqual(transformed_matrix.shape[0], len(X))
        self.assertEqual(transformed_matrix.shape[1], expected_features)
        self.assertFalse(np.isnan(transformed_matrix).any())

    def test_model_loading(self):
        """Test loading saved pipeline and metadata artifacts."""
        pipeline = load_model_pipeline()
        metadata = load_model_metadata()

        self.assertIsNotNone(pipeline)
        self.assertIn("model_name", metadata)
        self.assertIn("target_column", metadata)
        self.assertEqual(metadata["target_column"], "blocked")

    def test_prediction_output(self):
        """Test inference output structure, probability bounds, and binary class types."""
        test_inputs = self.sample_df.head(5).to_dict(orient="records")

        results = predict_road_blockage(test_inputs)

        # Check required output columns
        self.assertIn("road_id", results.columns)
        self.assertIn("predicted_blocked", results.columns)
        self.assertIn("blockage_probability", results.columns)
        self.assertIn("status_label", results.columns)

        # Check output length
        self.assertEqual(len(results), 5)

        # Check values and types
        predictions = results["predicted_blocked"].values
        probabilities = results["blockage_probability"].values

        self.assertTrue(all(pred in [0, 1] for pred in predictions))
        self.assertTrue(all(0.0 <= prob <= 1.0 for prob in probabilities))


if __name__ == "__main__":
    unittest.main()
