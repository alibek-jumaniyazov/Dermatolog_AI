"""Evaluate trusted exported artifacts on held-out data, or calibrate validation logits.

Missing data/artifacts fail instead of manufacturing benchmark figures. This script
does not grant clinical approval or approve dataset/model licenses.
"""
from __future__ import annotations

import argparse
import json
import platform
import sys
import time
from collections import Counter
from pathlib import Path

import numpy as np

from ml.common import LABELS, read_manifest, sha256, write_json


def softmax(logits, temperature=1.0):
    values = logits / temperature
    values = values - values.max(axis=1, keepdims=True)
    result = np.exp(values)
    return result / result.sum(axis=1, keepdims=True)


def calibration_metrics(probabilities, targets):
    confidence, decisions = probabilities.max(axis=1), probabilities.argmax(axis=1)
    ece = 0.0
    for index in range(15):
        lower, upper = index / 15, (index + 1) / 15
        chosen = (confidence >= lower) & ((confidence <= upper) if index == 14 else (confidence < upper))
        if chosen.any():
            ece += chosen.mean() * abs((decisions[chosen] == targets[chosen]).mean() - confidence[chosen].mean())
    onehot = np.eye(len(LABELS))[targets]
    return {"ece": float(ece), "multiclassBrier": float(np.square(probabilities - onehot).sum(axis=1).mean())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--artifact", type=Path, required=True)
    parser.add_argument("--expected-sha256", required=True)
    parser.add_argument("--format", choices=["torchscript", "onnx"], default="torchscript")
    parser.add_argument("--task", choices=["classification", "segmentation"], default="classification")
    parser.add_argument("--input-size", type=int, default=224)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--calibrate", action="store_true", help="Use validation split only and write a temperature calibration report")
    parser.add_argument("--calibration-report", type=Path)
    parser.add_argument("--abstention-threshold", type=float, default=0.7)
    parser.add_argument("--bootstrap", type=int, default=1000)
    args = parser.parse_args()
    if args.calibrate and (args.task != "classification" or args.calibration_report):
        raise SystemExit("Calibration only supports classification validation logits")
    if not 0 <= args.abstention_threshold <= 1 or args.bootstrap < 1:
        raise SystemExit("Invalid evaluation configuration")
    if sha256(args.artifact) != args.expected_sha256:
        raise SystemExit("Artifact checksum mismatch")
    root = Path(__file__).resolve().parents[2]
    sys.path.insert(0, str(root / "services" / "ml"))
    from app.images import decode_image
    from app.models import Artifact, ModelRegistry
    spec = Artifact(path=args.artifact.name, sha256=args.expected_sha256, format=args.format, version="evaluation-candidate", inputSize=args.input_size)
    runtime = ModelRegistry._runtime(spec, args.artifact.resolve().parent)
    all_rows = read_manifest(args.manifest)
    split = "validation" if args.calibrate else "test"
    rows = [row for row in all_rows if row["split"] == split]
    if not rows:
        raise SystemExit("Requested split has no data")
    logits, truths, durations, dice_scores = [], [], [], []
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    import cv2
    from PIL import Image
    for index, row in enumerate(rows):
        path = Path(row["resolved_path"])
        decoded = decode_image(path.read_bytes(), mime_map.get(path.suffix.lower()))
        inputs = ModelRegistry._input(decoded, spec)
        if index == 0:
            for _ in range(3):
                ModelRegistry._run(runtime, spec, inputs)
        started = time.perf_counter()
        output = ModelRegistry._array(ModelRegistry._run(runtime, spec, inputs)[0])
        durations.append((time.perf_counter() - started) * 1000)
        if not np.isfinite(output).all():
            raise SystemExit("Non-finite model outputs")
        if args.task == "classification":
            if output.shape != (1, len(LABELS)):
                raise SystemExit("Output shape incompatible with the six-class schema")
            logits.append(output[0])
            truths.append(LABELS.index(row["label"]))
        else:
            if not row.get("resolved_mask_path") or output.ndim != 4 or output.shape[:2] != (1, 1):
                raise SystemExit("Actual segmentation output and expert mask required")
            with Image.open(row["resolved_mask_path"]) as source:
                ground_truth = np.array(source.convert("L")) > 127
            if ground_truth.shape != decoded.rgb.shape[:2]:
                raise SystemExit("Mask orientation or size does not match normalized source")
            probability = 1 / (1 + np.exp(-np.clip(output[0, 0], -80, 80)))
            prediction = cv2.resize(probability, decoded.size) >= 0.5
            denominator = prediction.sum() + ground_truth.sum()
            dice_scores.append(float(2 * (prediction & ground_truth).sum() / denominator) if denominator else 1.0)
    latency = {"warmupRuns": 3, "n": len(durations), "p50Ms": float(np.quantile(durations, 0.5)), "p95Ms": float(np.quantile(durations, 0.95)), "maxMs": max(durations), "batchSize": 1, "scope": "model forward only; quality/upload/queue/report excluded"}
    common = {"task": args.task, "labels": LABELS, "inputDomains": sorted({row["domain"] for row in rows}), "artifactSha256": args.expected_sha256, "datasetManifestSha256": sha256(args.manifest), "split": split, "samples": len(rows), "patientGroups": len({row["patient_id"] for row in rows}), "inputSize": args.input_size, "device": "cpu", "platform": platform.platform(), "processor": platform.processor(), "latency": latency, "clinicalApproved": False}
    if args.task == "segmentation":
        mean_dice = float(np.mean(dice_scores))
        write_json(args.output, {**common, "gate": "PASS" if mean_dice >= 0.85 and latency["p95Ms"] <= 3000 else "FAIL", "dice": mean_dice, "perImageDice": [{"imageId": row["image_id"], "dice": score} for row, score in zip(rows, dice_scores)], "limitations": ["Single dataset evaluation; expert review and target-domain validation still required."]})
        return
    logits, targets = np.array(logits), np.array(truths)
    if set(targets.tolist()) != set(range(len(LABELS))):
        raise SystemExit("Every required class must be represented in evaluation; absent classes are not passable")
    if args.calibrate:
        candidates = np.exp(np.linspace(np.log(0.25), np.log(10), 300))
        losses = [-np.log(np.clip(softmax(logits, value)[np.arange(len(targets)), targets], 1e-12, 1)).mean() for value in candidates]
        temperature = float(candidates[int(np.argmin(losses))])
        write_json(args.output, {**common, "version": "temperature-validation-v1", "temperature": temperature, "before": calibration_metrics(softmax(logits), targets), "after": calibration_metrics(softmax(logits, temperature), targets), "testSetUsed": False, "method": "validation-only logspace temperature search", "status": "REQUIRES_HELD_OUT_TEST"})
        return
    temperature = 1.0
    if args.calibration_report:
        calibration = json.loads(args.calibration_report.read_text(encoding="utf-8"))
        if calibration.get("split") != "validation" or calibration.get("artifactSha256") != args.expected_sha256 or calibration.get("testSetUsed") is not False:
            raise SystemExit("Calibration report incompatible with this artifact or split")
        temperature = float(calibration["temperature"])
    probabilities = softmax(logits, temperature)
    decisions = probabilities.argmax(axis=1)
    from sklearn.metrics import accuracy_score, average_precision_score, classification_report, confusion_matrix, f1_score, roc_auc_score
    accuracy = float(accuracy_score(targets, decisions))
    macro_f1 = float(f1_score(targets, decisions, average="macro"))
    onehot = np.eye(len(LABELS))[targets]
    roc = float(roc_auc_score(targets, probabilities, multi_class="ovr", average="macro"))
    pr = float(average_precision_score(onehot, probabilities, average="macro"))
    rng = np.random.default_rng(20260923)
    patients = sorted({row["patient_id"] for row in rows})
    groups = {patient: [index for index, row in enumerate(rows) if row["patient_id"] == patient] for patient in patients}
    bootstrap_accuracy = []
    for _ in range(args.bootstrap):
        indexes = [index for patient in rng.choice(patients, size=len(patients), replace=True) for index in groups[patient]]
        bootstrap_accuracy.append(float((decisions[indexes] == targets[indexes]).mean()))
    subgroups = {}
    for field in ("domain", "skin_tone", "age_group", "camera_type"):
        values = sorted({row.get(field) for row in rows if row.get(field)})
        subgroups[field] = {value: {"n": sum(row.get(field) == value for row in rows), "accuracy": float(np.mean([decisions[index] == targets[index] for index, row in enumerate(rows) if row.get(field) == value]))} for value in values}
    passed = accuracy >= 0.85 and macro_f1 >= 0.80 and roc >= 0.85 and pr >= 0.85 and latency["p95Ms"] <= 3000
    write_json(args.output, {**common, "gate": "PASS" if passed else "FAIL", "gateScope": "classification only; not full clinical or project AI gate", "accuracy": accuracy, "macroF1": macro_f1, "rocAucMacroOvr": roc, "prAveragePrecisionMacro": pr, "confusionMatrix": confusion_matrix(targets, decisions, labels=list(range(len(LABELS)))).tolist(), "classificationReport": classification_report(targets, decisions, target_names=LABELS, output_dict=True, zero_division=0), "calibration": {"applied": bool(args.calibration_report), **calibration_metrics(probabilities, targets)}, "abstentionCoverage": float((probabilities.max(axis=1) >= args.abstention_threshold).mean()), "abstentionThreshold": args.abstention_threshold, "accuracy95CI": np.quantile(bootstrap_accuracy, [0.025, 0.975]).tolist(), "ciMethod": "patient-cluster bootstrap", "subgroups": subgroups, "malignantSensitivity": None, "malignantSpecificity": None, "limitations": ["No dedicated, validated malignancy head; malignant metrics cannot be inferred from SUSPICIOUS_PIGMENTED.", "Accuracy covers all test samples, not only high-confidence samples.", "Expert near-duplicate review and external-site validation remain required."]})


if __name__ == "__main__":
    main()
