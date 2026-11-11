from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "FitProIA API"
    APP_VERSION: str = "1.0.0-mvp"
    API_V1_STR: str = "/api/v1"

    # Soporta Supabase PostgreSQL (postgresql://...) o SQLite local para desarrollo instantáneo
    DATABASE_URL: str = "sqlite:///./fitproia.db"

    # Seguridad JWT con sesión persistente para PWA en iPhone
    JWT_SECRET_KEY: str = "fitproia-super-secret-key-colombia-2026-ley1581"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7      # 7 días access token
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 90                # 90 días refresh token en PWA

    # Supabase & Gemini (listos para Fase 2 y producción)
    NEXT_PUBLIC_SUPABASE_URL: str = "https://jddtzjqsoktcthxbxhbh.supabase.co"
    SUPABASE_ANON_KEY: str = "sb_publishable_fNyIXvq_tMeEQnJ6puxztQ_waSvVow4"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    GEMINI_API_KEY: str = ""
    # Gemini AI - Modelos en orden de prioridad: 3.8 -> 3.7 -> 3.6 -> 3.5 -> 3.0 -> 2.5 -> 2.0 -> 1.5
    GEMINI_VISION_MODEL: str = "gemini-2.5-flash"
    GEMINI_FALLBACK_MODELS: str = (
        "gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.0-flash,"
        "gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-pro"
    )

    # Autenticación real (Supabase Auth: email / Google / Apple).
    # En producción (Render) poner REQUIRE_AUTH=true: se desactiva el usuario demo por defecto.
    REQUIRE_AUTH: bool = False

    # Orígenes permitidos por CORS, separados por coma (ej. https://fitproia.vercel.app).
    CORS_ORIGINS: str = "*"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
