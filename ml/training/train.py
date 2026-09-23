"""Train actual classification or segmentation from a licensed manifest.

Requires the optional training environment. Outputs an UNVALIDATED checkpoint,
never an approved deployment manifest. Test images are not used here.
"""
from __future__ import annotations

import argparse
import random
from pathlib import Path

from ml.common import LABELS, MEAN, STD, read_manifest, sha256, write_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--task", choices=["classification", "segmentation"], required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--input-size", type=int, default=224)
    parser.add_argument("--seed", type=int, default=20260923)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--pretrained", action="store_true", help="Explicitly permit downloading official ImageNet backbone weights; these are not dermatology weights")
    args = parser.parse_args()
    if args.epochs < 1 or args.batch_size < 2:
        raise SystemExit("epochs >= 1 and batch-size >= 2 required")
    import cv2
    import numpy as np
    import torch
    from PIL import Image, ImageOps
    from torch import nn
    from torch.utils.data import DataLoader, Dataset
    from torchvision.models import EfficientNet_B0_Weights, MobileNet_V3_Large_Weights, efficientnet_b0
    from torchvision.models.segmentation import deeplabv3_mobilenet_v3_large

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.use_deterministic_algorithms(True, warn_only=True)
    rows = read_manifest(args.manifest)
    train_rows = [row for row in rows if row["split"] == "train"]
    validation_rows = [row for row in rows if row["split"] == "validation"]
    if not train_rows or not validation_rows:
        raise SystemExit("Training and validation data must both exist")
    if args.task == "segmentation" and any(not row.get("resolved_mask_path") for row in train_rows + validation_rows):
        raise SystemExit("Segmentation requires a real expert mask for every training/validation image")
    if args.task == "classification" and set(row["label"] for row in train_rows) != set(LABELS):
        raise SystemExit("Training split does not cover all six classes")

    class Images(Dataset):
        def __init__(self, values, augment):
            self.values, self.augment = values, augment
        def __len__(self):
            return len(self.values)
        def __getitem__(self, index):
            row = self.values[index]
            with Image.open(row["resolved_path"]) as source:
                rgb = np.array(ImageOps.exif_transpose(source).convert("RGB"))
            source_shape = rgb.shape[:2]
            rgb = cv2.resize(rgb, (args.input_size, args.input_size), interpolation=cv2.INTER_AREA)
            if args.task == "segmentation":
                with Image.open(row["resolved_mask_path"]) as source:
                    mask = np.array(source.convert("L"))
                if mask.shape != source_shape:
                    raise ValueError("Mask must align with the source image; normalize annotation orientation before training")
                target = cv2.resize(mask, (args.input_size, args.input_size), interpolation=cv2.INTER_NEAREST) > 127
            else:
                target = LABELS.index(row["label"])
            if self.augment and random.random() < 0.5:
                rgb = np.fliplr(rgb).copy()
                if args.task == "segmentation":
                    target = np.fliplr(target).copy()
            image = (rgb.astype(np.float32) / 255 - np.array(MEAN, dtype=np.float32)) / np.array(STD, dtype=np.float32)
            tensor = torch.from_numpy(np.ascontiguousarray(image.transpose(2, 0, 1)))
            return tensor, torch.from_numpy(target.astype(np.float32)[None]) if args.task == "segmentation" else torch.tensor(target, dtype=torch.long)

    if args.task == "classification":
        model = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT if args.pretrained else None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(LABELS))
        counts = np.bincount([LABELS.index(row["label"]) for row in train_rows], minlength=len(LABELS))
        criterion = nn.CrossEntropyLoss(weight=torch.tensor(len(train_rows) / (len(LABELS) * counts), dtype=torch.float32, device=args.device))
    else:
        model = deeplabv3_mobilenet_v3_large(weights=None, weights_backbone=MobileNet_V3_Large_Weights.DEFAULT if args.pretrained else None, num_classes=1, aux_loss=False)
        criterion = nn.BCEWithLogitsLoss()
    model.to(args.device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.0003, weight_decay=0.01)
    loaders = {"train": DataLoader(Images(train_rows, True), batch_size=args.batch_size, shuffle=True, num_workers=0, drop_last=True), "validation": DataLoader(Images(validation_rows, False), batch_size=args.batch_size, num_workers=0)}
    if not len(loaders["train"]):
        raise SystemExit("Training split smaller than batch size")
    best, history = float("inf"), []
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for epoch in range(args.epochs):
        losses = {}
        for phase, loader in loaders.items():
            model.train(phase == "train")
            total, samples = 0.0, 0
            for images, targets in loader:
                images, targets = images.to(args.device), targets.to(args.device)
                with torch.set_grad_enabled(phase == "train"):
                    outputs = model(images)
                    logits = outputs["out"] if isinstance(outputs, dict) else outputs
                    loss = criterion(logits, targets)
                    if phase == "train":
                        optimizer.zero_grad()
                        loss.backward()
                        optimizer.step()
                total += float(loss.detach()) * len(images)
                samples += len(images)
            losses[phase] = total / samples
        history.append({"epoch": epoch + 1, **losses})
        print(f"epoch={epoch + 1} trainingLoss={losses['train']:.5f} validationLoss={losses['validation']:.5f}")
        if losses["validation"] < best:
            best = losses["validation"]
            torch.save({"state_dict": model.cpu().state_dict(), "task": args.task, "labels": LABELS, "inputSize": args.input_size, "seed": args.seed, "manifestSha256": sha256(args.manifest), "status": "UNVALIDATED", "epoch": epoch + 1}, args.output)
            model.to(args.device)
    write_json(args.output.with_suffix(".training.json"), {"status": "UNVALIDATED", "task": args.task, "seed": args.seed, "epochs": history, "manifestSha256": sha256(args.manifest), "testSetUsed": False, "checkpointSha256": sha256(args.output)})


if __name__ == "__main__":
    main()
