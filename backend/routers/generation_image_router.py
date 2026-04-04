from fastapi import APIRouter, HTTPException, Depends
from services.generation_image_service import generate_image
from sqlalchemy.orm import Session

from core.database import get_db
from core.request_models import GeneratePresentRequest


image_generator_router = APIRouter(prefix="/generate", tags=["generate"])


@image_generator_router.post('/present_image')
def generate(payload: GeneratePresentRequest, db: Session = Depends(get_db)):
    return generate_image(payload=payload, db=db)
