from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
from typing import Literal

import cv2
import numpy as np
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .images import DecodedImage, png_base64

LABELS = ["SUSPICIOUS_PIGMENTED", "NEVUS", "ECZEMA_DERMATITIS", "PSORIASIS", "ACNE", "FUNGAL_INFECTION"]


class Artifact(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    format: Literal["onnx", "torchscript"]
    version: str = Field(min_length=1)
    inputSize: int = Field(ge=128, le=1024)
    mean: list[float] = Field(default=[0.485, 0.456, 0.406], min_length=3, max_length=3)
    std: list[float] = Field(default=[0.229, 0.224, 0.225], min_length=3, max_length=3)

    @field_validator("std")
    @classmethod
    def valid_std(cls, value):
        if any(not np.isfinite(v) or v <= 0 for v in value):
            raise ValueError("std must contain finite positive values")
        return value

    @field_validator("mean")
    @classmethod
    def finite_mean(cls, value):
        if not all(np.isfinite(value)):
            raise ValueError("mean must be finite")
        return value


class Manifest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pipelineVersion: str
    reviewStatus: Literal["RESEARCH_VALIDATED"]
    intendedUse: Literal["RESEARCH_ONLY"]
    sourceUrl: str
    codeLicense: str
    weightsLicense: str
    datasetReferences: list[str] = Field(min_length=1)
    evaluationReportPath: str
    evaluationReportSha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    labels: list[str]
    supportedInputDomains: list[Literal["clinical", "dermoscopic"]] = Field(min_length=1)
    classifier: Artifact
    segmentation: Artifact | None = None
    segmentationEvaluationReportPath: str | None = None
    segmentationEvaluationReportSha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    outputKind: Literal["logits", "probabilities"] = "logits"
    segmentationOutputKind: Literal["logits", "probabilities"] = "logits"
    segmentationThreshold: float = Field(default=0.5, gt=0, lt=1)
    calibrated: bool = False
    calibrationTemperature: float = Field(default=1, gt=0, le=100)
    calibrationVersion: str | None = None
    calibrationReportPath: str | None = None
    abstentionThreshold: float = Field(ge=0, le=1)
    supportsGradCam: bool = False

    @model_validator(mode="after")
    def consistent(self):
        if len(self.labels) != len(LABELS) or set(self.labels) != set(LABELS):
            raise ValueError("A production adapter must explicitly support all six required classes")
        if self.calibrated and not (self.calibrationVersion and self.calibrationReportPath):
            raise ValueError("Calibration requires version and actual validation report")
        if not self.calibrated and self.calibrationTemperature != 1:
            raise ValueError("Unvalidated calibration temperature is forbidden")
        if self.outputKind == "probabilities" and self.calibrationTemperature != 1:
            raise ValueError("Temperature scaling requires logits")
        if self.supportsGradCam and self.classifier.format != "torchscript":
            raise ValueError("Grad-CAM requires a differentiable TorchScript feature-output model")
        if self.segmentation and not (self.segmentationEvaluationReportPath and self.segmentationEvaluationReportSha256):
            raise ValueError("Segmentation requires its own held-out evaluation report")
        return self


class ModelUnavailable(RuntimeError):
    pass


class InvalidModelOutput(RuntimeError):
    pass


def inside(root: Path, relative: str) -> Path:
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError("Artifact paths must stay inside the manifest directory")
    if not path.is_file():
        raise ValueError("Referenced artifact or report does not exist")
    return path


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


class ModelRegistry:
    """Loads only operator-allowlisted artifacts. Hashes alone do not establish trust."""

    def __init__(self, manifest_path: str | None = None):
        self.manifest: Manifest | None = None
        self.classifier = None
        self.segmenter = None
        self.blocker = "MODEL_NOT_CONFIGURED"
        self._load(manifest_path or os.getenv("ML_MODEL_MANIFEST"))

    def _load(self, manifest_path: str | None):
        if not manifest_path:
            return
        try:
            location = Path(manifest_path).resolve()
            manifest = Manifest.model_validate_json(location.read_text(encoding="utf-8"))
            root = location.parent
            report_path = inside(root, manifest.evaluationReportPath)
            if file_hash(report_path) != manifest.evaluationReportSha256:
                raise ValueError("Evaluation report checksum mismatch")
            report = json.loads(report_path.read_text(encoding="utf-8"))
            if report.get("gate") != "PASS" or report.get("labels") != manifest.labels or report.get("artifactSha256") != manifest.classifier.sha256:
                raise ValueError("Independent evaluation must PASS with the same label order")
            if not set(manifest.supportedInputDomains).issubset(set(report.get("inputDomains", []))):
                raise ValueError("Evaluation does not cover supported domains")
            if manifest.calibrated:
                calibration = json.loads(inside(root, manifest.calibrationReportPath).read_text(encoding="utf-8"))
                if calibration.get("version") != manifest.calibrationVersion or calibration.get("temperature") != manifest.calibrationTemperature or calibration.get("artifactSha256") != manifest.classifier.sha256 or calibration.get("split") != "validation":
                    raise ValueError("Calibration report does not match manifest")
            if manifest.segmentation:
                segmentation_report_path = inside(root, manifest.segmentationEvaluationReportPath)
                if file_hash(segmentation_report_path) != manifest.segmentationEvaluationReportSha256:
                    raise ValueError("Segmentation evaluation checksum mismatch")
                segmentation_report = json.loads(segmentation_report_path.read_text(encoding="utf-8"))
                if segmentation_report.get("gate") != "PASS" or segmentation_report.get("artifactSha256") != manifest.segmentation.sha256 or segmentation_report.get("task") != "segmentation":
                    raise ValueError("Segmentation evaluation does not cover artifact")
            trusted = {part.strip() for part in os.getenv("ML_TRUSTED_ARTIFACT_SHA256", "").split(",") if part.strip()}
            for spec in [manifest.classifier, manifest.segmentation]:
                if spec is None:
                    continue
                if spec.sha256 not in trusted:
                    raise ValueError("Artifact hash not explicitly allowlisted by operator")
                path = inside(root, spec.path)
                if file_hash(path) != spec.sha256:
                    raise ValueError("Artifact checksum mismatch")
                module = "onnxruntime" if spec.format == "onnx" else "torch"
                if importlib.util.find_spec(module) is None:
                    raise ValueError("Required inference runtime is not installed")
            self.classifier = self._runtime(manifest.classifier, root)
            if manifest.segmentation:
                self.segmenter = self._runtime(manifest.segmentation, root)
            self.manifest = manifest
            self.blocker = None
        except Exception:
            # Paths/exception details are intentionally not included in public API or logs.
            self.blocker = "MANIFEST_OR_ARTIFACT_VALIDATION_FAILED"

    @staticmethod
    def _runtime(spec: Artifact, root: Path):
        path = inside(root, spec.path)
        if spec.format == "onnx":
            import onnxruntime as ort
            options = ort.SessionOptions()
            options.intra_op_num_threads = min(4, os.cpu_count() or 1)
            return ort.InferenceSession(str(path), sess_options=options, providers=["CPUExecutionProvider"])
        import torch
        torch.set_num_threads(min(4, os.cpu_count() or 1))
        return torch.jit.load(str(path), map_location="cpu").eval()

    def capabilities(self) -> dict:
        manifest = self.manifest
        return {
            "quality": {"available": True, "assessmentComplete": False, "checks": ["BLUR", "EXPOSURE"], "unavailableChecks": ["SKIN_AND_LESION_VISIBILITY", "DISTANCE", "OCCLUSION"], "clinicalValidation": False},
            "inference": {"available": manifest is not None, "status": "READY_RESEARCH_ONLY" if manifest else "MODEL_NOT_READY", "reason": self.blocker, "supportedClasses": manifest.labels if manifest else [], "supportedInputDomains": manifest.supportedInputDomains if manifest else [], "pipelineVersion": manifest.pipelineVersion if manifest else None},
            "segmentation": {"available": bool(manifest and manifest.segmentation)},
            "attribution": {"available": bool(manifest and manifest.supportsGradCam)},
            "malignancy": {"available": False, "reason": "NO_VALIDATED_MALIGNANCY_HEAD"},
            "offlineInference": {"available": False},
            "clinicalReady": False,
        }

    @staticmethod
    def _input(image: DecodedImage, spec: Artifact) -> np.ndarray:
        resized = cv2.resize(image.rgb, (spec.inputSize, spec.inputSize), interpolation=cv2.INTER_AREA)
        array = resized.astype(np.float32) / 255.0
        array = (array - np.asarray(spec.mean, dtype=np.float32)) / np.asarray(spec.std, dtype=np.float32)
        return np.ascontiguousarray(array.transpose(2, 0, 1)[None])

    @staticmethod
    def _run(runtime, spec: Artifact, array: np.ndarray, grad: bool = False):
        if spec.format == "onnx":
            return runtime.run(None, {runtime.get_inputs()[0].name: array})
        import torch
        tensor = torch.from_numpy(array)
        tensor.requires_grad_(grad)
        with torch.set_grad_enabled(grad):
            result = runtime(tensor)
        return result if isinstance(result, (tuple, list)) else [result]

    @staticmethod
    def _array(output) -> np.ndarray:
        return output.detach().cpu().numpy() if hasattr(output, "detach") else np.asarray(output)

    def infer(self, image: DecodedImage) -> dict:
        manifest = self.manifest
        if manifest is None:
            raise ModelUnavailable()
        outputs = self._run(self.classifier, manifest.classifier, self._input(image, manifest.classifier), manifest.supportsGradCam)
        raw = self._array(outputs[0])
        if raw.shape != (1, len(manifest.labels)) or not np.isfinite(raw).all():
            raise InvalidModelOutput("Classification shape or values invalid")
        if manifest.outputKind == "logits":
            shifted = raw[0] / manifest.calibrationTemperature
            shifted -= shifted.max()
            scores = np.exp(shifted) / np.exp(shifted).sum()
        else:
            scores = raw[0]
        if not np.isfinite(scores).all() or (scores < 0).any() or (scores > 1).any() or not np.isclose(scores.sum(), 1, atol=1e-4):
            raise InvalidModelOutput("Probability values invalid")
        winner = int(np.argmax(scores))
        attribution = {"available": False, "reason": "ATTRIBUTION_MODEL_NOT_CONFIGURED"}
        if manifest.supportsGradCam:
            if len(outputs) < 2 or not hasattr(outputs[1], "requires_grad") or outputs[1].ndim != 4:
                raise InvalidModelOutput("Grad-CAM model must return logits and their convolutional features")
            import torch
            features = outputs[1]
            gradients = torch.autograd.grad(outputs[0][0, winner], features, retain_graph=False)[0]
            cam = (gradients.mean(dim=(2, 3), keepdim=True) * features).sum(dim=1).relu()
            cam_array = cam.detach().cpu().numpy()[0]
            if not np.isfinite(cam_array).all() or cam_array.max() <= 0:
                attribution = {"available": False, "reason": "NO_POSITIVE_ATTRIBUTION"}
            else:
                cam_array = cv2.resize(cam_array / cam_array.max(), image.size)
                heatmap = cv2.cvtColor(cv2.applyColorMap(np.uint8(cam_array * 255), cv2.COLORMAP_JET), cv2.COLOR_BGR2RGB)
                attribution = {"available": True, "heatmapPngBase64": png_base64(heatmap), "targetClass": manifest.labels[winner], "method": "GRAD_CAM"}
        segmentation = {"available": False, "reason": "SEGMENTATION_MODEL_NOT_CONFIGURED", "source": "MODEL"}
        if manifest.segmentation and self.segmenter is not None:
            spec = manifest.segmentation
            mask_outputs = self._run(self.segmenter, spec, self._input(image, spec))
            mask = self._array(mask_outputs[0])
            if mask.ndim != 4 or mask.shape[:2] != (1, 1) or not np.isfinite(mask).all():
                raise InvalidModelOutput("Segmentation shape or values invalid")
            mask = mask[0, 0]
            if manifest.segmentationOutputKind == "logits":
                mask = 1 / (1 + np.exp(-np.clip(mask, -80, 80)))
            elif (mask < 0).any() or (mask > 1).any():
                raise InvalidModelOutput("Segmentation probabilities invalid")
            mask = cv2.resize(mask, image.size, interpolation=cv2.INTER_LINEAR)
            segmentation = {"available": True, "maskPngBase64": png_base64((mask >= manifest.segmentationThreshold).astype(np.uint8) * 255), "source": "MODEL", "modelVersion": spec.version}
        reasons = ["QUALITY_ASSESSMENT_INCOMPLETE"]
        if scores[winner] < manifest.abstentionThreshold:
            reasons.append("LOW_MODEL_CONFIDENCE")
        if not manifest.calibrated:
            reasons.append("UNCALIBRATED_MODEL")
        return {
            "modelVersion": manifest.classifier.version, "artifactSha256": manifest.classifier.sha256,
            "pipelineVersion": manifest.pipelineVersion,
            "predictions": [{"classCode": label, "score": float(scores[index]), "scoreType": "CALIBRATED_PROBABILITY" if manifest.calibrated else "UNCALIBRATED_SCORE"} for index, label in enumerate(manifest.labels)],
            "malignantProbability": None, "calibrationStatus": "CALIBRATED" if manifest.calibrated else "NOT_AVAILABLE",
            "segmentation": segmentation, "attribution": attribution, "uncertaintyReasons": reasons,
            "artifactVersions": {"classifier": manifest.classifier.model_dump(), "segmentation": manifest.segmentation.model_dump() if manifest.segmentation else None, "calibration": manifest.calibrationVersion},
            "domainStatus": "SUPPORTED",
        }
