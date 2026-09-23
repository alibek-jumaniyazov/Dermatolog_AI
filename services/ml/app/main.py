from __future__ import annotations

import asyncio
import hmac
import json
import os
import time
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from .images import MAX_BYTES, ImageValidationError, decode_image, measure_quality
from .models import InvalidModelOutput, ModelRegistry, ModelUnavailable
from . import openai_provider

registry: ModelRegistry
inference_semaphore = asyncio.Semaphore(1)


class StreamBodyLimit:
    def __init__(self, application=None, app=None):
        self.application = app or application

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.application(scope, receive, send)
        received = 0
        async def limited_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > MAX_BYTES + 65536:
                    raise HTTPException(413, {"code": "PAYLOAD_TOO_LARGE", "message": "So‘rov hajmi limitdan katta."})
            return message
        await self.application(scope, limited_receive, send)


@asynccontextmanager
async def lifespan(application: FastAPI):
    global registry
    registry = ModelRegistry()
    yield


app = FastAPI(title="Raqamli Dermatolog private ML service", version="0.1.0", lifespan=lifespan, docs_url=None, redoc_url=None)
app.add_middleware(StreamBodyLimit)


@app.middleware("http")
async def request_limits(request, call_next):
    length = request.headers.get("content-length")
    if length:
        try:
            too_large = int(length) > MAX_BYTES + 65536
        except ValueError:
            too_large = True
        if too_large:
            return JSONResponse(status_code=413, content={"error": {"code": "PAYLOAD_TOO_LARGE", "message": "So‘rov hajmi limitdan katta."}})
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def auth(x_service_token: Annotated[str | None, Header()] = None):
    expected = os.getenv("ML_SERVICE_TOKEN", "")
    if not expected or not x_service_token or not hmac.compare_digest(x_service_token, expected):
        raise HTTPException(401, {"code": "UNAUTHORIZED_SERVICE", "message": "Xizmat autentifikatsiyasi talab qilinadi."})


@app.exception_handler(HTTPException)
async def http_error(_request, exc):
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "REQUEST_FAILED", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content={"error": detail})


@app.exception_handler(RequestValidationError)
async def validation_error(_request, _exc):
    return JSONResponse(status_code=422, content={"error": {"code": "VALIDATION_ERROR", "message": "So‘rov maydonlari noto‘g‘ri."}})


@app.exception_handler(ImageValidationError)
async def image_error(_request, exc):
    return JSONResponse(status_code=exc.status, content={"error": {"code": exc.code, "message": exc.message}})


async def read_image(upload: UploadFile):
    try:
        data = await upload.read(MAX_BYTES + 1)
        return await run_in_threadpool(decode_image, data, upload.content_type)
    finally:
        await upload.close()


@app.get("/health/live")
@app.get("/health")
def live():
    return {"status": "ok", "service": "ml"}


@app.get("/health/ready")
def ready():
    enabled = openai_provider.provider_configured() if os.getenv("AI_PROVIDER", "local") == "openai" else registry.manifest is not None
    return {"status": "ready", "qualityAvailable": True, "inferenceAvailable": enabled}


@app.get("/capabilities", dependencies=[Depends(auth)])
def capabilities():
    result = registry.capabilities()
    selected = os.getenv("AI_PROVIDER", "local")
    result["provider"] = selected
    if selected == "openai":
        configured = openai_provider.provider_configured()
        result["inference"] = {"available": configured, "status": "VISUAL_DIFFERENTIAL" if configured else "MODEL_NOT_READY", "reason": None if configured else "PROVIDER_NOT_CONFIGURED", "supportedClasses": [], "supportedInputDomains": ["clinical"], "pipelineVersion": openai_provider.PIPELINE_VERSION, "requiresExternalConsent": True, "connectivityVerified": False}
        result["segmentation"] = {"available": False}
        result["attribution"] = {"available": False}
    configured = openai_provider.provider_configured() if selected == "openai" else registry.manifest is not None
    return {
        "provider": selected, "classification": bool(selected == "local" and registry.manifest),
        "segmentation": bool(selected == "local" and registry.segmenter), "quality": True,
        "offlineInference": False, "aiReview": bool(selected == "openai" and configured),
        "externalAiRequired": selected == "openai", "modelStatus": "READY" if configured else "MODEL_NOT_READY",
        "classes": registry.manifest.labels if selected == "local" and registry.manifest else [],
        "message": "Faqat umumiy vizual AI izohi; klinik tasniflash va xavf baholash tasdiqlanmagan." if selected == "openai" and configured else "Tasdiqlangan model ulanmagan; texnik sifat tekshiruvi ishlaydi." if not configured else "Tadqiqot modeli ulangan; yakuniy tashxis emas.",
        "details": result,
    }


