from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from core.auth import get_current_user
from core.database import get_db
from core.models import AlbumPresent, Album, CurrentOwner, User
from core.request_models import AlbumResponse, CreateAlbumRequest, RenameAlbumRequest
from services.album_service import create_album, delete_album, rename_album



album_router = APIRouter(prefix="/albums", tags=["albums"])


def _get_owned_album(db: Session, album_id: int, owner_id: int) -> Album:
    album = db.scalar(select(Album).where(Album.album_id == album_id))
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    if album.album_owner_id != owner_id:
        raise HTTPException(status_code=403, detail="You do not own this album")

    return album


@album_router.post("", response_model=AlbumResponse)
def create_album_endpoint(
    payload: CreateAlbumRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AlbumResponse:
    try:
        if payload.user_id is not None and payload.user_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Cannot create albums for another user")

        album = create_album(db=db, user_id=current_user.user_id, title=payload.title)
        return album
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@album_router.patch("/{album_id}", response_model=AlbumResponse)
def rename_album_endpoint(
    album_id: int,
    payload: RenameAlbumRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AlbumResponse:
    try:
        _get_owned_album(db, album_id, current_user.user_id)
        album = rename_album(db=db, album_id=album_id, new_title=payload.new_title)
        return album
    except ValueError as e:
        status_code = 404 if str(e) == "Album not found" else 400
        raise HTTPException(status_code=status_code, detail=str(e))


@album_router.delete("/{album_id}")
def delete_album_endpoint(
    album_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    try:
        _get_owned_album(db, album_id, current_user.user_id)
        delete_album(db=db, album_id=album_id)
        return {"ok": True}
    except ValueError as e:
        status_code = 404 if str(e) == "Album not found" else 400
        raise HTTPException(status_code=status_code, detail=str(e))


@album_router.post("/{album_id}/presents/{present_id}")
def add_present_to_album(
    album_id: int,
    present_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    _get_owned_album(db, album_id, current_user.user_id)

    owner = db.scalar(
        select(CurrentOwner).where(
            CurrentOwner.present_id == present_id,
            CurrentOwner.owner_id == current_user.user_id,
        )
    )
    if not owner:
        raise HTTPException(status_code=403, detail="You do not own this present")

    existing = db.scalar(
        select(AlbumPresent).where(
            AlbumPresent.album_id == album_id,
            AlbumPresent.present_id == present_id,
        )
    )
    if existing:
        return {"ok": True}

    db.add(AlbumPresent(album_id=album_id, present_id=present_id))
    db.commit()
    return {"ok": True}


@album_router.delete("/{album_id}/presents/{present_id}")
def remove_present_from_album(
    album_id: int,
    present_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    _get_owned_album(db, album_id, current_user.user_id)

    item = db.scalar(
        select(AlbumPresent).where(
            AlbumPresent.album_id == album_id,
            AlbumPresent.present_id == present_id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Present not found in album")
    db.delete(item)
    db.commit()
    return {"ok": True}


@album_router.get("/{user_id}/presents")
def get_user_presents_albums(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's albums")

    user_albums = db.scalars(
        select(Album.album_id).where(Album.album_owner_id == user_id)
    ).all()
    user_album_ids = list(user_albums)
    if not user_album_ids:
        return []
    items = db.query(AlbumPresent).filter(
        AlbumPresent.album_id.in_(user_album_ids)
    ).all()
    return [
        {"album_id": item.album_id, "present_id": item.present_id}
        for item in items
    ]
