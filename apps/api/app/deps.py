# app/deps.py
from fastapi import Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User


# =========================================================
# 🔐 SECURITY SCHEME
# =========================================================

security = HTTPBearer(auto_error=False)


# =========================================================
# 👤 GET CURRENT USER (STRICT & SAFE)
# =========================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:

    # -------------------------------------
    # CHECK CREDENTIALS
    # -------------------------------------
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = credentials.credentials

    # -------------------------------------
    # DECODE TOKEN
    # -------------------------------------
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # -------------------------------------
    # FETCH USER
    # -------------------------------------
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


# =========================================================
# 🔐 WEBSOCKET AUTHENTICATION
# =========================================================

async def get_current_user_websocket(
    token: str,
    db: Session,
) -> Optional[User]:
    """
    Authenticate user for WebSocket connection.
    Returns User if valid, None otherwise.
    """
    if not token:
        return None
    
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )

        user_id = payload.get("sub")

        if not user_id:
            return None

    except JWTError:
        return None

    user = db.query(User).filter(User.id == int(user_id)).first()
    return user


# =========================================================
# 🔐 OPTIONAL USER (FOR PUBLIC ROUTES)
# =========================================================

def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:

    if credentials is None:
        return None

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )

        user_id = payload.get("sub")

        if not user_id:
            return None

    except JWTError:
        return None

    return db.query(User).filter(User.id == int(user_id)).first()


# =========================================================
# 🔐 ROLE-BASED ACCESS CONTROL
# =========================================================

def require_roles(*allowed_roles: str):

    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return current_user

    return role_checker