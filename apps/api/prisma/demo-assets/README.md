# Synthetic demo illustrations

These eight images were drawn as SVG by `scripts/generate-demo-assets.mjs`, then encoded as JPEG with Sharp. They are original code-generated illustrations, not patient photographs, external datasets, medical diagnoses, segmentation masks, or outputs from an AI classifier. Each image includes an explicit DEMO label.

Pairs1/2 and3/4 share a deterministic drawing seed so sample time comparisons remain visually coherent. Different lighting, texture and marks are illustrative only and do not establish disease progression. Image7 has a simulated soft-focus illustration; its quality result, when present in the database, comes from actual local OpenCV measurements.

The seed copies bytes to private storage with per-image SHA256 and ownership; these repository assets are never exposed through a public web route. Do not use these illustrations to train or clinically evaluate a dermatology model.
