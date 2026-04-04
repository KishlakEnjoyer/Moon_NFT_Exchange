from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from core.database import get_db
from core.models import AlbumPresent, Album
from core.request_models import AlbumResponse, CreateAlbumRequest, RenameAlbumRequest
from services.album_service import create_album, delete_album, rename_album



album_router = APIRouter(prefix="/albums", tags=["albums"])


@album_router.post("", response_model=AlbumResponse)
def create_album_endpoint(
    payload: CreateAlbumRequest,
    db: Session = Depends(get_db),
) -> AlbumResponse:
    """
    Create a new album.
    Accepts user_id and title, validates them, saves the album, and returns it.
    """
    try:
        album = create_album(db=db, user_id=payload.user_id, title=payload.title)
        return album
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@album_router.patch("/{album_id}", response_model=AlbumResponse)
def rename_album_endpoint(
    album_id: int,
    payload: RenameAlbumRequest,
    db: Session = Depends(get_db),
) -> AlbumResponse:
    """
    Rename an existing album.
    Accepts an album ID and a new title, updates the album, and returns the updated record.
    """
    try:
        album = rename_album(db=db, album_id=album_id, new_title=payload.new_title)
        return album
    except ValueError as e:
        status_code = 404 if str(e) == "Album not found" else 400
        raise HTTPException(status_code=status_code, detail=str(e))


@album_router.delete("/{album_id}")
def delete_album_endpoint(
    album_id: int,
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    """
    Delete an existing album.
    Accepts an album ID, removes the album from the database, and returns a success flag.
    """
    try:
        delete_album(db=db, album_id=album_id)
        return {"ok": True}
    except ValueError as e:
        status_code = 404 if str(e) == "Album not found" else 400
        raise HTTPException(status_code=status_code, detail=str(e))


@album_router.post("/{album_id}/presents/{present_id}")
def add_present_to_album(
    album_id: int,
    present_id: int,
    db: Session = Depends(get_db),
) -> dict[str, bool]:
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
    db: Session = Depends(get_db),
) -> dict[str, bool]:
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
    db: Session = Depends(get_db),
):
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
