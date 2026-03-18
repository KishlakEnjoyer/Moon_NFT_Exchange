from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "moon_db"

    BLOCKCHAIN_URL: str = "http://127.0.0.1:8545"
    OWNER_PRIVATE_KEY: str = ""

    BOT_TOKEN: str = ""
    JWT_SECRET: str = "super-secret-change-in-prod"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    API_URL: str = "http://127.0.0.1:8000"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    class Config:
        env_file = "../.env"

settings = Settings()