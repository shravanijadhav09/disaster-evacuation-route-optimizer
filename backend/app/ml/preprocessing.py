"""
Preprocessing and Data Validation Module for Disaster Evacuation Route Optimizer.
Handles data loading, schema validation, feature selection, ColumnTransformer creation,
and 70/15/15 stratified dataset splitting.
"""

import os
import logging
from typing import Tuple, Dict, Any, List
import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)

# Feature Definition Schema
TARGET_COLUMN = "blocked"
DROP_COLUMNS = ["road_id", "blockage_probability"]

CATEGORICAL_FEATURES = ["road_type"]

NUMERICAL_FEATURES = [
    "rainfall_mm",
    "flood_level",
    "elevation_m",
    "historical_blockages",
    "traffic_density",
    "disaster_intensity",
    "distance_to_waterbody_km",
    "road_condition",
]

ALL_REQUIRED_COLUMNS = (
    ["road_id", "blockage_probability", TARGET_COLUMN]
    + CATEGORICAL_FEATURES
    + NUMERICAL_FEATURES
)

FEATURE_COLUMNS = CATEGORICAL_FEATURES + NUMERICAL_FEATURES


def load_raw_data(data_path: str) -> pd.DataFrame:
    """
    Load raw CSV dataset from specified path.
    """
    if not os.path.exists(data_path):
        error_msg = f"Dataset file not found at path: {data_path}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

    logger.info(f"Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)
    logger.info(f"Loaded dataset with shape {df.shape}")
    return df


def validate_data(df: pd.DataFrame, is_expected_test_failure: bool = False) -> bool:
    """
    Validate that all required columns exist in the DataFrame.
    """
    if df.empty:
        error_msg = "DataFrame is empty."
        if is_expected_test_failure:
            logger.info("[EXPECTED] Schema validation correctly rejected empty DataFrame.")
        else:
            logger.error(f"Data validation failed! {error_msg}")
        raise ValueError(error_msg)

    missing_cols = [col for col in ALL_REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        error_msg = f"Missing required columns: {missing_cols}"
        if is_expected_test_failure:
            logger.info(f"[EXPECTED] Schema validation correctly rejected missing columns: {missing_cols}")
        else:
            logger.error(f"Data validation failed! {error_msg}")
        raise ValueError(error_msg)

    logger.info("Data validation passed successfully. All required columns present.")
    return True


def separate_features_target(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Separate feature matrix X and target vector y.
    Strictly drops road_id and blockage_probability (data leakage prevention).
    """
    validate_data(df)

    # Features: exclude road_id, blockage_probability, and blocked
    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].copy()

    logger.info(f"Separated X matrix shape: {X.shape}, y vector shape: {y.shape}")
    return X, y


def create_preprocessor() -> ColumnTransformer:
    """
    Construct sklearn ColumnTransformer for categorical and numerical features.
    - OneHotEncoder(handle_unknown='ignore', sparse_output=False) for road_type
    - StandardScaler() for numerical features
    """
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
            ("num", StandardScaler(), NUMERICAL_FEATURES),
        ],
        remainder="drop",
    )
    logger.info("Created sklearn ColumnTransformer for road_type and numerical features.")
    return preprocessor


def prepare_data_splits(
    data_path: str, random_state: int = 42
) -> Tuple[
    pd.DataFrame,
    pd.DataFrame,
    pd.DataFrame,
    pd.Series,
    pd.Series,
    pd.Series,
    ColumnTransformer,
    Dict[str, Any],
]:
    """
    Load data, separate X and y, build preprocessor, and perform stratified 70/15/15 train/val/test splits.
    Returns: (X_train, X_val, X_test, y_train, y_val, y_test, preprocessor, info_dict)
    """
    df = load_raw_data(data_path)
    X, y = separate_features_target(df)

    # 1st split: 70% Train, 30% Temp (Val + Test)
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=random_state, stratify=y
    )

    # 2nd split: Divide 30% Temp into 15% Val and 15% Test (50/50 split of Temp)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=random_state, stratify=y_temp
    )

    preprocessor = create_preprocessor()

    info_dict = {
        "total_samples": len(df),
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "target_distribution_overall": y.value_counts(normalize=True).to_dict(),
        "target_distribution_train": y_train.value_counts(normalize=True).to_dict(),
        "target_distribution_val": y_val.value_counts(normalize=True).to_dict(),
        "target_distribution_test": y_test.value_counts(normalize=True).to_dict(),
    }

    logger.info(
        f"Data splits created successfully (Stratified 70/15/15): "
        f"Train={len(X_train)} (70%), Val={len(X_val)} (15%), Test={len(X_test)} (15%)"
    )

    return X_train, X_val, X_test, y_train, y_val, y_test, preprocessor, info_dict
