"""
Evaluation Module for Disaster Evacuation Route Optimizer ML Pipeline.
Computes Accuracy, Precision, Recall, F1-score, ROC-AUC, and Confusion Matrix.
Specifically focuses on Recall and F1-score for the positive class (blocked=1).
"""

import logging
from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)

logger = logging.getLogger(__name__)


def evaluate_model(
    pipeline: Pipeline,
    X: pd.DataFrame,
    y: pd.Series,
    model_name: str = "Model",
    split_name: str = "Validation",
) -> Dict[str, Any]:
    """
    Evaluate a fitted sklearn Pipeline on dataset X, y.
    Computes accuracy, precision, recall, f1-score, roc-auc, and confusion matrix.
    """
    logger.info(f"Evaluating {model_name} on {split_name} set ({len(X)} samples)...")

    y_pred = pipeline.predict(X)

    if hasattr(pipeline, "predict_proba"):
        y_prob = pipeline.predict_proba(X)[:, 1]
    else:
        y_prob = y_pred

    acc = float(accuracy_score(y, y_pred))

    # Overall metrics
    prec_macro = float(precision_score(y, y_pred, average="macro", zero_division=0))
    rec_macro = float(recall_score(y, y_pred, average="macro", zero_division=0))
    f1_macro = float(f1_score(y, y_pred, average="macro", zero_division=0))

    prec_weighted = float(precision_score(y, y_pred, average="weighted", zero_division=0))
    rec_weighted = float(recall_score(y, y_pred, average="weighted", zero_division=0))
    f1_weighted = float(f1_score(y, y_pred, average="weighted", zero_division=0))

    # Class 1 (blocked=1) focused metrics
    prec_class1 = float(precision_score(y, y_pred, pos_label=1, zero_division=0))
    rec_class1 = float(recall_score(y, y_pred, pos_label=1, zero_division=0))
    f1_class1 = float(f1_score(y, y_pred, pos_label=1, zero_division=0))

    # Class 0 (blocked=0) metrics
    prec_class0 = float(precision_score(y, y_pred, pos_label=0, zero_division=0))
    rec_class0 = float(recall_score(y, y_pred, pos_label=0, zero_division=0))
    f1_class0 = float(f1_score(y, y_pred, pos_label=0, zero_division=0))

    # ROC AUC
    try:
        roc_auc = float(roc_auc_score(y, y_prob))
    except Exception as e:
        logger.warning(f"Could not compute ROC-AUC: {e}")
        roc_auc = 0.0

    # Confusion matrix: [[TN, FP], [FN, TP]]
    cm = confusion_matrix(y, y_pred)
    tn, fp, fn, tp = cm.ravel()

    metrics = {
        "model_name": model_name,
        "split_name": split_name,
        "sample_count": len(X),
        "accuracy": acc,
        "precision_macro": prec_macro,
        "recall_macro": rec_macro,
        "f1_macro": f1_macro,
        "precision_weighted": prec_weighted,
        "recall_weighted": rec_weighted,
        "f1_weighted": f1_weighted,
        "blocked_1_precision": prec_class1,
        "blocked_1_recall": rec_class1,
        "blocked_1_f1": f1_class1,
        "blocked_0_precision": prec_class0,
        "blocked_0_recall": rec_class0,
        "blocked_0_f1": f1_class0,
        "roc_auc": roc_auc,
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp),
            "raw_matrix": cm.tolist(),
        },
    }

    log_evaluation_summary(metrics)
    return metrics


def log_evaluation_summary(metrics: Dict[str, Any]) -> None:
    """
    Log evaluation metrics in a structured readable format.
    """
    model_name = metrics["model_name"]
    split_name = metrics["split_name"]
    cm = metrics["confusion_matrix"]

    logger.info("=" * 60)
    logger.info(f"EVALUATION RESULTS: {model_name} [{split_name} Set]")
    logger.info("=" * 60)
    logger.info(f"Accuracy                 : {metrics['accuracy']:.4f}")
    logger.info(f"ROC-AUC                  : {metrics['roc_auc']:.4f}")
    logger.info(f"Blocked (class=1) Recall : {metrics['blocked_1_recall']:.4f}  <-- PRIMARY DECISION METRIC")
    logger.info(f"Blocked (class=1) F1     : {metrics['blocked_1_f1']:.4f}  <-- PRIMARY DECISION METRIC")
    logger.info(f"Blocked (class=1) Prec   : {metrics['blocked_1_precision']:.4f}")
    logger.info(f"Macro F1-Score           : {metrics['f1_macro']:.4f}")
    logger.info(
        f"Confusion Matrix         : TN={cm['tn']}, FP={cm['fp']}, FN={cm['fn']}, TP={cm['tp']}"
    )
    logger.info("=" * 60)
