from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select

from ..deps import SessionDep, require_developer, require_user
from ..models import Album, Media, User
from ..utils.api import AppError, success

router = APIRouter(prefix="/albums", tags=["albums"])


class AlbumCreate(BaseModel):
    title: str
    visibility: str = "private"


class AlbumUpdate(BaseModel):
    title: Optional[str] = None
    visibility: Optional[str] = None
    cover_media_id: Optional[int] = None


def _album_dict(album: Album) -> dict:
    return {
        "id": album.id,
        "title": album.title,
        "visibility": album.visibility,
        "created_at": album.created_at,
        "owner_id": album.owner_id,
        "cover_media_id": album.cover_media_id,
    }


def _validate_visibility(value: str) -> str:
    normalized = value.lower()
    if normalized not in {"private", "unlisted", "public"}:
        raise AppError(status_code=400, code=40002, message="INVALID_VISIBILITY")
    return normalized


@router.get("")
def list_albums(
    session: SessionDep,
    current_user: User = Depends(require_user),
    visibility: Optional[str] = Query(default=None),
):
    query = select(Album)
    if visibility:
        _validate_visibility(visibility)
        query = query.where(Album.visibility == visibility)

    if current_user.role != "developer":
        query = query.where((Album.visibility != "private") | (Album.owner_id == current_user.id))

    albums = session.execute(query.order_by(Album.created_at.desc())).scalars().all()
    return success([_album_dict(album) for album in albums])


@router.post("")
def create_album(body: AlbumCreate, session: SessionDep, current_user: User = Depends(require_developer)):
    visibility = _validate_visibility(body.visibility)
    album = Album(owner_id=current_user.id, title=body.title, visibility=visibility)
    session.add(album)
    session.commit()
    session.refresh(album)
    return success(_album_dict(album))


@router.patch("/{album_id}")
def update_album(
    album_id: int,
    body: AlbumUpdate,
    session: SessionDep,
    current_user: User = Depends(require_developer),
):
    album = session.get(Album, album_id)
    if not album:
        raise AppError(status_code=404, code=40400, message="ALBUM_NOT_FOUND")

    if body.title is not None:
        album.title = body.title
    if body.visibility is not None:
        album.visibility = _validate_visibility(body.visibility)
    if body.cover_media_id is not None:
        media = session.get(Media, body.cover_media_id)
        if not media:
            raise AppError(status_code=404, code=40400, message="MEDIA_NOT_FOUND")
        if media.album_id != album.id:
            raise AppError(status_code=400, code=40003, message="MEDIA_NOT_IN_ALBUM")
        album.cover_media_id = body.cover_media_id

    session.commit()
    session.refresh(album)
    return success(_album_dict(album))


@router.delete("/{album_id}")
def delete_album(album_id: int, session: SessionDep, current_user: User = Depends(require_developer)):
    album = session.get(Album, album_id)
    if not album:
        raise AppError(status_code=404, code=40400, message="ALBUM_NOT_FOUND")
    session.delete(album)
    session.commit()
    return success(message="DELETED")
