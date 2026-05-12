from io import BytesIO
import base64
import binascii
import re

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
import requests

from PIL import Image
from transformers import pipeline


nsfw_detector_router = APIRouter(
    prefix="/nsfw-detector",
    tags=["nsfw-detector"],
)

NSFW_IMAGE_DATA_URL_REGEX = re.compile(r"^data:image/(png|jpeg|webp);base64,(.+)$", re.DOTALL)
NSFW_IMAGE_MAX_BYTES = 5 * 1024 * 1024
classifier_falconsai = None


class NSFWDetectionRequest(BaseModel):
    image_url: str | None = None
    image_data_url: str | None = None


def warmup_nsfw_detector() -> None:
    classifier = _get_classifier()
    image = Image.new("RGB", (224, 224), color=(255, 255, 255))
    classifier(image)


def _get_classifier():
    global classifier_falconsai
    if classifier_falconsai is None:
        classifier_falconsai = pipeline("image-classification", model="Falconsai/nsfw_image_detection")
    return classifier_falconsai

def preload_nsfw_detector() -> None:
    _get_classifier()


def _open_image_from_bytes(image_bytes: bytes) -> Image.Image:
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image cannot be empty")

    if len(image_bytes) > NSFW_IMAGE_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")

    try:
        return Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Image file is invalid")


def _load_image(payload: NSFWDetectionRequest) -> Image.Image:
    if payload.image_data_url:
        match = NSFW_IMAGE_DATA_URL_REGEX.fullmatch(payload.image_data_url.strip())
        if not match:
            raise HTTPException(status_code=400, detail="Image must be a PNG, JPG, or WEBP file")

        try:
            image_bytes = base64.b64decode(match.group(2), validate=True)
        except (ValueError, binascii.Error):
            raise HTTPException(status_code=400, detail="Image is not valid base64 data")

        return _open_image_from_bytes(image_bytes)

    if payload.image_url:
        try:
            response = requests.get(str(payload.image_url), timeout=10)
            response.raise_for_status()
        except requests.RequestException as e:
            raise HTTPException(status_code=400, detail=str(e))

        return _open_image_from_bytes(response.content)

    raise HTTPException(status_code=400, detail="Image is required")


@nsfw_detector_router.post("/detect")
def detect_nsfw_content(
    payload: NSFWDetectionRequest
):
    try:
        img = _load_image(payload)
        results = _get_classifier()(img)
        top_result = max(results, key=lambda item: item.get("score", 0)) if results else {}
        if str(top_result.get("label", "")).lower() == "nsfw" and top_result.get("score", 0) > 0.5:
            return False
        return True
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
