import binascii
import base64
import re
import uuid
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from core.models import Album, AlbumPresent, CurrentOwner, Listing, Present, Transaction, User
from services.blockchain.token_service import get_token_balance
from services.blockchain.wallet_service import get_native_balance_eth


USERNAME_REGEX = re.compile(r"^[A-Za-z0-9_]{3,32}$")
PROFILE_IMAGE_DATA_URL_REGEX = re.compile(r"^data:(image/(png|jpeg|webp));base64,(.+)$", re.DOTALL)
PROFILE_IMAGE_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}
PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
ABOUT_ME_MAX_LENGTH = 150
DEFAULT_PROFILE_PICTURE_NAMES = {"example_user.png", "ava.png"}


def _get_profile_picture_dir() -> Path:
    backend_images_dir = Path(__file__).resolve().parents[1] / "images" / "pfps"
    repo_images_dir = Path(__file__).resolve().parents[2] / "images" / "pfps"

    for candidate in (backend_images_dir, repo_images_dir):
        if candidate.exists():
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate

    repo_images_dir.mkdir(parents=True, exist_ok=True)
    return repo_images_dir


def _serialize_editable_profile(user: User) -> dict:
    return {
        "user_id": user.user_id,
        "username": user.username,
        "tg_username": user.tg_username,
        "tg_visibility": user.tg_visibility,
        "profile_pic_url": user.profile_pic_url,
        "about_me": user.about_me,
    }


def _validate_username(username: str) -> str:
    username = username.strip()

    if not username:
        raise ValueError("Username cannot be empty")

    if not USERNAME_REGEX.fullmatch(username):
        raise ValueError("Username must be 3-32 characters long and use only letters, numbers, and underscores")

    return username


def _validate_about_me(about_me: str | None) -> str | None:
    if about_me is None:
        return None

    about_me = about_me.strip()
    if not about_me:
        return None

    if len(about_me) > ABOUT_ME_MAX_LENGTH:
        raise ValueError(f"About me must be {ABOUT_ME_MAX_LENGTH} characters or fewer")

    return about_me


def _validate_tg_visibility(tg_visibility: int) -> int:
    if tg_visibility not in (0, 1):
        raise ValueError("Telegram visibility must be 0 or 1")

    return tg_visibility


def _delete_old_profile_picture(filename: str | None) -> None:
    if not filename or filename in DEFAULT_PROFILE_PICTURE_NAMES:
        return

    picture_path = _get_profile_picture_dir() / filename
    if picture_path.exists():
        picture_path.unlink()


def _save_profile_picture(data_url: str, current_filename: str | None) -> str:
    match = PROFILE_IMAGE_DATA_URL_REGEX.fullmatch(data_url.strip())
    if not match:
        raise ValueError("Profile image must be a PNG, JPG, or WEBP file")

    mime_type = match.group(1)
    image_data = match.group(3)
    file_extension = PROFILE_IMAGE_EXTENSIONS[mime_type]

    try:
        image_bytes = base64.b64decode(image_data, validate=True)
    except (ValueError, binascii.Error):
        raise ValueError("Profile image is not valid base64 data")

    if not image_bytes:
        raise ValueError("Profile image cannot be empty")

    if len(image_bytes) > PROFILE_IMAGE_MAX_BYTES:
        raise ValueError("Profile image must be 5 MB or smaller")

    filename = f"{uuid.uuid4().hex}{file_extension}"
    profile_picture_dir = _get_profile_picture_dir()
    (profile_picture_dir / filename).write_bytes(image_bytes)
    _delete_old_profile_picture(current_filename)

    return filename


