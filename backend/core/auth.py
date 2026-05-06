from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User
from utils.jwt import decode_jwt

security = HTTPBearer(auto_error=False)


def _get_unauthorized_exception(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _extract_user_id_from_token(token: str) -> int:
    payload = decode_jwt(token)
    subject = payload.get("sub")

    if subject is None:
        subject = payload.get("user_id")

    if subject is None:
        raise ValueError("Invalid token payload")

    return int(subject)


def get_user_id_from_token(token: str) -> int:
    try:
        return _extract_user_id_from_token(token)
    except Exception as exc:
        raise _get_unauthorized_exception("Invalid token") from exc


def get_current_user_any(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _get_unauthorized_exception("Not authenticated")

    try:
        user_id = _extract_user_id_from_token(credentials.credentials)
    except Exception as exc:
        raise _get_unauthorized_exception("Invalid token") from exc

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise _get_unauthorized_exception("User not found")

    return user


def get_optional_current_user_any(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None

    try:
        user_id = _extract_user_id_from_token(credentials.credentials)
    except Exception:
        return None

    return db.query(User).filter(User.user_id == user_id).first()


def get_current_user(
    current_user: User = Depends(get_current_user_any),
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    return current_user
