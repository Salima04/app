"""Auth utilities: JWT + bcrypt."""
import os
import secrets
import bcrypt
import jwt
from pathlib import Path
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User


def _load_jwt_secret() -> str:
    """Load JWT secret. If the env value is a known weak/default placeholder,
    generate a strong random one and persist it to disk (avoids invalidating tokens on restart)."""
    raw = os.environ.get("JWT_SECRET", "")
    weak_markers = ("change-in-prod", "changeme", "your-secret", "secret", "default")
    is_weak = (not raw) or len(raw) < 40 or any(m in raw.lower() for m in weak_markers)
    if not is_weak:
        return raw
    secret_file = Path(__file__).parent / ".jwt_secret"
    if secret_file.exists():
        val = secret_file.read_text().strip()
        if len(val) >= 40:
            return val
    strong = secrets.token_urlsafe(64)
    try:
        secret_file.write_text(strong)
        secret_file.chmod(0o600)
    except Exception:
        pass
    return strong


JWT_SECRET = _load_jwt_secret()
JWT_ALGO = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))

security = HTTPBearer()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(creds.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user or not user.active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user
