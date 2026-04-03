from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
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
