"""Procedural image regressions; no user photographs or external providers."""
import io

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.images import decode_image, measure_quality
from app.main import app


def encoded(pixels, format="JPEG"):
    stream = io.BytesIO()
    Image.fromarray(pixels.astype(np.uint8)).save(stream, format=format, quality=92)
    return stream.getvalue()


def smooth_coloured_region():
    # Broad colour variation remains visible despite very few high-frequency edges.
    y, x = np.mgrid[:480, :640]
    distance = np.sqrt(((x - 310) / 110) ** 2 + ((y - 230) / 85) ** 2)
    ring = np.exp(-((distance - 1) / 0.25) ** 2)
    rgb = np.empty((480, 640, 3), dtype=np.float64)
    rgb[:] = [185, 145, 115]
    rgb += ring[..., None] * [-10, -45, -25]
    rgb += (x / 640)[..., None] * 15
    return encoded(rgb)


def by_code(result):
    return {item["code"]: item for item in result["checks"]}


def test_low_texture_visible_colour_region_warns_instead_of_false_reject():
    result = measure_quality(decode_image(smooth_coloured_region(), "image/jpeg"))
    checks = by_code(result)
    # This image satisfies the previous (<25) reject branch, but is not blank.
    assert checks["BLUR"]["value"] < 25
    assert checks["BLUR"]["status"] == "WARN"
    assert checks["INFORMATION_CONTENT"]["status"] == "PASS"
    assert checks["EXPOSURE"]["status"] == "PASS"
    assert result["decision"] == "WARN"
    assert result["assessmentComplete"] is False
    assert result["clinicalValidation"] is False
    assert result["methodVersion"] == "opencv-quality-v2"


def test_quality_http_does_not_block_low_texture_image(monkeypatch):
    monkeypatch.setenv("ML_SERVICE_TOKEN", "quality-regression-token")
    monkeypatch.setenv("AI_PROVIDER", "local")
    monkeypatch.delenv("ML_MODEL_MANIFEST", raising=False)
    with TestClient(app) as client:
        response = client.post("/quality", headers={"X-Service-Token": "quality-regression-token"}, files={"image": ("procedural.jpg", smooth_coloured_region(), "image/jpeg")})
    assert response.status_code == 200
    assert response.json()["decision"] == "WARN"


@pytest.mark.parametrize("colour", [(0, 0, 0), (255, 255, 255), (155, 110, 85), (127, 127, 127)])
def test_uniform_images_still_rejected_even_at_normal_exposure(colour):
    pixels = np.empty((320, 320, 3), dtype=np.uint8)
    pixels[:] = colour
    result = measure_quality(decode_image(encoded(pixels), "image/jpeg"))
    checks = by_code(result)
    assert checks["BLUR"]["status"] == "WARN"
    assert checks["INFORMATION_CONTENT"]["status"] == "REJECT"
    assert result["decision"] == "REJECT"


def test_nearly_uniform_quantization_noise_still_rejected():
    pixels = 127 + np.random.default_rng(42).integers(-1, 2, (320, 320, 3))
    result = measure_quality(decode_image(encoded(pixels, "PNG"), "image/png"))
    assert by_code(result)["INFORMATION_CONTENT"]["value"] == 2
    assert result["decision"] == "REJECT"


def test_severe_blur_retains_warning_and_incomplete_assessment():
    pixels = np.random.default_rng(9).integers(50, 210, (480, 640, 3), dtype=np.uint8)
    blurred = cv2.GaussianBlur(pixels, (0, 0), sigmaX=7)
    result = measure_quality(decode_image(encoded(blurred), "image/jpeg"))
    assert by_code(result)["BLUR"]["value"] < 25
    assert by_code(result)["BLUR"]["status"] == "WARN"
    assert result["decision"] == "WARN"
    assert result["assessmentComplete"] is False


def test_colour_detail_is_not_lost_to_grayscale_or_downsampling():
    # Two colours of almost identical luminance; a gray-only range would mislabel
    # them as blank. Source RGB variation remains authoritative for emptiness.
    pixels = np.empty((480, 640, 3), dtype=np.uint8)
    pixels[:, :320] = [180, 100, 100]
    pixels[:, 320:] = [100, 140, 104]
    result = measure_quality(decode_image(encoded(pixels, "PNG"), "image/png"))
    assert by_code(result)["INFORMATION_CONTENT"]["status"] == "PASS"
    assert result["decision"] != "REJECT"


@pytest.mark.parametrize("levels", [(0, 10), (246, 255)])
def test_extreme_exposure_still_rejects_nonuniform_images(levels):
    pixels = np.random.default_rng(7).integers(levels[0], levels[1] + 1, (320, 320, 3), dtype=np.uint8)
    result = measure_quality(decode_image(encoded(pixels, "PNG"), "image/png"))
    assert by_code(result)["INFORMATION_CONTENT"]["status"] == "PASS"
    assert by_code(result)["EXPOSURE"]["status"] == "REJECT"
    assert result["decision"] == "REJECT"