@app.post("/quality", dependencies=[Depends(auth)])
async def quality(image: Annotated[UploadFile, File()]):
    decoded = await read_image(image)
    return await run_in_threadpool(measure_quality, decoded)


@app.post("/infer", dependencies=[Depends(auth)])
async def infer(
    image: Annotated[UploadFile, File()],
    analysisId: Annotated[str, Form()] = "",
    imageId: Annotated[str, Form()] = "",
    inputRevision: Annotated[int, Form(ge=1)] = 1,
    inputDomain: Annotated[str, Form()] = "clinical",
    symptomsJson: Annotated[str, Form(max_length=16384)] = "{}",
    roiJson: Annotated[str, Form(max_length=4096)] = "null",
    external_consent: Annotated[bool, Form()] = False,
):
    selected = os.getenv("AI_PROVIDER", "local")
    if selected not in ("local", "openai"):
        await image.close()
        raise HTTPException(503, {"code": "PROVIDER_NOT_CONFIGURED", "message": "AI provayderi noto‘g‘ri sozlangan."})
    if selected == "openai" and not external_consent:
        await image.close()
        raise HTTPException(403, {"code": "EXTERNAL_AI_CONSENT_REQUIRED", "message": "Suratni OpenAI xizmatiga uzatish uchun alohida rozilik zarur."})
    if selected == "local" and registry.manifest is None:
        await image.close()
        raise HTTPException(503, {"code": "MODEL_NOT_READY", "message": "Tasdiqlangan model hali ulanmagan."})
    if selected == "local" and inputDomain not in registry.manifest.supportedInputDomains:
        await image.close()
        raise HTTPException(422, {"code": "UNSUPPORTED_DOMAIN", "message": "Bu turdagi surat uchun model tekshirilmagan."})
    try:
        symptoms, roi = json.loads(symptomsJson), json.loads(roiJson)
        if not isinstance(symptoms, dict):
            raise ValueError()
        # User ROI is contextual data only; it is never silently represented as automatic segmentation.
        if roi is not None:
            import math
            if not isinstance(roi, dict) or set(roi) != {"x", "y", "width", "height"}:
                raise ValueError()
            if not all(isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) for value in roi.values()):
                raise ValueError()
            if roi["x"] < 0 or roi["y"] < 0 or roi["width"] <= 0 or roi["height"] <= 0 or roi["x"] + roi["width"] > 1 or roi["y"] + roi["height"] > 1:
                raise ValueError()
    except (ValueError, json.JSONDecodeError):
        await image.close()
        raise HTTPException(422, {"code": "VALIDATION_ERROR", "message": "Simptom yoki ROI ma’lumoti noto‘g‘ri."})
    decoded = await read_image(image)
    assessment = await run_in_threadpool(measure_quality, decoded)
    if assessment["decision"] == "REJECT":
        raise HTTPException(422, {"code": "IMAGE_QUALITY_REJECTED", "message": "Surat texnik sifat tekshiruvidan o‘tmadi.", "quality": assessment})
    started = time.perf_counter()
    try:
        async with inference_semaphore:
            if selected == "openai":
                result = await openai_provider.describe(decoded, symptoms, roi)
            else:
                result = await asyncio.wait_for(run_in_threadpool(registry.infer, decoded), timeout=float(os.getenv("ML_INFERENCE_TIMEOUT_SECONDS", "30")))
    except openai_provider.ProviderError as exc:
        raise HTTPException(exc.status, {"code": exc.code, "message": exc.message})
    except asyncio.TimeoutError:
        raise HTTPException(504, {"code": "ML_TIMEOUT", "message": "Model uchun belgilangan vaqt tugadi."})
    except ModelUnavailable:
        raise HTTPException(503, {"code": "MODEL_NOT_READY", "message": "Tasdiqlangan model hali ulanmagan."})
    except (InvalidModelOutput, RuntimeError, ValueError, TypeError):
        raise HTTPException(502, {"code": "INVALID_MODEL_RESPONSE", "message": "Model natijasi tekshiruvdan o‘tmadi."})
    if roi is not None and "USER_ROI_CONTEXT_CROP_ANALYZED" not in result["uncertaintyReasons"]:
        result["uncertaintyReasons"].append("USER_ROI_ANNOTATION_ONLY_FULL_IMAGE_ANALYZED")
    return {"analysisId": analysisId, "imageId": imageId, "inputRevision": inputRevision, "normalizedImageHash": decoded.sha256, **result, "qualityDecision": assessment["decision"], "qualityChecks": assessment["checks"], "assessmentComplete": assessment["assessmentComplete"], "timing": {"inferenceMs": round((time.perf_counter() - started) * 1000, 2)}}