def get_user_profile_stats_by_tg_id(db: Session, tg_id: int) -> dict:
    user = db.scalar(select(User).where(User.user_tg_id == tg_id))

    if not user:
        raise ValueError(f"User with tg_id={tg_id} not found")

    gifts_count = db.scalar(
        select(func.count())
        .select_from(CurrentOwner)
        .where(CurrentOwner.owner_id == user.user_id)
    ) or 0

    active_listings_count = db.scalar(
        select(func.count())
        .select_from(Listing)
        .where(
            Listing.seller_id == user.user_id,
            Listing.status_id == 1,
        )
    ) or 0

    sales_count = db.scalar(
        select(func.count())
        .select_from(Transaction)
        .where(
            Transaction.seller_id == user.user_id,
            Transaction.status_id == 2,
            Transaction.type_id == 2,
        )
    ) or 0

    native_balance = "0"
    token_balance = "0"

    if user.wallet_address:
        try:
            native_balance = get_native_balance_eth(user.wallet_address)
        except Exception:
            native_balance = "0"
        try:
            token_balance = get_token_balance(user.wallet_address)
        except Exception:
            token_balance = "0"

    return {
        "user_id": user.user_id,
        "user_tg_id": user.user_tg_id,
        "username": user.username,
        "tg_username": user.tg_username,
        "wallet_address": user.wallet_address,
        "profile_pic_url": user.profile_pic_url,
        "about_me": user.about_me,
        "is_active": user.is_active,
        "role": user.role.role_name if user.role else None,
        "gifts_count": int(gifts_count),
        "active_listings_count": int(active_listings_count),
        "sales_count": int(sales_count),
        "native_balance": native_balance,
        "token_balance": token_balance,
    }


def get_user_profile_info_by_username(db: Session, username: str) -> dict:
    user = db.scalar(
        select(User)
        .where(User.username == username)
        .options(
            joinedload(User.albums).joinedload(Album.album_presents).joinedload(AlbumPresent.present)
        )
    )

    if not user:
        raise ValueError(f"User with username={username} not found")

    token_balance = "0"
    if user.wallet_address:
        try:
            token_balance = get_token_balance(user.wallet_address)
        except Exception:
            token_balance = "0"

    presents = db.scalars(
        select(Present)
        .join(CurrentOwner, CurrentOwner.present_id == Present.present_id)
        .where(CurrentOwner.owner_id == user.user_id, Present.is_burned == 0)
        .options(
            joinedload(Present.collection),
            joinedload(Present.model),
            joinedload(Present.background),
            joinedload(Present.symbol),
        )
    ).all()

    present_ids = [p.present_id for p in presents]

    active_listing_ids = set()
    if present_ids:
        active_listing_ids = set(
            db.scalars(
                select(Listing.listing_id).where(
                    Listing.status_id == 1,
                    Listing.present_id.in_(present_ids)
                )
            ).all()
        )

    return {
        "user_id": user.user_id,
        "user_tg_id": user.user_tg_id,
        "username": user.username,
        "tg_username": user.tg_username,
        "tg_visibility": user.tg_visibility,
        "profile_pic_url": user.profile_pic_url,
        "about_me": user.about_me,
        "is_active": user.is_active,
        "role": user.role.role_name if user.role else None,
        "token_balance": token_balance,
        "albums": [
            {
                "album_id": album.album_id,
                "album_title": album.album_title,
                "present_ids": [ap.present_id for ap in album.album_presents],
            }
            for album in user.albums
        ],
        "presents": [
            {
                "present_id": p.present_id,
                "present_num": p.present_num,
                "token_id": p.token_id,
                "image_url": p.image_url,
                "metadata_uri": p.metadata_uri,
                "generated_at": p.generated_at,
                "model_id": p.model_id,
                "is_visible": p.is_visible,
                "is_on_sale": p.present_id in active_listing_ids,
                "collection": {
                    "collection_id": p.collection.collection_id,
                    "collection_name": p.collection.collection_name,
                    "collection_image_url": p.collection.collection_image_url,
                } if p.collection else None,
            }
            for p in presents
        ],
    }


def update_user_profile(
    db: Session,
    user_id: int,
    username: str,
    about_me: str | None,
    tg_visibility: int,
    profile_pic_data_url: str | None = None,
) -> dict:
    """
    Update editable user profile fields and optionally save a new profile picture.
    Returns the updated profile payload for the client.
    """
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user:
        raise ValueError("User not found")

    username = _validate_username(username)
    about_me = _validate_about_me(about_me)
    tg_visibility = _validate_tg_visibility(tg_visibility)

    existing_user = db.scalar(
        select(User).where(User.username == username, User.user_id != user_id)
    )
    if existing_user:
        raise ValueError("Username is already taken")

    user.username = username
    user.about_me = about_me
    user.tg_visibility = tg_visibility

    if profile_pic_data_url:
        user.profile_pic_url = _save_profile_picture(profile_pic_data_url, user.profile_pic_url)

    db.commit()
    db.refresh(user)

    return _serialize_editable_profile(user)
