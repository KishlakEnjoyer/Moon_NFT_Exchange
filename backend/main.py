from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()



gifts = []

@app.get("/gifts")
def get_gifts():
    return gifts
