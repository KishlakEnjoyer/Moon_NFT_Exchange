from fastapi import FastAPI

app = FastAPI(
    title="Moon NFT Exchange API",
    description="Backend for decentralized NFT trading platform",
    version="0.1.0"
)

@app.get("/")
async def root():
    return {"message": "Welcome to Moon NFT Exchange API!"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}