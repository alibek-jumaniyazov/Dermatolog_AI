from __future__ import annotations

import hashlib
import io
import warnings
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 25_000_000
MIN_SIDE = 256
ALLOWED = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


class ImageValidationError(ValueError):
    def __init__(self, code: str, message: str, status: int = 422):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


@dataclass
class DecodedImage:
    rgb: np.ndarray
    sha256: str

    @property
    def size(self) -> tuple[int, int]:
        return self.rgb.shape[1], self.rgb.shape[0]


def decode_image(data: bytes, content_type: str | None) -> DecodedImage:
    if not data or len(data) > MAX_BYTES:
        raise ImageValidationError("IMAGE_SIZE_INVALID", "Surat bo‘sh yoki 10 MiB limitdan katta.", 413)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as source:
                if source.format not in ALLOWED or ALLOWED[source.format] != content_type:
                    raise ImageValidationError("IMAGE_FORMAT_INVALID", "JPEG, PNG yoki WebP formati va MIME bir-biriga mos bo‘lishi kerak.", 415)
                if getattr(source, "is_animated", False):
                    raise ImageValidationError("ANIMATED_IMAGE", "Animatsiyali surat qabul qilinmaydi.", 415)
                width, height = source.size
                if width * height > MAX_PIXELS:
                    raise ImageValidationError("PIXEL_LIMIT", "Surat 25 megapikseldan oshmasligi kerak.", 413)
                if min(width, height) < MIN_SIDE:
                    raise ImageValidationError("IMAGE_TOO_SMALL", "Suratning eng qisqa tomoni kamida 256 piksel bo‘lsin.")
                source.load()
                normalized = ImageOps.exif_transpose(source)
                if "A" in normalized.getbands():
                    background = Image.new("RGBA", normalized.size, "white")
                    normalized = Image.alpha_composite(background, normalized.convert("RGBA"))
                rgb = np.array(normalized.convert("RGB"), dtype=np.uint8)
    except ImageValidationError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ImageValidationError("IMAGE_DECODE_FAILED", "Suratni xavfsiz o‘qib bo‘lmadi.") from exc
    return DecodedImage(rgb=rgb, sha256=hashlib.sha256(data).hexdigest())


def measure_quality(image: DecodedImage) -> dict:
    width, height = image.size
    # Normalize analysis resolution so a megapixel image does not appear sharper just because it is larger.
    factor = min(1.0, 640.0 / max(width, height))
    measured = cv2.resize(image.rgb, (max(1, round(width * factor)), max(1, round(height * factor))), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(measured, cv2.COLOR_RGB2GRAY)
    laplacian = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())
    dark_fraction = float((gray < 20).mean())
    light_fraction = float((gray > 245).mean())
    # Laplacian variance depends on scene texture, compression and scale as well as focus.
    # Smooth skin or a visible low-texture region can have a very low score. Until a
    # domain-validated focus model exists, this metric can warn but cannot reject.
    blur_status = "WARN" if laplacian < 60 else "PASS"
    exposure_status = "REJECT" if dark_fraction > 0.85 or light_fraction > 0.85 else "WARN" if brightness < 45 or brightness > 220 else "PASS"
    # Reserve the no-detail rejection for near-constant source pixels, not low edge
    # energy. Check every RGB channel at source resolution so a coloured region or
    # a pattern lost during resizing is not mistaken for an empty image.
    spatial_range = int(np.ptp(image.rgb, axis=(0, 1)).max())
    detail_status = "REJECT" if spatial_range <= 2 else "PASS"
    checks = [
        {"code": "BLUR", "status": blur_status, "value": round(laplacian, 4), "message": "Tasvirda mayda tafsilotlar kam yoki fokus yumshoq. Aniqroq surat tavsiya etiladi; bu o‘lchovning o‘zi tasvirni yaroqsiz deb belgilamaydi." if blur_status != "PASS" else "Texnik fokus tekshiruvi o‘tdi."},
        {"code": "EXPOSURE", "status": exposure_status, "value": round(brightness, 4), "message": "Yorug‘likni tekislang, kuchli soya va yaltirashdan saqlaning." if exposure_status != "PASS" else "Texnik yorug‘lik tekshiruvi o‘tdi."},
        {"code": "INFORMATION_CONTENT", "status": detail_status, "value": spatial_range, "message": "Tasvir deyarli bir xil rangdan iborat; ko‘rinadigan tafsilotlar yo‘q. Boshqa surat yuklang." if detail_status == "REJECT" else "Tasvir bir xil rangli bo‘sh maydon emas; klinik yaroqliligi bu bilan tasdiqlanmaydi."},
        {"code": "SKIN_AND_LESION_VISIBILITY", "status": "NOT_ASSESSED", "message": "Teri va zararlangan joy ko‘rinishini baholovchi tasdiqlangan model ulanmagan."},
        {"code": "DISTANCE", "status": "NOT_ASSESSED", "message": "Kamera masofasi avtomatik tekshirilmadi."},
        {"code": "OCCLUSION", "status": "NOT_ASSESSED", "message": "Zararlangan joyning to‘silishi avtomatik tekshirilmadi."},
    ]
    statuses = {check["status"] for check in checks}
    decision = "REJECT" if "REJECT" in statuses else "WARN" if "WARN" in statuses else "PASS"
    return {"decision": decision, "assessmentComplete": False, "checks": checks, "width": width, "height": height, "sha256": image.sha256, "methodVersion": "opencv-quality-v2", "clinicalValidation": False}


def png_base64(array: np.ndarray) -> str:
    import base64

    buffer = io.BytesIO()
    Image.fromarray(array).save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")
