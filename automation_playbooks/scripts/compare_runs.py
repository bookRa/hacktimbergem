from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple


def _load_metadata(path: str) -> Dict:
    metadata_file = Path(path) / "metadata.json"
    if not metadata_file.exists():
        raise FileNotFoundError(f"metadata.json not found in {path}")
    return json.loads(metadata_file.read_text(encoding="utf-8"))


def _diff_dicts(
    baseline: Dict, candidate: Dict, keys: List[str]
) -> List[Tuple[str, str, str]]:
    diffs: List[Tuple[str, str, str]] = []
    for key in keys:
        left = str(baseline.get(key, ""))
        right = str(candidate.get(key, ""))
        if left != right:
            diffs.append((key, left, right))
    return diffs


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compare two automation run outputs using metadata.json."
    )
    parser.add_argument("--baseline", required=True, help="Path to baseline run dir.")
    parser.add_argument("--candidate", required=True, help="Path to candidate run dir.")
    parser.add_argument(
        "--keys",
        nargs="+",
        default=["stage", "provider", "model", "environment"],
        help="Metadata keys to compare.",
    )
    args = parser.parse_args()

    baseline_meta = _load_metadata(args.baseline)
    candidate_meta = _load_metadata(args.candidate)
    diffs = _diff_dicts(baseline_meta, candidate_meta, args.keys)

    print("=== Automation Run Comparison ===")
    print(f"Baseline : {args.baseline}")
    print(f"Candidate: {args.candidate}")
    if not diffs:
        print("No differences detected for requested keys.")
        return 0

    print("\nDifferences:")
    for key, left, right in diffs:
        print(f"- {key}: baseline='{left}' vs candidate='{right}'")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

