"""
Training Script for Disaster Evacuation Route Optimizer ML Pipeline.
Run command: python -m backend.app.ml.train

Trains Logistic Regression baseline and Random Forest primary models.
Evaluates models on Validation set, selects superior model based on Recall and F1 for blocked=1,
evaluates ONCE on untouched Test set, and saves model pipeline (.joblib) and metadata (.json).
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Tuple
import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

from backend.app.ml.preprocessing import (
    prepare_data_splits,
    FEATURE_COLUMNS,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    TARGET_COLUMN,
)
from backend.app.ml.evaluate import evaluate_model
from backend.app.ml.model_loader import (
    DEFAULT_ARTIFACTS_DIR,
    MODEL_FILENAME,
    METADATA_FILENAME,
)

logger = logging.getLogger(__name__)

# Default dataset path relative to repository root
DEFAULT_DATA_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "disaster_road_risk_dataset.csv"
    )
)
RANDOM_STATE = 42


def train_and_select_model(
    data_path: str = DEFAULT_DATA_PATH,
    artifacts_dir: str = DEFAULT_ARTIFACTS_DIR,
    random_state: int = RANDOM_STATE,
) -> Tuple[Pipeline, Dict[str, Any]]:
    """
    Main training execution function.
    """
    os.makedirs(artifacts_dir, exist_ok=True)
    logger.info(f"Starting ML Training Pipeline. Data path: {data_path}")

    # 1. Load and Split Data (70/15/15 Stratified)
    (
        X_train,
        X_val,
        X_test,
        y_train,
        y_val,
        y_test,
        preprocessor,
        data_info,
    ) = prepare_data_splits(data_path, random_state=random_state)

    # 2. Define Candidate Models
    models = {
        "LogisticRegression": LogisticRegression(
            random_state=random_state, max_iter=1000
        ),
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=100,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1,
        ),
    }

    fitted_pipelines: Dict[str, Pipeline] = {}
    val_metrics: Dict[str, Dict[str, Any]] = {}

    # 3. Train and Evaluate Models on Validation Set
    for name, model in models.items():
        logger.info(f"Training {name} pipeline on {len(X_train)} training samples...")
        pipeline = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("classifier", model),
            ]
        )
        pipeline.fit(X_train, y_train)

        metrics = evaluate_model(
            pipeline, X_val, y_val, model_name=name, split_name="Validation"
        )
        fitted_pipelines[name] = pipeline
        val_metrics[name] = metrics

    # 4. Model Selection Strategy
    # Select based on primary emergency metrics: Recall and F1 for blocked=1
    selected_name = max(
        val_metrics.keys(),
        key=lambda k: (
            val_metrics[k]["blocked_1_recall"],
            val_metrics[k]["blocked_1_f1"],
            val_metrics[k]["roc_auc"],
        ),
    )

    selected_pipeline = fitted_pipelines[selected_name]
    logger.info("=" * 60)
    logger.info(f"SELECTED MODEL ON VALIDATION SET: {selected_name}")
    logger.info(
        f"Validation Recall (blocked=1): {val_metrics[selected_name]['blocked_1_recall']:.4f}"
    )
    logger.info(
        f"Validation F1 (blocked=1)    : {val_metrics[selected_name]['blocked_1_f1']:.4f}"
    )
    logger.info("=" * 60)

    # 5. Untouched Test Set Evaluation (EVALUATED EXACTLY ONCE AFTER SELECTION)
    logger.info("Evaluating selected model ONCE on the untouched Test set...")
    test_metrics = evaluate_model(
        selected_pipeline, X_test, y_test, model_name=selected_name, split_name="Test"
    )

    # 6. Save Pipeline Artifact using joblib
    model_save_path = os.path.join(artifacts_dir, MODEL_FILENAME)
    joblib.dump(selected_pipeline, model_save_path)
    logger.info(f"Saved trained model pipeline to {model_save_path}")

    # 7. Create and Save Metadata
    from datetime import timezone
    training_timestamp = datetime.now(timezone.utc).isoformat()

    metadata = {
        "model_name": selected_name,
        "training_date": training_timestamp,
        "random_state": random_state,
        "target_column": TARGET_COLUMN,
        "categorical_features": CATEGORICAL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "all_feature_columns": FEATURE_COLUMNS,
        "dropped_columns": ["road_id", "blockage_probability"],
        "dataset_info": data_info,
        "validation_metrics_all_models": val_metrics,
        "selected_model_validation_metrics": val_metrics[selected_name],
        "selected_model_test_metrics": test_metrics,
        "model_parameters": selected_pipeline.named_steps["classifier"].get_params(),
    }

    metadata_save_path = os.path.join(artifacts_dir, METADATA_FILENAME)
    with open(metadata_save_path, "w") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved model metadata to {metadata_save_path}")

    return selected_pipeline, metadata


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )
    pipeline, meta = train_and_select_model()
    print("\n--- TRAINING PIPELINE COMPLETE ---")
    print(f"Selected Model : {meta['model_name']}")
    print(f"Model Artifact : {os.path.join(DEFAULT_ARTIFACTS_DIR, MODEL_FILENAME)}")
    print(f"Metadata File  : {os.path.join(DEFAULT_ARTIFACTS_DIR, METADATA_FILENAME)}")
