"""Export a trained checkpoint to TorchScript (optionally ONNX), verify parity.

Exports remain UNVALIDATED until held-out evaluation and independent review.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from ml.common import LABELS, sha256, write_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--expected-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--onnx", type=Path)
    args = parser.parse_args()
    if sha256(args.checkpoint) != args.expected_sha256:
        raise SystemExit("Checkpoint checksum does not match explicitly approved input")
    import torch
    from torch import nn
    from torchvision.models import efficientnet_b0
    from torchvision.models.segmentation import deeplabv3_mobilenet_v3_large
    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    if checkpoint.get("labels") != LABELS:
        raise SystemExit("Checkpoint label mapping mismatch")
    task = checkpoint["task"]
    if task == "classification":
        base = efficientnet_b0(weights=None)
        base.classifier[1] = nn.Linear(base.classifier[1].in_features, len(LABELS))
        base.load_state_dict(checkpoint["state_dict"], strict=True)
        class Features(nn.Module):
            def __init__(self, net):
                super().__init__()
                self.features, self.pool, self.classifier = net.features, net.avgpool, net.classifier
            def forward(self, inputs):
                features = self.features(inputs)
                logits = self.classifier(self.pool(features).flatten(1))
                return logits, features
        model = Features(base).eval()
    elif task == "segmentation":
        base = deeplabv3_mobilenet_v3_large(weights=None, weights_backbone=None, num_classes=1, aux_loss=False)
        base.load_state_dict(checkpoint["state_dict"], strict=True)
        class Mask(nn.Module):
            def __init__(self, net):
                super().__init__()
                self.net = net
            def forward(self, inputs):
                return self.net(inputs)["out"]
        model = Mask(base).eval()
    else:
        raise SystemExit("Unknown checkpoint task")
    inputs = torch.randn(1, 3, checkpoint["inputSize"], checkpoint["inputSize"])
    artifact = torch.jit.trace(model, inputs)
    with torch.no_grad():
        expected, actual = model(inputs), artifact(inputs)
        expected = expected if isinstance(expected, tuple) else (expected,)
        actual = actual if isinstance(actual, tuple) else (actual,)
        if not all(torch.allclose(a, b, atol=1e-5, rtol=1e-4) for a, b in zip(expected, actual)):
            raise SystemExit("TorchScript parity failed")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    artifact.save(str(args.output))
    report = {"status": "UNVALIDATED", "task": task, "labels": LABELS, "inputSize": checkpoint["inputSize"], "torchscriptSha256": sha256(args.output), "torchscriptParity": True, "supportsGradCam": task == "classification", "onnxParity": None}
    if args.onnx:
        import numpy as np
        import onnxruntime as ort
        names = ["logits", "features"] if task == "classification" else ["mask"]
        torch.onnx.export(model, inputs, str(args.onnx), input_names=["image"], output_names=names, opset_version=17, dynamo=False)
        session = ort.InferenceSession(str(args.onnx), providers=["CPUExecutionProvider"])
        outputs = session.run(None, {"image": inputs.numpy()})
        if not all(np.allclose(a.detach().numpy(), b, atol=1e-4, rtol=1e-3) for a, b in zip(expected, outputs)):
            raise SystemExit("ONNX parity failed")
        report.update({"onnxSha256": sha256(args.onnx), "onnxParity": True})
    write_json(args.output.with_suffix(".export.json"), report)


if __name__ == "__main__":
    main()
