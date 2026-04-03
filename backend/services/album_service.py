import re
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.models import Album, User


MAX_ALBUMS_PER_USER = 10
MAX_ALBUM_TITLE_LENGTH = 30
ALBUM_TITLE_REGEX = re.compile(rf"^[\w\s\-\.]{{1,{MAX_ALBUM_TITLE_LENGTH}}}$", re.UNICODE)


def validate_album_title(title: str) -> str:
    """Strip and validate an album title, returning the cleaned value or raising ValueError."""
    title = title.strip()

    if not title:
        raise ValueError("Album title cannot be empty")

    if len(title) > MAX_ALBUM_TITLE_LENGTH:
        raise ValueError(f"Album title must be {MAX_ALBUM_TITLE_LENGTH} characters or fewer")

    if not ALBUM_TITLE_REGEX.match(title):
        raise ValueError("Album title contains invalid characters")

    return title


def create_album(db: Session, user_id: int, title: str) -> Album:
    """
    Create a new album for a user.
    - Validates the title
    - Verifies that the user exists
    - Saves the album to the database and returns it
    """
    title = validate_album_title(title)

    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user:
        raise ValueError("User not found")

    album_count = db.scalar(
        select(func.count())
        .select_from(Album)
        .where(Album.album_owner_id == user_id)
    ) or 0
    if album_count >= MAX_ALBUMS_PER_USER:
        raise ValueError(f"Users can have at most {MAX_ALBUMS_PER_USER} albums")

    album = Album(
        album_owner_id=user_id,
        album_title=title,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(album)
    db.commit()
    db.refresh(album)

    return album


def rename_album(db: Session, album_id: int, new_title: str) -> Album:
    """
    Rename an album.
    - Validates the new title
    - Verifies that the album exists
    - Updates the title and timestamp, saves the changes, and returns the album
    """
    new_title = validate_album_title(new_title)

    album = db.scalar(select(Album).where(Album.album_id == album_id))
    if not album:
        raise ValueError("Album not found")

    album.album_title = new_title
    album.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(album)

    return album


def delete_album(db: Session, album_id: int) -> None:
    """
    Delete an album.
    - Verifies that the album exists
    - Removes the album from the database
    """
    album = db.scalar(select(Album).where(Album.album_id == album_id))
    if not album:
        raise ValueError("Album not found")

    db.delete(album)
    db.commit()
