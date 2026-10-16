"""Derma-Safe AI backend — leakage-aware skin-risk screening API."""

from __future__ import annotations

import importlib.util
import os

__version__ = "1.2.0"


def _select_keras_backend() -> str:
    """Pick a Keras 3 backend before Keras is imported anywhere.

    TensorFlow publishes no wheel for some supported interpreters (Python 3.14
    among them). PyTorch is already a hard dependency of the pipeline, and the
    V5 weights are backend-agnostic, so torch is the fallback.
    """
    chosen = os.environ.get("KERAS_BACKEND")
    if not chosen:
        if importlib.util.find_spec("tensorflow") is not None:
            chosen = "tensorflow"
        elif importlib.util.find_spec("torch") is not None:
            chosen = "torch"
        else:
            chosen = "tensorflow"
        os.environ["KERAS_BACKEND"] = chosen
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    return chosen


KERAS_BACKEND = _select_keras_backend()
