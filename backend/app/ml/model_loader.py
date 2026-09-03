"""
Model Loader Module for Disaster Evacuation Route Optimizer.
Safely loads trained sklearn pipeline artifacts (.joblib) and model metadata (.json).
"""

import os
import json
import logging
from typing import Tuple, Dict, Any, Optional
import joblib
from sklearn.pipeline import Pipeline

logger = logging.getLogger(__name__)

DEFAULT_ARTIFACTS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "artifacts"
)
MODEL_FILENAME = "best_model_pipeline.joblib"
METADATA_FILENAME = "model_metadata.json"


def get_artifact_paths(artifacts_dir: Optional[str] = None) -> Tuple[str, str]:
    """
    Resolve model pipeline and metadata paths.
    """
    target_dir = artifacts_dir or DEFAULT_ARTIFACTS_DIR
    model_path = os.path.join(target_dir, MODEL_FILENAME)
    metadata_path = os.path.join(target_dir, METADATA_FILENAME)
    return model_path, metadata_path


def load_model_pipeline(artifacts_dir: Optional[str] = None) -> Pipeline:
    """
    Load saved sklearn Pipeline from joblib artifact.
    """
    model_path, _ = get_artifact_paths(artifacts_dir)

    if not os.path.exists(model_path):
        error_msg = f"Model artifact not found at path: {model_path}. Train model first!"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

    try:
        logger.info(f"Loading model pipeline from {model_path}...")
        pipeline = joblib.load(model_path)
        logger.info(f"Successfully loaded pipeline: {type(pipeline).__name__}")
        return pipeline
    except Exception as e:
        error_msg = f"Failed to load model pipeline from {model_path}: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e


def load_model_metadata(artifacts_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Load model metadata JSON document.
    """
    _, metadata_path = get_artifact_paths(artifacts_dir)

    if not os.path.exists(metadata_path):
        error_msg = f"Model metadata not found at path: {metadata_path}."
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

    try:
        logger.info(f"Loading model metadata from {metadata_path}...")
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        logger.info(f"Successfully loaded metadata for model: {metadata.get('model_name')}")
        return metadata
    except Exception as e:
        error_msg = f"Failed to load metadata from {metadata_path}: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e


def load_model_and_metadata(
    artifacts_dir: Optional[str] = None,
) -> Tuple[Pipeline, Dict[str, Any]]:
    """
    Load both model pipeline and metadata simultaneously.
    """
    pipeline = load_model_pipeline(artifacts_dir)
    metadata = load_model_metadata(artifacts_dir)
    return pipeline, metadata
