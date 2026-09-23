from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

LABELS = ["SUSPICIOUS_PIGMENTED", "NEVUS", "ECZEMA_DERMATITIS", "PSORIASIS", "ACNE", "FUNGAL_INFECTION"]
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_manifest(path: Path, require_splits: bool = True) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))
    if not rows:
        raise ValueError("Dataset manifest is empty; no training or medical data is bundled")
    required = ["image_id", "path", "patient_id", "label", "domain", "source_url", "license", "license_reviewed"]
    seen_ids, patient_splits, duplicate_splits = set(), {}, {}
    for row in rows:
        if any(not row.get(key) for key in required):
            raise ValueError("Manifest lacks required provenance or patient grouping fields")
        if row["image_id"] in seen_ids:
            raise ValueError("Duplicate image_id")
        seen_ids.add(row["image_id"])
        if row["label"] not in LABELS or row["domain"] not in ("clinical", "dermoscopic"):
            raise ValueError("Unknown clinical label or input domain")
        if row["license_reviewed"].lower() != "true":
            raise ValueError("Dataset license has not been explicitly reviewed")
        image = (path.parent / row["path"]).resolve()
        if not image.is_file():
            raise ValueError("Image file is missing")
        calculated = sha256(image)
        if row.get("sha256") and row["sha256"] != calculated:
            raise ValueError("Image checksum changed")
        row["sha256"] = calculated
        row["resolved_path"] = str(image)
        if row.get("mask_path"):
            mask = (path.parent / row["mask_path"]).resolve()
            if not mask.is_file():
                raise ValueError("Ground-truth segmentation mask is missing")
            row["resolved_mask_path"] = str(mask)
        if require_splits:
            split = row.get("split")
            if split not in ("train", "validation", "test"):
                raise ValueError("Explicit train/validation/test split required")
            for collection, key in [(patient_splits, row["patient_id"]), (duplicate_splits, calculated)]:
                old = collection.setdefault(key, split)
                if old != split:
                    raise ValueError("Patient or exact-image leakage across splits")
    return rows


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
