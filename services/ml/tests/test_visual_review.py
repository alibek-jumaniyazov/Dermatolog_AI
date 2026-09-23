import base64
import io
import json

import httpx
import numpy as np
import pytest
from PIL import Image

from app import openai_provider
from app.images import DecodedImage


def response_data(**overrides):
    return {
        "skinVisible": True, "imageSuitable": True,
        "imageAssessmentReason": "Chegara va rang farqi ko‘rinadi.",
        "summary": "Suratda chegaralangan o‘zgarish ko‘rinadi.",
        "observations": ["Markaz va chekka qism rangi farq qiladi."],
        "differential": [{"classCode": "FUNGAL_INFECTION", "condition": "Tinea ehtimoli", "supportingFeatures": ["Halqasimon chekka."], "uncertainties": ["Laborator tekshiruv bajarilmagan."]}],
        "nextSteps": ["Shifokor ko‘rigida aniqlashtirish."],
        "followUpQuestions": ["Qachondan beri mavjud?"],
        "limitations": ["Tasvirning o‘zi tashxisni tasdiqlamaydi."], **overrides,
    }


def payload(data):
    return {"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(data)}]}]}


@pytest.mark.parametrize("field", ["summary", "nextSteps", "followUpQuestions", "supportingFeatures", "uncertainties"])
def test_numeric_clinical_confidence_rejected_in_every_new_text_surface(field):
    data = response_data()
    if field == "summary":
        data[field] = "Ishonch 99 foiz"
    elif field in ("supportingFeatures", "uncertainties"):
        data["differential"][0][field] = ["Ishonch 99%"]
    else:
        data[field] = ["Ishonch 99%"]
    with pytest.raises(openai_provider.ProviderError):
        openai_provider.parse_response(payload(data))


def test_unusable_image_cannot_return_condition_hypotheses():
    with pytest.raises(openai_provider.ProviderError):
        openai_provider.parse_response(payload(response_data(imageSuitable=False)))


@pytest.mark.parametrize("model", ["gpt-4o-mini", "gpt-5.6-luna"])
@pytest.mark.parametrize("data,outcome,predictions", [
    (response_data(), "OBSERVATIONS_READY", ["FUNGAL_INFECTION"]),
    (response_data(differential=[]), "UNCERTAIN", []),
    (response_data(imageSuitable=False, differential=[]), "IMAGE_UNSUITABLE", []),
    (response_data(skinVisible=False, imageSuitable=False, differential=[]), "UNSUPPORTED_DOMAIN", []),
    (response_data(differential=[{"classCode": "OTHER", "condition": "Boshqa ko‘rinish", "supportingFeatures": ["Chegaralangan o‘zgarish."], "uncertainties": ["Sababi aniqlanmagan."]}]), "OBSERVATIONS_READY", []),
])
def test_transport_keeps_visual_hypotheses_separate_from_clinical_risk(monkeypatch, model, data, outcome, predictions):
    import asyncio
    monkeypatch.setenv("OPENAI_API_KEY", "placeholder-for-mocked-transport")
    monkeypatch.setenv("OPENAI_MODEL", model)
    original = httpx.AsyncClient
    captured = []

    def handler(request):
        body = json.loads(request.content)
        captured.append(body)
        assert body["store"] is False
        assert body["model"] == model
        if model == "gpt-5.6-luna":
            assert body["reasoning"] == {"effort": "low"}
            assert body["max_output_tokens"] >= 6000
        else:
            assert "reasoning" not in body  # Do not send unsupported reasoning params to the legacy provider.
        assert "private-note" not in request.content.decode()
        assert "confirmed-diagnosis-filename" not in request.content.decode()
        return httpx.Response(200, json=payload(data))

    monkeypatch.setattr(openai_provider.httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(handler)))
    rgb = np.zeros((300, 400, 3), dtype=np.uint8)
    rgb[:, :200] = [200, 100, 50]
    rgb[:, 200:] = [50, 100, 200]
    image = DecodedImage(rgb=rgb, sha256="local-only-image-hash")
    result = asyncio.run(openai_provider.describe(image, {"notes": "private-note", "name": "confirmed-diagnosis-filename", "itching": "UNKNOWN"}, {"x": 0.5, "y": 0, "width": 0.5, "height": 1}))
    assert len(captured) == 1
    sent_images = [item for item in captured[0]["input"][0]["content"] if item["type"] == "input_image"]
    assert len(sent_images) == 2
    pictures = [Image.open(io.BytesIO(base64.b64decode(item["image_url"].split(",", 1)[1]))) for item in sent_images]
    assert pictures[0].size == (400, 300) and pictures[1].size == (200, 300)
    assert pictures[1].getpixel((100, 150))[2] > 190  # The actual right-half pixels, not a synthetic crop.
    assert all(not picture.getexif() for picture in pictures)
    assert result["outcome"] == outcome
    assert [item["classCode"] for item in result["predictions"]] == predictions
    assert all(item["score"] is None for item in result["predictions"])
    assert result["malignantProbability"] is None and result["riskLevel"] == "NOT_ASSESSED"
    assert result["nextSteps"] == data["nextSteps"]
    assert result["imageAssessment"]["reason"] == data["imageAssessmentReason"]


def test_decoded_pixels_remove_exif_without_downscaling_small_photos():
    photo = DecodedImage(rgb=np.zeros((450, 600, 3), dtype=np.uint8), sha256="local")
    url = openai_provider.image_data_url(photo)
    with Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1]))) as image:
        assert image.size == (600, 450)
        assert not image.getexif()
