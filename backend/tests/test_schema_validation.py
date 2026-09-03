"""
Unit tests for Schema Validation and Expected Failure Logging.
Run command: python -m unittest backend/tests/test_schema_validation.py
"""

import unittest
import pandas as pd
import numpy as np

from backend.app.ml.preprocessing import validate_data


class TestSchemaValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Create sample valid dataframe."""
        cls.valid_df = pd.DataFrame(
            {
                "road_id": ["R00001"],
                "rainfall_mm": [120.0],
                "flood_level": [0.4],
                "elevation_m": [300.0],
                "road_type": ["Main Road"],
                "historical_blockages": [2],
                "traffic_density": [800.0],
                "disaster_intensity": [0.5],
                "distance_to_waterbody_km": [2.5],
                "road_condition": [0.8],
                "blockage_probability": [0.35],
                "blocked": [0],
            }
        )

    def test_valid_schema_pass(self):
        """Verify that a valid DataFrame passes validation without error."""
        result = validate_data(self.valid_df)
        self.assertTrue(result)

    def test_missing_column_expected_failure_logging(self):
        """
        Verify that missing required features (e.g. rainfall_mm) raise a ValueError
        and emit an [EXPECTED] test tag rather than an alarming raw error.
        """
        invalid_df = self.valid_df.drop(columns=["rainfall_mm"])

        with self.assertRaises(ValueError) as cm:
            validate_data(invalid_df, is_expected_test_failure=True)

        self.assertIn("rainfall_mm", str(cm.exception))

    def test_empty_dataframe_expected_failure(self):
        """Verify empty DataFrame raises ValueError with expected failure handling."""
        empty_df = pd.DataFrame()

        with self.assertRaises(ValueError) as cm:
            validate_data(empty_df, is_expected_test_failure=True)

        self.assertIn("empty", str(cm.exception).lower())


if __name__ == "__main__":
    unittest.main()
