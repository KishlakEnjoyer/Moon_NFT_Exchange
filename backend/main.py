from fastapi import FastAPI
from blockchain_router import router as blockchain_router
from auth_router import router as auth_router

app = FastAPI(title="Moon NFT Exchange API")

app.include_router(blockchain_router)
app.include_router(auth_router)
