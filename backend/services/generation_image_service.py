from fastapi import HTTPException
from core.request_models import GeneratePresentRequest
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import random as rnd
from pathlib import Path
from uuid import uuid4

from PIL import Image, ImageEnhance, ImageOps, UnidentifiedImageError

from core.models import Models, Backgrounds, Symbols


load_dotenv()

IMAGES_URL = (os.getenv("REACT_APP_IMAGES_URL") or "").rstrip("/")
SERVICE_FILE = Path(__file__).resolve()
BACKEND_ROOT = SERVICE_FILE.parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent

IMAGES_DIR = BACKEND_ROOT / "images" if (BACKEND_ROOT / "images").exists() else PROJECT_ROOT / "images"

CANVAS_SIZE = 1024
MODEL_SIZE = 740
PATTERN_SIZE = 95
PATTERN_STEP = 220
PATTERN_OPACITY = 0.13
RESAMPLE = Image.Resampling.LANCZOS


def pick_random(query, error_text: str):
    count = query.count()

    if count == 0:
        raise HTTPException(status_code=400, detail=error_text)

    return query.offset(rnd.randrange(count)).first()


def add_extension(filename: str, extension: str) -> str:
    filename = str(filename)
    return filename if Path(filename).suffix else f"{filename}.{extension}"


def image_path(folder: str, filename: str, extension: str) -> Path:
    return IMAGES_DIR / folder / add_extension(filename, extension)


def image_url(folder: str, filename: str, extension: str) -> str:
    filename = add_extension(filename, extension)
    return f"{IMAGES_URL}/{folder}/{filename}" if IMAGES_URL else f"/{folder}/{filename}"


def open_image(path: Path) -> Image.Image:
    try:
        return Image.open(path).convert("RGBA")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Image file not found: {path}") from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=500, detail=f"Cannot open image file: {path}") from exc


def resize_to_fit(image: Image.Image, max_size: int) -> Image.Image:
    bbox = image.getbbox()

    if bbox:
        image = image.crop(bbox)

    scale = max_size / max(image.size)
    new_size = (int(image.width * scale), int(image.height * scale))
    return image.resize(new_size, RESAMPLE)


def make_pattern(background: Image.Image, symbol: Image.Image) -> Image.Image:
    pattern = Image.new("RGBA", background.size, (0, 0, 0, 0))
    symbol = resize_to_fit(symbol, PATTERN_SIZE)

    red, green, blue = background.convert("RGB").resize((1, 1), RESAMPLE).getpixel((0, 0))
    brightness = red * 0.299 + green * 0.587 + blue * 0.114
    color = (20, 20, 20) if brightness > 145 else (255, 255, 255)

    alpha = ImageEnhance.Brightness(symbol.getchannel("A")).enhance(PATTERN_OPACITY)
    symbol = Image.new("RGBA", symbol.size, color + (0,))
    symbol.putalpha(alpha)

    for row, y in enumerate(range(-PATTERN_SIZE // 2, CANVAS_SIZE + PATTERN_STEP, PATTERN_STEP)):
        x_shift = PATTERN_STEP // 2 if row % 2 else 0

        for x in range((-PATTERN_SIZE // 2) + x_shift, CANVAS_SIZE + PATTERN_STEP, PATTERN_STEP):
            pattern.alpha_composite(symbol, (x, y))

    return pattern


def compose_image(background_path: Path, symbol_path: Path, model_path: Path) -> Image.Image:
    background = open_image(background_path)
    background = ImageOps.fit(background, (CANVAS_SIZE, CANVAS_SIZE), method=RESAMPLE)

    symbol = open_image(symbol_path)
    model = resize_to_fit(open_image(model_path), MODEL_SIZE)

    result = background.copy()
    result.alpha_composite(make_pattern(background, symbol))

    model_x = (CANVAS_SIZE - model.width) // 2
    model_y = (CANVAS_SIZE - model.height) // 2
    result.alpha_composite(model, (model_x, model_y))

    return result


def save_image(image: Image.Image) -> str:
    filename = f"generated_{uuid4().hex}.png"
    output_path = IMAGES_DIR / "presents" / filename

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, "PNG", optimize=True)

    return filename


def generate_present_art(collection_id: int, db: Session):
    models = (
        db.query(Models)
        .filter(
            Models.collection_id == collection_id,
            Models.model_image_url.isnot(None),
            Models.model_image_url != "",
        )
        .order_by(Models.model_id)
    )
    model = pick_random(models, "Models not enough")

    backgrounds = (
        db.query(Backgrounds)
        .filter(
            Backgrounds.background_image_url.isnot(None),
            Backgrounds.background_image_url != "",
        )
        .order_by(Backgrounds.background_id)
    )
    background = pick_random(backgrounds, "BGs not enough")

    symbols = db.query(Symbols).filter(Symbols.symbol_image_url != "").order_by(Symbols.symbol_id)
    symbol = pick_random(symbols, "Symbols not enough")

    result = compose_image(
        image_path("bgs", background.background_image_url, "png"),
        image_path("symbols", symbol.symbol_image_url, "webp"),
        image_path("models", model.model_image_url, "webp"),
    )
    result_filename = save_image(result)

    return {
        "image_url": result_filename,
        "present_image": image_url("presents", result_filename, "png"),
        "present_image_url": result_filename,
        "model_id": model.model_id,
        "model_name": model.model_name,
        "model": image_url("models", model.model_image_url, "webp"),
        "background_id": background.background_id,
        "background_name": background.background_name,
        "background": image_url("bgs", background.background_image_url, "png"),
        "symbol_id": symbol.symbol_id,
        "symbol_name": symbol.symbol_name,
        "symbol": image_url("symbols", symbol.symbol_image_url, "webp"),
    }


def generate_image(payload: GeneratePresentRequest, db: Session):
    return generate_present_art(payload.collection_id, db)
