import {
  Avatar,
  Button,
  Flex,
  FloatButton,
  Image,
  Input,
  Layout,
  Modal,
  Segmented,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  EditOutlined,
  FlagOutlined,
  GiftOutlined,
  HistoryOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  SmileOutlined,
  TrophyOutlined,
  UpOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Content } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "spoilerjs/spoiler-span";

import AlbumContextMenu from "../components/AlbumContextMenu";
import CardList from "../components/CardList";
import EditProfileModal from "../components/EditProfileModal";
import GiftDetailModal from "../components/GiftDetailModal";
import PresentCardContextMenu from "../components/PresentCardContextMenu";
import ProfileGiftCard from "../components/ProfileGiftCard";
import ReportModal from "../components/ReportModal";
import SendGiftModal from "../components/SendGiftModal";
import TransactionHistoryModal from "../components/TransactionHistoryModal";
import SpoilerSpan from "../components/SpoilerSpan";
import { createAlbum, deleteAlbum, renameAlbum } from "../services/albumService";
import { authFetch } from "../services/auth";
import { getPresentDisplayImageUrl } from "../services/presentService";
import { UpdateProfileResponse } from "../services/profileService";
import {
  followUser,
  getFollowers,
  getFollowing,
  setAchievementVisibility,
  setProfileBadge,
  SocialUser,
  unfollowUser,
} from "../services/socialService";
import { useNotifications } from "../hooks/useNotifications";
import NotFound from "./NotFound";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface Present {
  present_id: number;
  present_num: number;
  image_url: string | null;
  collection: { collection_name: string } | null;
  model_id: number | null;
  is_on_sale?: boolean;
  active_listing_price?: string | null;
  is_visible?: number;
}

interface Album {
  album_id: number;
  album_owner_id: number;
  album_title: string;
  present_ids: number[];
}

interface UserProfile {
  user_id: number;
  user_tg_id?: number | null;
  user_vk_id?: number | null;
  username: string;
  tg_username: string | null;
  vk_username: string | null;
  tg_visibility: number;
  vk_visibility: number;
  profile_pic_url: string | null;
  about_me: string | null;
  is_active: number;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  achievements_total_count: number;
  achievements_earned_count: number;
  achievements_visible_count: number;
  achievements: ProfileAchievement[];
  profile_badge_achievement_id: number | null;
  profile_badge_achievement: ProfileAchievement | null;
  top_spender_rank: number | null;
  presents: Present[];
  albums: Album[];
}

interface ProfileAchievement {
  achievement_id: number;
  title: string;
  description: string;
  image_url: string | null;
  users_percent: number;
  is_visible: number;
  awarded_at: string | null;
}

const ALL_TAB = "All";
const DEFAULT_VISIBLE_COUNT = 36;
const MAX_ALBUMS_PER_USER = 10;
const MAX_ALBUM_TITLE_LENGTH = 30;
const PROFILE_AVATAR_SIZE = { xs: 92, sm: 116, md: 140, lg: 140, xl: 140, xxl: 140 };
const achievementImageUrl = (imageUrl: string | null | undefined) => (
  imageUrl ? `${process.env.REACT_APP_IMAGES_URL}/achievements/${imageUrl}` : undefined
);

type SegmentedValue = typeof ALL_TAB | number;
type SocialListKind = "followers" | "following";

const getStoredCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
};

