"""File storage utilities for atomic file operations.

Provides helpers for safe JSON file reads/writes with atomic replacement.
"""

import os
import json
from typing import Any, Dict, List


def atomic_write_json(path: str, data: Any) -> None:
    """
    Write JSON data to file atomically using temp file + rename.
    
    Args:
        path: Target file path
        data: Data to serialize as JSON
    """
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def read_json(path: str) -> Any:
    """
    Read JSON data from file.
    
    Args:
        path: File path
        
    Returns:
        Deserialized JSON data
        
    Raises:
        FileNotFoundError: If file doesn't exist
    """
    with open(path, "r") as f:
        return json.load(f)


def read_json_or_empty(path: str, default: Any = None) -> Any:
    """
    Read JSON data from file, returning default if file doesn't exist.
    
    Args:
        path: File path
        default: Value to return if file not found (defaults to empty list)
        
    Returns:
        Deserialized JSON data or default
    """
    if default is None:
        default = []
    
    if not os.path.exists(path):
        return default
    
    try:
        return read_json(path)
    except (json.JSONDecodeError, IOError):
        return default


__all__ = [
    "atomic_write_json",
    "read_json",
    "read_json_or_empty",
]



