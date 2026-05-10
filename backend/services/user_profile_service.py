import binascii
import base64
import re
import uuid
from pathlib import Path

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from core.models import (
    Achievement,
    Album,
    AlbumPresent,
    CurrentOwner,
    Listing,
    ListingStatuses,
    Present,
    Transaction,
    TransactionHistory,
    User,
    UserAchievement,
    UserFollow,
)
from services.admin_platform_service import (
    create_moderation_item,
    get_profile_badge_achievement_id,
)
from services.blockchain.token_service import get_token_balance
from services.blockchain.wallet_service import get_native_balance_eth
from services.achievement_service import achievement_progress_to_dict, achievement_to_dict
from services.profile_content_moderation_service import validate_profile_content


USERNAME_REGEX = re.compile("^[A-Za-z\u0400-\u04FF0-9_]{3,32}$")
PROFILE_IMAGE_DATA_URL_REGEX = re.compile(
    r"^data:(image/(png|jpe?g|webp));base64,([A-Za-z0-9+/=\s]+)$",
    re.IGNORECASE,
)
PROFILE_IMAGE_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
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
        "user_tg_id": user.user_tg_id,
        "user_vk_id": user.user_vk_id,
        "username": user.username,
        "tg_username": user.tg_username,
        "vk_username": user.vk_username,
        "tg_visibility": user.tg_visibility,
        "vk_visibility": user.vk_visibility,
        "profile_pic_url": user.profile_pic_url,
        "about_me": user.about_me,
    }


def _validate_username(username: str) -> str:
    username = username.strip()

    if not username:
        raise ValueError("Username cannot be empty")

    if not USERNAME_REGEX.fullmatch(username):
        raise ValueError("Username must be 3-32 characters long and use only Russian/English letters, numbers, and underscores")

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


