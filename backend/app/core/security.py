import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import bcrypt
import httpx
from jose import jwt, JWTError
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str | Any) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict[str, Any]]:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        return None


_SUPABASE_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_SUPABASE_CACHE_TTL_S = 60.0


def verify_supabase_token(token: str) -> Optional[dict[str, Any]]:
    """
    Valida un access token de Supabase Auth consultando `GET /auth/v1/user`.
    Funciona con cualquier algoritmo de firma del proyecto (HS256 o claves asimétricas).
    Devuelve {"id", "email", "full_name", "provider"} o None si el token no es válido.
    """
    base = settings.NEXT_PUBLIC_SUPABASE_URL.rstrip("/")
    if not base or not settings.SUPABASE_ANON_KEY or not token:
        return None

    now = time.monotonic()
    cached = _SUPABASE_CACHE.get(token)
    if cached and now - cached[0] < _SUPABASE_CACHE_TTL_S:
        return cached[1]

    try:
        res = httpx.get(
            f"{base}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.SUPABASE_ANON_KEY,
            },
            timeout=8.0,
        )
    except httpx.HTTPError:
        return None
    if res.status_code != 200:
        return None

    data = res.json()
    email = (data.get("email") or "").lower()
    if not data.get("id") or not email:
        return None
    meta = data.get("user_metadata") or {}
    info = {
        "id": data["id"],
        "email": email,
        "full_name": meta.get("full_name") or meta.get("name") or email.split("@")[0],
        "provider": (data.get("app_metadata") or {}).get("provider", "email"),
    }
    if len(_SUPABASE_CACHE) > 500:
        _SUPABASE_CACHE.clear()
    _SUPABASE_CACHE[token] = (now, info)
    return info
