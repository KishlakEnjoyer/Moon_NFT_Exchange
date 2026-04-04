from fastapi import HTTPException
from core.request_models import GeneratePresentRequest
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import random as rnd

from PIL import Image
from PIL import features
import PIL

from core.models import Collections, Models, Backgrounds, Symbols



load_dotenv()

IMAGES_PATH = os.getenv('REACT_APP_IMAGES_URL')

def generate_image(payload: GeneratePresentRequest, db: Session):
    # Get model
    collection_id = payload.collection_id
    available_models = db.query(Models).filter(Models.collection_id == collection_id)
    models_count = available_models.count()

    if models_count <= 0:
        raise HTTPException(status_code=400, detail="Models not enough")
    
    random_model = available_models[rnd.randint(1, models_count)]
    model_image = f'{IMAGES_PATH}/models/{random_model.model_image_url}.webp'

    # Get background
    backgrounds = db.query(Backgrounds)
    bgs_count = backgrounds.count()

    if bgs_count <= 0:
        raise HTTPException(status_code=400, detail="BGs not enough")
    
    random_bg = backgrounds[rnd.randint(1, bgs_count)]
    bg_image = f'{IMAGES_PATH}/bgs/{random_bg.background_image_url}.png'

    # Get Symbol
    symbols = db.query(Symbols)
    symbols_count = symbols.count()

    if symbols_count <= 0:
        raise HTTPException(status_code=400, detail="Symbols not enough")
    
    random_symbol = symbols[rnd.randint(1, symbols_count)]
    symbol_image = f'{IMAGES_PATH}/symbols/{random_symbol.symbol_image_url}.webp'

    print(".webp" in Image.registered_extensions())

    return {
        "model": model_image,
        "background": bg_image,
        "symbol": symbol_image
    }