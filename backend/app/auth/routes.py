from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import (
    ACCESS_TOKEN_COOKIE,
    SessionDep,
    create_access_token,
    require_user,
    verify_password,
)
from ..models import User
from ..utils.api import AppError, success

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


def _user_payload(user: User) -> dict:
    return {"id": user.id, "username": user.username, "role": user.role}


@router.post("/login")
def login(body: LoginRequest, session: SessionDep) -> JSONResponse:
    user = session.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise AppError(status_code=401, code=40100, message="INVALID_CREDENTIALS")

    token = create_access_token(user=user)
    response = JSONResponse(success({"user": _user_payload(user)}))
    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        token,
        httponly=True,
        max_age=settings.JWT_EXPIRE_HOURS * 3600,
        samesite="lax",
    )
    return response


@router.post("/logout")
def logout(_: User = Depends(require_user)) -> JSONResponse:
    response = JSONResponse(success(message="LOGGED_OUT"))
    response.delete_cookie(ACCESS_TOKEN_COOKIE)
    return response


@router.get("/me")
def me(current_user: User = Depends(require_user)) -> dict:
    return success({"user": _user_payload(current_user)})