def _validate_platform_visibility(platform_name: str, visibility: int) -> int:
    if visibility not in (0, 1):
        raise ValueError(f"{platform_name} visibility must be 0 or 1")

    return visibility


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

    mime_type = match.group(1).lower()
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

    active_listings_count = 0
    if user.is_active:
        active_listings_count = db.scalar(
            select(func.count())
            .select_from(Listing)
            .where(
                Listing.seller_id == user.user_id,
                Listing.status.has(ListingStatuses.status_name == "active"),
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

    if user.is_active and user.wallet_address:
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
        "user_vk_id": user.user_vk_id,
        "username": user.username,
        "tg_username": user.tg_username,
        "vk_username": user.vk_username,
        "tg_visibility": user.tg_visibility,
        "vk_visibility": user.vk_visibility,
        "wallet_address": user.wallet_address,
        "profile_pic_url": user.profile_pic_url if user.is_active else None,
        "about_me": user.about_me,
        "is_active": user.is_active,
        "role": user.role.role_name if user.role else None,
        "gifts_count": int(gifts_count),
        "active_listings_count": int(active_listings_count),
        "sales_count": int(sales_count),
        "native_balance": native_balance,
        "token_balance": token_balance,
    }


def _can_view_private_socials(user: User, viewer_user_id: int | None) -> bool:
    return viewer_user_id is not None and viewer_user_id == user.user_id


def _visible_social_value(value, visibility: int, can_view_private: bool):
    if can_view_private or int(visibility) == 1:
        return value
    return None


def _get_top_spender_rank(db: Session, user_id: int, limit: int = 10) -> int | None:
    spender_id = case(
        (TransactionHistory.buyer_id.isnot(None), TransactionHistory.buyer_id),
        (TransactionHistory.transaction_type == "purchase", TransactionHistory.seller_id),
        else_=None,
    ).label("spender_id")

    rows = (
        db.query(
            spender_id,
            func.coalesce(func.sum(TransactionHistory.transaction_price), 0).label("spent_ton"),
            func.count(TransactionHistory.transaction_id).label("transactions_count"),
        )
        .filter(TransactionHistory.transaction_status == "confirmed")
        .filter(spender_id.isnot(None))
        .group_by(spender_id)
        .order_by(
            func.sum(TransactionHistory.transaction_price).desc(),
            func.count(TransactionHistory.transaction_id).desc(),
            spender_id.asc(),
        )
        .limit(limit)
        .all()
    )

    for index, row in enumerate(rows, start=1):
        if row[0] == user_id:
            return index
    return None


def get_user_profile_info_by_username(db: Session, username: str, viewer_user_id: int | None = None) -> dict:
    user = db.scalar(
        select(User)
        .where(User.username == username)
    )

    if not user:
        raise ValueError(f"User with username={username} not found")

    can_view_private_socials = _can_view_private_socials(user, viewer_user_id)

    token_balance = "0"
    if user.is_active and user.wallet_address:
        try:
            token_balance = get_token_balance(user.wallet_address)
        except Exception:
            token_balance = "0"

    presents = db.scalars(
        select(Present)
        .join(CurrentOwner, CurrentOwner.present_id == Present.present_id)
        .where(CurrentOwner.owner_id == user.user_id, Present.is_burned == 0)
        .order_by(CurrentOwner.owned_since.desc(), Present.present_id.desc())
        .options(
            joinedload(Present.collection),
            joinedload(Present.model),
            joinedload(Present.background),
            joinedload(Present.symbol),
        )
    ).all()

    present_ids = [p.present_id for p in presents]

    active_listing_by_present_id = {}
    if user.is_active and present_ids:
        active_listing_by_present_id = {
            listing.present_id: listing
            for listing in db.scalars(
                select(Listing).where(
                    Listing.present_id.in_(present_ids),
                    Listing.status.has(ListingStatuses.status_name == "active"),
                )
            ).all()
        }

    user_albums = db.scalars(
        select(Album)
        .where(Album.album_owner_id == user.user_id)
        .options(joinedload(Album.album_presents))
    ).unique().all()

    followers_count = db.scalar(
        select(func.count()).select_from(UserFollow).where(UserFollow.following_id == user.user_id)
    ) or 0
    following_count = db.scalar(
        select(func.count()).select_from(UserFollow).where(UserFollow.follower_id == user.user_id)
    ) or 0
    is_following = False
    if viewer_user_id and viewer_user_id != user.user_id:
        is_following = db.get(
            UserFollow,
            {"follower_id": viewer_user_id, "following_id": user.user_id},
        ) is not None

    user_achievements = db.execute(
        select(UserAchievement, Achievement)
        .join(Achievement, Achievement.achievement_id == UserAchievement.achievement_id)
        .where(
            UserAchievement.user_id == user.user_id,
            Achievement.is_active == 1,
        )
        .order_by(UserAchievement.awarded_at.desc())
    ).all()
    achievements_total_count = int(
        db.scalar(select(func.count()).select_from(Achievement).where(Achievement.is_active == 1)) or 0
    )
    achievements_earned_count = len(user_achievements)
    achievements_visible_count = sum(
        1 for user_achievement, _ in user_achievements if int(user_achievement.is_visible) == 1
    )
    earned_by_achievement_id = {
        achievement.achievement_id: user_achievement
        for user_achievement, achievement in user_achievements
    }
    all_active_achievements = db.scalars(
        select(Achievement)
        .where(Achievement.is_active == 1)
        .order_by(Achievement.created_at.desc(), Achievement.achievement_id.desc())
    ).all()
    achievements = []
    for achievement in all_active_achievements:
        user_achievement = earned_by_achievement_id.get(achievement.achievement_id)
        is_visible_to_viewer = bool(
            user_achievement
            and (
                can_view_private_socials
                or user_achievement.is_visible == 1
            )
        )
        progress = achievement_progress_to_dict(db, user.user_id, achievement) if (
            can_view_private_socials or is_visible_to_viewer
        ) else {}
        achievements.append(
            achievement_to_dict(db, achievement) | progress | {
                "is_unlocked": is_visible_to_viewer,
                "is_visible": (
                    user_achievement.is_visible
                    if user_achievement and can_view_private_socials
                    else (1 if user_achievement and user_achievement.is_visible == 1 else 0)
                ),
                "awarded_at": (
                    user_achievement.awarded_at.isoformat()
                    if user_achievement
                    and is_visible_to_viewer
                    and user_achievement.awarded_at
                    else None
                ),
            }
        )
    profile_badge_achievement_id = get_profile_badge_achievement_id(db, user.user_id)
    profile_badge_achievement = None
    if profile_badge_achievement_id:
        for user_achievement, achievement in user_achievements:
            if achievement.achievement_id == profile_badge_achievement_id:
                if can_view_private_socials or user_achievement.is_visible == 1:
                    profile_badge_achievement = achievement_to_dict(db, achievement) | {
                        "is_visible": user_achievement.is_visible,
                        "awarded_at": user_achievement.awarded_at.isoformat() if user_achievement.awarded_at else None,
                    }
                break

    return {
        "user_id": user.user_id,
        "user_tg_id": _visible_social_value(user.user_tg_id, user.tg_visibility, can_view_private_socials),
        "user_vk_id": _visible_social_value(user.user_vk_id, user.vk_visibility, can_view_private_socials),
        "username": user.username,
        "tg_username": _visible_social_value(user.tg_username, user.tg_visibility, can_view_private_socials),
        "vk_username": _visible_social_value(user.vk_username, user.vk_visibility, can_view_private_socials),
        "tg_visibility": user.tg_visibility,
        "vk_visibility": user.vk_visibility,
        "profile_pic_url": user.profile_pic_url if user.is_active else None,
        "about_me": user.about_me,
        "is_active": user.is_active,
        "role": user.role.role_name if user.role else None,
        "token_balance": token_balance,
        "top_spender_rank": _get_top_spender_rank(db, user.user_id),
        "followers_count": int(followers_count),
        "following_count": int(following_count),
        "is_following": is_following,
        "achievements_total_count": achievements_total_count,
        "achievements_earned_count": achievements_earned_count,
        "achievements_visible_count": achievements_visible_count,
        "achievements": achievements,
        "profile_badge_achievement_id": profile_badge_achievement_id,
        "profile_badge_achievement": profile_badge_achievement,
        "albums": [
            {
                "album_id": album.album_id,
                "album_owner_id": album.album_owner_id,
                "album_title": album.album_title,
                "present_ids": [ap.present_id for ap in album.album_presents],
            }
            for album in user_albums
        ],
        "presents": [
            {
                "present_id": p.present_id,
                "present_num": p.present_num,
                "image_url": p.image_url,
                "generated_at": p.generated_at,
                "model_id": p.model_id,
                "is_visible": p.is_visible,
                "is_on_sale": p.present_id in active_listing_by_present_id,
                "active_listing_price": (
                    str(active_listing_by_present_id[p.present_id].price)
                    if p.present_id in active_listing_by_present_id
                    else None
                ),
                "original_sender_username": p.original_sender.username if p.original_sender else None,
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
    vk_visibility: int,
    profile_pic_data_url: str | None = None,
) -> dict:
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user:
        raise ValueError("User not found")

    username = _validate_username(username)
    about_me = _validate_about_me(about_me)
    tg_visibility = _validate_platform_visibility("Telegram", tg_visibility)
    vk_visibility = _validate_platform_visibility("VK", vk_visibility)
    validate_profile_content(username, about_me)

    existing_user = db.scalar(
        select(User).where(User.username == username, User.user_id != user_id)
    )
    if existing_user:
        raise ValueError("Username is already taken")

    user.username = username
    user.about_me = about_me
    user.tg_visibility = tg_visibility
    user.vk_visibility = vk_visibility

    if profile_pic_data_url:
        new_profile_pic_filename = _save_profile_picture(
            profile_pic_data_url,
            current_filename=user.profile_pic_url,
        )

        user.profile_pic_url = new_profile_pic_filename

    db.commit()
    db.refresh(user)

    return _serialize_editable_profile(user)
