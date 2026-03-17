from fastapi import FastAPI
from pydantic import BaseModel
from blockchain_router import router as blockchain_router

app = FastAPI()
app.include_router(blockchain_router)


gifts = []

@app.get("/gifts")
def get_gifts():
    return gifts