const AccountView = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isOwn, setIsOwn] = useState(false);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);
  const [activeAlbumId, setActiveAlbumId] = useState<number | null>(null);
  const [isAddingAlbum, setIsAddingAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [renamingAlbumId, setRenamingAlbumId] = useState<number | null>(null);
  const [renamingTitle, setRenamingTitle] = useState("");
  const [isRenamingAlbum, setIsRenamingAlbum] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [socialListKind, setSocialListKind] = useState<SocialListKind | null>(null);
  const [socialUsers, setSocialUsers] = useState<SocialUser[]>([]);
  const [socialUsersLoading, setSocialUsersLoading] = useState(false);
  const [badgeSaving, setBadgeSaving] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { username } = useParams();

  const updateUserAlbums = (updater: (albums: Album[]) => Album[]) => {
    setUser((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        albums: updater(prev.albums),
      };
    });
  };

  const findAlbumById = (albumId: number) => {
    return user?.albums.find((album) => album.album_id === albumId) ?? null;
  };

  const handleCancelAddingAlbum = () => {
    setIsAddingAlbum(false);
    setNewAlbumTitle("");
  };

  const handleCancelRenaming = () => {
    setRenamingAlbumId(null);
    setRenamingTitle("");
    setIsRenamingAlbum(false);
  };

  const loadUser = () => {
    if (!username) return;
    authFetch(`${process.env.REACT_APP_API_URL}/user-info/web/${username}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  };

  useNotifications(
    isOwn ? getStoredCurrentUser().user_id : null,
    () => loadUser()
  );

  const handleGiftSent = (newBalance?: number) => {
    loadUser();

    if (newBalance !== undefined && isOwn) {
      const currentUser = getStoredCurrentUser();
      const updated = { ...currentUser, balance: newBalance };
      localStorage.setItem("currentUser", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    }
  };

  useEffect(() => {
    if (!username) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadUser();
  }, [username]);

  useEffect(() => {
    const checkOwnership = () => {
      const currentUser = getStoredCurrentUser();
      setIsOwn(currentUser.user_id === user?.user_id);
    };

    checkOwnership();
    window.addEventListener("storage", checkOwnership);

    return () => window.removeEventListener("storage", checkOwnership);
  }, [user]);

  useEffect(() => {
    if (activeAlbumId === null) {
      return;
    }

    const hasActiveAlbum = user?.albums.some((album) => album.album_id === activeAlbumId);
    if (!hasActiveAlbum) {
      setActiveAlbumId(null);
    }
  }, [activeAlbumId, user]);

  const activeAlbum = activeAlbumId === null ? null : findAlbumById(activeAlbumId);
  const filteredPresents: Present[] = !user
    ? []
    : activeAlbum === null
      ? isOwn ? user.presents : user.presents.filter((p) => p.is_visible !== 0)
      : user.presents.filter((present) => activeAlbum.present_ids.includes(present.present_id) && (isOwn || present.is_visible !== 0));

  useEffect(() => {
    const sentinelNode = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredPresents.length) {
          setVisibleCount((prev) => Math.min(prev + 12, filteredPresents.length));
        }
      },
      { threshold: 1.0 },
    );

    if (sentinelNode) {
      observer.observe(sentinelNode);
    }

    return () => {
      if (sentinelNode) {
        observer.unobserve(sentinelNode);
      }
    };
  }, [filteredPresents.length, visibleCount]);

  const handleStartAddingAlbum = () => {
    if (!user || user.albums.length >= MAX_ALBUMS_PER_USER) {
      messageApi.warning(t("profile.maxAlbums", { count: MAX_ALBUMS_PER_USER }));
      return;
    }

    handleCancelRenaming();
    setNewAlbumTitle("");
    setIsAddingAlbum(true);
  };

  const handleCreateAlbum = async () => {
    if (!user) {
      return;
    }

    const trimmedTitle = newAlbumTitle.trim();
    if (!trimmedTitle) {
      handleCancelAddingAlbum();
      return;
    }

    setIsCreatingAlbum(true);

    try {
      const newAlbum = await createAlbum(user.user_id, trimmedTitle);

      updateUserAlbums((albums) => [
        ...albums,
        {
          album_id: newAlbum.album_id,
          album_owner_id: newAlbum.album_owner_id,
          album_title: newAlbum.album_title,
          present_ids: [],
        },
      ]);

      handleCancelAddingAlbum();
    } catch (error) {
      console.error("Failed to create album:", error);
      messageApi.error(error instanceof Error ? error.message : t("profile.failedCreateAlbum"));
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const handleStartRenamingAlbum = (albumId: number) => {
    const album = findAlbumById(albumId);
    if (!album) {
      return;
    }

    handleCancelAddingAlbum();
    setRenamingAlbumId(album.album_id);
    setRenamingTitle(album.album_title);
  };

  const handleSubmitRenamingAlbum = async () => {
    if (renamingAlbumId === null) {
      return;
    }

    const trimmedTitle = renamingTitle.trim();
    const currentAlbum = findAlbumById(renamingAlbumId);

    if (!trimmedTitle || !currentAlbum) {
      handleCancelRenaming();
      return;
    }

    if (trimmedTitle === currentAlbum.album_title) {
      handleCancelRenaming();
      return;
    }

    setIsRenamingAlbum(true);

    try {
      const updatedAlbum = await renameAlbum(renamingAlbumId, trimmedTitle);

      updateUserAlbums((albums) =>
        albums.map((album) =>
          album.album_id === renamingAlbumId
            ? { ...album, album_title: updatedAlbum.album_title }
            : album,
        ),
      );

      handleCancelRenaming();
    } catch (error) {
      console.error("Failed to rename album:", error);
      messageApi.error(error instanceof Error ? error.message : t("profile.failedRenameAlbum"));
      setIsRenamingAlbum(false);
    }
  };

  const handleDeleteAlbum = async (albumIdToDelete: number) => {
    if (!user) {
      return;
    }

    const previousAlbums = user.albums;
    const previousActiveAlbumId = activeAlbumId;
    const previousVisibleCount = visibleCount;

    updateUserAlbums((albums) => albums.filter((album) => album.album_id !== albumIdToDelete));

    if (activeAlbumId === albumIdToDelete) {
      setActiveAlbumId(null);
      setVisibleCount(DEFAULT_VISIBLE_COUNT);
    }

    if (renamingAlbumId === albumIdToDelete) {
      handleCancelRenaming();
    }

    try {
      await deleteAlbum(albumIdToDelete);
    } catch (error) {
      console.error("Failed to delete album:", error);
      updateUserAlbums(() => previousAlbums);
      setActiveAlbumId(previousActiveAlbumId);
      setVisibleCount(previousVisibleCount);
      messageApi.error(error instanceof Error ? error.message : t("profile.failedDeleteAlbum"));
    }
  };

  const handleProfileSaved = (updatedProfile: UpdateProfileResponse) => {
    setUser((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        username: updatedProfile.username,
        user_tg_id: updatedProfile.user_tg_id,
        user_vk_id: updatedProfile.user_vk_id,
        tg_username: updatedProfile.tg_username,
        vk_username: updatedProfile.vk_username,
        tg_visibility: updatedProfile.tg_visibility,
        vk_visibility: updatedProfile.vk_visibility,
        profile_pic_url: updatedProfile.profile_pic_url,
        about_me: updatedProfile.about_me,
      };
    });

    const currentUser = getStoredCurrentUser();
    if (currentUser.user_id === updatedProfile.user_id) {
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          ...currentUser,
          username: updatedProfile.username,
          user_tg_id: updatedProfile.user_tg_id,
          user_vk_id: updatedProfile.user_vk_id,
          tg_username: updatedProfile.tg_username,
          vk_username: updatedProfile.vk_username,
          tg_visibility: updatedProfile.tg_visibility,
          vk_visibility: updatedProfile.vk_visibility,
          profile_pic_url: updatedProfile.profile_pic_url,
          about_me: updatedProfile.about_me,
        }),
      );
      window.dispatchEvent(new Event("storage"));
    }

    if (username !== updatedProfile.username) {
      navigate(`/account/${updatedProfile.username}`, { replace: true });
    }
  };

  const handleToggleFollow = async () => {
    if (!user || isOwn || !currentUser.user_id) {
      return;
    }

    setFollowLoading(true);
    try {
      const result = user.is_following
        ? await unfollowUser(user.user_id)
        : await followUser(user.user_id);
      setUser((prev) => prev ? {
        ...prev,
        is_following: result.following,
        followers_count: result.followers_count,
        following_count: result.following_count,
      } : prev);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t("profile.failedToggleFollow"));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleAchievementVisibility = async (achievementId: number, isVisible: number) => {
    try {
      await setAchievementVisibility(achievementId, isVisible);
      setUser((prev) => prev ? {
        ...prev,
        achievements: prev.achievements.map((achievement) => (
          achievement.achievement_id === achievementId
            ? { ...achievement, is_visible: isVisible }
            : achievement
        )),
        achievements_visible_count: prev.achievements_visible_count + (isVisible ? 1 : -1),
        profile_badge_achievement_id: isVisible === 0 && prev.profile_badge_achievement_id === achievementId
          ? null
          : prev.profile_badge_achievement_id,
        profile_badge_achievement: isVisible === 0 && prev.profile_badge_achievement_id === achievementId
          ? null
          : prev.profile_badge_achievement,
      } : prev);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t("profile.failedToggleAchievementVisibility"));
    }
  };

  const handleSetProfileBadge = async (achievement: ProfileAchievement | null) => {
    setBadgeSaving(true);
    try {
      const result = await setProfileBadge(achievement?.achievement_id ?? null);
      setUser((prev) => prev ? {
        ...prev,
        profile_badge_achievement_id: result.profile_badge_achievement_id,
        profile_badge_achievement: result.profile_badge_achievement_id ? achievement : null,
      } : prev);
      messageApi.success(t("profile.badgeUpdated"));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t("profile.failedUpdateBadge"));
    } finally {
      setBadgeSaving(false);
    }
  };

  const openSocialList = async (kind: SocialListKind) => {
    if (!user) return;
    setSocialListKind(kind);
    setSocialUsersLoading(true);
    try {
      const loadedUsers = kind === "followers"
        ? await getFollowers(user.user_id)
        : await getFollowing(user.user_id);
      setSocialUsers(loadedUsers);
    } catch (error) {
      setSocialUsers([]);
      messageApi.error(error instanceof Error ? error.message : t("profile.failedLoadSocialList"));
    } finally {
      setSocialUsersLoading(false);
    }
  };

  const renderAlbumLabel = (album: Album) => {
    if (renamingAlbumId === album.album_id) {
      return (
        <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
          <Input
            autoFocus
            disabled={isRenamingAlbum}
            maxLength={MAX_ALBUM_TITLE_LENGTH}
            size="middle"
            style={{ width: 160 }}
            value={renamingTitle}
            onBlur={handleCancelRenaming}
            onChange={(event) => setRenamingTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmitRenamingAlbum();
              }

              if (event.key === "Escape") {
                handleCancelRenaming();
              }
            }}
          />
        </div>
      );
    }

    return (
      <AlbumContextMenu
        disabled={!isOwn}
        onRename={() => handleStartRenamingAlbum(album.album_id)}
        onDelete={() => handleDeleteAlbum(album.album_id)}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>{album.album_title}</span>
        </div>
      </AlbumContextMenu>
    );
  };

  const segmentedOptions = [
    {
      label: <span>{t("transactions.all")}</span>,
      value: ALL_TAB as SegmentedValue,
    },
    ...(user?.albums.map((album) => ({
      label: renderAlbumLabel(album),
      value: album.album_id as SegmentedValue,
    })) ?? []),
  ];

  if (loading) {
    return <Spin size="large" className="my-20" />;
  }

  if (!user) {
    return <NotFound />;
  }

  const activeSegmentedValue: SegmentedValue = activeAlbumId ?? ALL_TAB;
  const activeAlbumTitle = activeAlbum?.album_title ?? t("transactions.all");
  const hasReachedAlbumLimit = user.albums.length >= MAX_ALBUMS_PER_USER;
  const currentUser = getStoredCurrentUser();
  const currentUserBlocked = currentUser.is_active === 0;
  const isBlockedProfile = user.is_active === 0;
  const canSendGiftFromProfile = !currentUserBlocked && !isBlockedProfile;
  const canReportProfile = !currentUserBlocked && !isBlockedProfile;
  const renderSocialAccount = (
    provider: "tg" | "vk",
    usernameValue: string | null,
    userIdValue: number | null | undefined,
    visibility: number,
  ) => {
    const isVisible = Number(visibility) === 1;

    if (!isVisible && !isOwn) {
      return (
        <div className="flex min-w-0 items-center gap-2">
          {provider === "tg" ? (
            <Image
              src="/icons/tg-icon-png.png"
              alt="TgIcon"
              style={{ width: "var(--size-lg)", marginBottom: "10px" }}
              preview={false}
            />
          ) : (
            <Image
              src="/icons/vk-icon-png.png"
              alt="VKIcon"
              style={{ width: "var(--size-lg)" }}
              preview={false}
            />
          )}

          <SpoilerSpan pointerEvents="none" className="text-[var(--liquid-glass-fg)] opacity-70 break-all">
            {t("profile.socialHidden")}
          </SpoilerSpan>
        </div>
      );
    }

    const label = provider === "tg"
      ? usernameValue || (userIdValue ? t("profile.telegramConnected") : t("profile.telegramNotConnected"))
      : usernameValue || (userIdValue ? `id${userIdValue}` : t("profile.vkNotConnected"));

    const href = provider === "tg"
      ? (usernameValue ? `https://t.me/${usernameValue}` : null)
      : (userIdValue ? `https://vk.com/id${userIdValue}` : null);

    return (
      <div className="flex min-w-0 items-center gap-2">
        {provider === "tg" ? (
          <Image
            src="/icons/tg-icon-png.png"
            alt="TgIcon"
            style={{ width: "var(--size-lg)", marginBottom: "10px" }}
            preview={false}
          />
        ) : (
          <Image
            src="/icons/vk-icon-png.png"
            alt="VKIcon"
            style={{ width: "var(--size-lg)" }}
            preview={false}
          />
        )}

        {isVisible && href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-1 break-all"
          >
            {label}
          </a>
        ) : (
          <SpoilerSpan pointerEvents={isOwn ? "auto" : "none"} className="text-[var(--liquid-glass-fg)] break-all">
            {label}
          </SpoilerSpan>
        )}
      </div>
    );
  };

  return (
    <Layout className="min-h-screen">
      {contextHolder}

      <Content className="gap-4 sm:gap-5 flex flex-col py-[var(--size-2xs)] px-3 sm:px-4 lg:px-[var(--size-4xl)]">
        <Flex className="gap-4 sm:gap-5 flex justify-between items-start" wrap="wrap">
          <Flex className="gap-3 sm:gap-5 min-w-0 flex-1" wrap="wrap" align="flex-start">
            <Avatar
              size={PROFILE_AVATAR_SIZE}
              src={isBlockedProfile || !user.profile_pic_url ? undefined : `${process.env.REACT_APP_IMAGES_URL}/pfps/${user.profile_pic_url}`}
              icon={isBlockedProfile || !user.profile_pic_url ? <UserOutlined /> : undefined}
              className="border border-gray-500 shrink-0"
            />

            <Flex vertical className="min-w-0 flex-1">
              <Flex align="center" gap={8} wrap="wrap">
                <Title level={2} className="!mb-0 break-all !text-[28px] sm:!text-[30px]">
                  {user.username}
                </Title>
                {user.profile_badge_achievement && (
                  <Tooltip title={user.profile_badge_achievement.title}>
                    <Avatar
                      shape="square"
                      size={32}
                      src={achievementImageUrl(user.profile_badge_achievement.image_url)}
                      icon={!user.profile_badge_achievement.image_url ? <TrophyOutlined /> : undefined}
                      className="border border-amber-300 bg-amber-100"
                    />
                  </Tooltip>
                )}
                {user.top_spender_rank && (
                  <Tag color="gold">{t("profile.topRank", { rank: user.top_spender_rank })}</Tag>
                )}
                {isBlockedProfile && <Tag color="red">{t("profile.accountBlocked")}</Tag>}
              </Flex>

              {renderSocialAccount("tg", user.tg_username, user.user_tg_id, user.tg_visibility)}
              {renderSocialAccount("vk", user.vk_username, user.user_vk_id, user.vk_visibility)}

              <Text className="mt-3 leading-relaxed break-words">{user.about_me}</Text>
              <Flex gap={8} wrap="wrap" className="mt-3">
                <Tag className="cursor-pointer" onClick={() => openSocialList("followers")}>
                  {t("profile.followersCount", { count: user.followers_count || 0 })}
                </Tag>
                <Tag className="cursor-pointer" onClick={() => openSocialList("following")}>
                  {t("profile.followingCount", { count: user.following_count || 0 })}
                </Tag>
                <Tag color={user.achievements_earned_count ? "gold" : "default"}>
                  {t("profile.achievementsProgress", {
                    earned: user.achievements_earned_count || 0,
                    total: user.achievements_total_count || 0,
                  })}
                </Tag>
              </Flex>
            </Flex>
          </Flex>

          {isOwn ? (
            <Flex className="gap-2 sm:gap-3 flex flex-row h-full !items-center w-full sm:w-auto" wrap="wrap">
              {canSendGiftFromProfile && (
                <Tooltip title={t("profile.sendGift")}>
                  <Button
                    size="large"
                    icon={<GiftOutlined />}
                    className="!bg-[var(--liquid-glass-bg)]"
                    onClick={() => setIsGiftOpen(true)}
                  >
                    {t("profile.sendGift")}
                  </Button>
                </Tooltip>
              )}
              <Tooltip title={t("profile.history")}>
                <Button
                  size="large"
                  icon={<HistoryOutlined />}
                  className="!bg-[var(--liquid-glass-bg)]"
                  onClick={() => setIsHistoryOpen(true)}
                />
              </Tooltip>
              <Tooltip title={t("profile.achievements2")}>
                <Button
                  size="large"
                  icon={<TrophyOutlined />}
                  className="!bg-[var(--liquid-glass-bg)]"
                  onClick={() => setIsAchievementsOpen(true)}
                />
              </Tooltip>
              <Button
                size="large"
                icon={<EditOutlined />}
                className="!bg-[var(--liquid-glass-bg)]"
                onClick={() => setIsEditProfileOpen(true)}
                disabled={currentUserBlocked}
              >
                {t("profile.edit")}
              </Button>
            </Flex>
          ) : (
            <Flex className="gap-2 sm:gap-3 flex flex-row h-full !items-center w-full sm:w-auto" wrap="wrap">
              {currentUser.user_id && canSendGiftFromProfile && (
                <Tooltip title={t("profile.sendGift")}>
                  <Button
                    size="large"
                    icon={<GiftOutlined />}
                    className="!bg-[var(--liquid-glass-bg)]"
                    onClick={() => setIsGiftOpen(true)}
                  >
                    {t("profile.sendGift")}
                  </Button>
                </Tooltip>
              )}
              {currentUser.user_id && (
                <Button
                  size="large"
                  loading={followLoading}
                  className="!bg-[var(--liquid-glass-bg)]"
                  onClick={handleToggleFollow}
                >
                  {user.is_following ? t("profile.unfollow") : t("profile.follow")}
                </Button>
              )}
              <Tooltip title={t("profile.achievements2")}>
                <Button
                  size="large"
                  icon={<TrophyOutlined />}
                  className="!bg-[var(--liquid-glass-bg)]"
                  onClick={() => setIsAchievementsOpen(true)}
                />
              </Tooltip>
              {currentUser.user_id && canReportProfile && (
                <Tooltip title={t("profile.report")}>
                  <Button
                    size="large"
                    icon={<FlagOutlined />}
                    className="!bg-[var(--liquid-glass-bg)]"
                    onClick={() => setIsReportOpen(true)}
                    danger
                  />
                </Tooltip>
              )}
            </Flex>
          )}
        </Flex>

        <div className="moon-mobile-scroll overflow-x-auto overflow-y-hidden whitespace-nowrap w-full">
          <Flex align="center" gap={8}>
            <Segmented<SegmentedValue>
              options={segmentedOptions}
              size="large"
              value={activeSegmentedValue}
              onChange={(value) => {
                setActiveAlbumId(value === ALL_TAB ? null : Number(value));
                setVisibleCount(DEFAULT_VISIBLE_COUNT);
              }}
            />

            {isOwn && !currentUserBlocked && (
              <>
                {isAddingAlbum ? (
                  <Input
                    autoFocus
                    disabled={isCreatingAlbum}
                    maxLength={MAX_ALBUM_TITLE_LENGTH}
                    placeholder={t("profile.albumName")}
                    size="large"
                    style={{ width: 160 }}
                    value={newAlbumTitle}
                    onBlur={handleCancelAddingAlbum}
                    onChange={(event) => setNewAlbumTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateAlbum();
                      }

                      if (event.key === "Escape") {
                        handleCancelAddingAlbum();
                      }
                    }}
                  />
                ) : (
                  <Tooltip title={hasReachedAlbumLimit ? t("profile.maximumAlbums", { count: MAX_ALBUMS_PER_USER }) : t("profile.createAlbum")}>
                    <Button
                      size="large"
                      icon={<PlusOutlined />}
                      onClick={handleStartAddingAlbum}
                      className="!bg-[var(--liquid-glass-bg)]"
                      disabled={hasReachedAlbumLimit}
                    />
                  </Tooltip>
                )}
              </>
            )}
          </Flex>
        </div>

        <div className="mb-2">
          {filteredPresents.length === 0 && (
            <Flex className="justify-center text-center flex flex-col w-full gap-2.5 py-16 min-h-[60vh]">
              <SmileOutlined
                className="text-5xl text-[var(--liquid-glass-fg)] justify-center"
                rotate={180}
              />
              <Text className="text-gray-400">
                {activeAlbumId === null ? t("profile.noGifts") : t("profile.noGiftsInAlbum", { album: activeAlbumTitle })}
              </Text>
            </Flex>
          )}

          <CardList
            items={filteredPresents.slice(0, visibleCount)}
            renderCard={(item) => (
              <div className="w-full">
                <PresentCardContextMenu
                  presentId={item.present_id}
                  userId={user.user_id}
                  isOwner={isOwn && !currentUserBlocked}
                  isVisible={item.is_visible !== 0}
                  albums={user.albums}
                  activeAlbumId={activeAlbumId}
                  onRefresh={loadUser}
                >
                  <ProfileGiftCard
                    cardImage={getPresentDisplayImageUrl(item.image_url, item.model_id !== null)}
                    name={item.collection?.collection_name}
                    number={item.present_num}
                    isOnSale={item.is_on_sale}
                    activeListingPrice={item.active_listing_price}
                    isVisible={item.is_visible !== 0}
                    isUpgraded={item.model_id !== null}
                    onClick={() => setSelectedGiftId(item.present_id)}
                  />
                </PresentCardContextMenu>
              </div>
            )}
          />

          <div ref={sentinelRef} className="h-1" />
        </div>

        <EditProfileModal
          open={isEditProfileOpen && !currentUserBlocked}
          profile={{
            user_id: user.user_id,
            user_tg_id: user.user_tg_id ?? null,
            user_vk_id: user.user_vk_id ?? null,
            username: user.username,
            tg_username: user.tg_username,
            vk_username: user.vk_username,
            tg_visibility: user.tg_visibility,
            vk_visibility: user.vk_visibility,
            profile_pic_url: user.profile_pic_url,
            about_me: user.about_me,
          }}
          onClose={() => setIsEditProfileOpen(false)}
          onSaved={handleProfileSaved}
          onLinked={loadUser}
        />

        <ReportModal
          open={isReportOpen && canReportProfile}
          senderId={currentUser.user_id}
          receiverId={user.user_id}
          onClose={() => setIsReportOpen(false)}
        />

        <SendGiftModal
          open={isGiftOpen && canSendGiftFromProfile}
          senderId={currentUser.user_id}
          onClose={() => setIsGiftOpen(false)}
          onSent={handleGiftSent}
          initialReceiverId={isOwn ? null : user.user_id}
        />

        <TransactionHistoryModal
          open={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          userId={user.user_id}
          currentUsername={user.username}
        />

        <Modal
          open={socialListKind !== null}
          onCancel={() => setSocialListKind(null)}
          title={socialListKind === "followers" ? t("profile.followers") : t("profile.following")}
          footer={[<Button key="close" onClick={() => setSocialListKind(null)}>{t("profile.close")}</Button>]}
          width={560}
        >
          <Spin spinning={socialUsersLoading}>
            {socialUsers.length === 0 ? (
              <Flex vertical align="center" className="py-10 gap-2 text-center">
                <UserOutlined className="text-4xl text-gray-400" />
                <Text type="secondary">{t("profile.noSocialUsers")}</Text>
              </Flex>
            ) : (
              <Flex vertical gap={10}>
                {socialUsers.map((socialUser) => (
                  <Flex
                    key={socialUser.user_id}
                    align="center"
                    justify="space-between"
                    gap={12}
                    className="rounded-lg border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg-secondary)] p-3"
                  >
                    <Flex align="center" gap={10} className="min-w-0">
                      <Avatar
                        src={socialUser.profile_pic_url ? `${process.env.REACT_APP_IMAGES_URL}/pfps/${socialUser.profile_pic_url}` : undefined}
                        icon={!socialUser.profile_pic_url ? <UserOutlined /> : undefined}
                      />
                      <Button
                        type="link"
                        className="!h-auto !p-0 min-w-0"
                        onClick={() => {
                          if (!socialUser.username) return;
                          setSocialListKind(null);
                          navigate(`/account/${socialUser.username}`);
                        }}
                      >
                        <span className="truncate">{socialUser.username || `#${socialUser.user_id}`}</span>
                      </Button>
                      {socialUser.profile_badge_image_url && (
                        <Avatar
                          shape="square"
                          size={24}
                          src={achievementImageUrl(socialUser.profile_badge_image_url)}
                          icon={!socialUser.profile_badge_image_url ? <TrophyOutlined /> : undefined}
                        />
                      )}
                    </Flex>
                    {socialUser.is_following && <Tag>{t("profile.following")}</Tag>}
                  </Flex>
                ))}
              </Flex>
            )}
          </Spin>
        </Modal>

        <Modal
          open={isAchievementsOpen}
          onCancel={() => setIsAchievementsOpen(false)}
          title={
            <Flex align="center" gap={8}>
              <TrophyOutlined />
              <span>
                {t("profile.achievementsProgress", {
                  earned: user.achievements_earned_count || 0,
                  total: user.achievements_total_count || 0,
                })}
              </span>
            </Flex>
          }
          footer={[<Button key="close" onClick={() => setIsAchievementsOpen(false)}>{t("profile.close")}</Button>]}
          width={760}
        >
          {isOwn && user.profile_badge_achievement && (
            <Flex justify="flex-end" className="mb-3">
              <Button size="small" loading={badgeSaving} onClick={() => handleSetProfileBadge(null)}>
                {t("profile.removeBadge")}
              </Button>
            </Flex>
          )}
          {!isOwn && user.achievements_visible_count < user.achievements_earned_count && (
            <Text type="secondary" className="mb-3 block">
              {t("profile.hiddenAchievementsCount", {
                count: user.achievements_earned_count - user.achievements_visible_count,
              })}
            </Text>
          )}
          {user.achievements.length === 0 ? (
            <Flex vertical align="center" className="py-10 gap-3 text-center">
              <TrophyOutlined className="text-5xl text-gray-400" />
              <Text type="secondary">{t("profile.noAchievements")}</Text>
            </Flex>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {user.achievements.map((achievement) => (
                <div
                  key={achievement.achievement_id}
                  className="rounded-lg border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg-secondary)] p-3"
                >
                  <Flex gap={12} align="flex-start">
                    <Avatar
                      shape="square"
                      size={64}
                      src={achievementImageUrl(achievement.image_url)}
                      icon={!achievement.image_url ? <TrophyOutlined /> : undefined}
                      className="shrink-0"
                    />
                    <Flex vertical className="min-w-0 flex-1">
                      <Flex justify="space-between" gap={8} align="start">
                        <Text strong className="break-words">{achievement.title}</Text>
                        {isOwn && (
                          <Tooltip title={achievement.is_visible ? t("profile.hideAchievement") : t("profile.showAchievement")}>
                            <Button
                              size="small"
                              type="text"
                              icon={achievement.is_visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                              onClick={() => handleToggleAchievementVisibility(
                                achievement.achievement_id,
                                achievement.is_visible ? 0 : 1,
                              )}
                            />
                          </Tooltip>
                        )}
                      </Flex>
                      <Text type="secondary" className="text-sm leading-5">{achievement.description}</Text>
                      <Tag color="gold" className="mt-2 w-fit">
                        {t("profile.achievementUsersPercent", { percent: achievement.users_percent })}
                      </Tag>
                      {isOwn && achievement.is_visible === 1 && (
                        <Button
                          size="small"
                          className="mt-2 w-fit"
                          loading={badgeSaving}
                          disabled={user.profile_badge_achievement_id === achievement.achievement_id}
                          onClick={() => handleSetProfileBadge(achievement)}
                        >
                          {user.profile_badge_achievement_id === achievement.achievement_id
                            ? t("profile.currentBadge")
                            : t("profile.setAsBadge")}
                        </Button>
                      )}
                    </Flex>
                  </Flex>
                </div>
              ))}
            </div>
          )}
        </Modal>

        <GiftDetailModal
          open={!!selectedGiftId}
          presentId={selectedGiftId}
          userId={user.user_id}
          canManage={isOwn && !currentUserBlocked}
          onClose={() => setSelectedGiftId(null)}
          onRefresh={loadUser}
        />

        <FloatButton.BackTop
          icon={<UpOutlined />}
          className="!bg-[var(--liquid-glass-bg)] !right-[var(--size-s)] !bottom-[var(--size-s)]"
          shape="square"
        />
      </Content>
    </Layout>
  );
};

export default AccountView;
