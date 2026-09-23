"""Validate provenance, split by patient, reject duplicate leakage, write an audit.

Run from workspace root: python -m ml.data.prepare --input ... --output ...
No dataset is downloaded and no patient identity is inferred.
"""
from __future__ import annotations

import argparse
import csv
import random
from collections import Counter
from pathlib import Path

from ml.common import LABELS, read_manifest, write_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=20260923)
    args = parser.parse_args()
    rows = read_manifest(args.input, require_splits=False)
    patients = sorted({row["patient_id"] for row in rows})
    if len(patients) < 20:
        raise SystemExit("At least 20 patient groups are required for this research split; this is not sufficient evidence for clinical validation.")
    random.Random(args.seed).shuffle(patients)
    train_end, validation_end = round(len(patients) * 0.70), round(len(patients) * 0.85)
    mapping = {patient: "train" if index < train_end else "validation" if index < validation_end else "test" for index, patient in enumerate(patients)}
    duplicate_splits = {}
    for row in rows:
        row["split"] = mapping[row["patient_id"]]
        if duplicate_splits.setdefault(row["sha256"], row["split"]) != row["split"]:
            raise SystemExit("Exact duplicate connects different patients across splits; resolve patient grouping before training.")
        row["path"] = row.pop("resolved_path")
        if row.get("resolved_mask_path"):
            row["mask_path"] = row.pop("resolved_mask_path")
    support = {split: dict(Counter(row["label"] for row in rows if row["split"] == split)) for split in ("train", "validation", "test")}
    if any(set(counts) != set(LABELS) for counts in support.values()):
        raise SystemExit("Every split must cover all six labels. Review grouping/distribution; do not silently relabel data.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fields = sorted({key for row in rows for key in row})
    with args.output.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    write_json(args.output.with_suffix(".audit.json"), {"seed": args.seed, "patients": len(patients), "images": len(rows), "support": support, "patientLeakage": False, "exactDuplicateLeakage": False, "nearDuplicateReview": "REQUIRED", "clinicalValidation": False})


if __name__ == "__main__":
    main()
