import {
  Avatar,
  Button,
  Flex,
  FloatButton,
  Image,
  Input,
  Layout,
  Segmented,
  Spin,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  EditOutlined,
  FlagOutlined,
  GiftOutlined,
  HistoryOutlined,
  PlusOutlined,
  SmileOutlined,
  UpOutlined,
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
import { UpdateProfileResponse } from "../services/profileService";
import { useNotifications } from "../hooks/useNotifications";
import NotFound from "./NotFound";

const { Text } = Typography;

interface Present {
  present_id: number;
  present_num: number;
  image_url: string | null;
  collection: { collection_name: string } | null;
  model_id: number | null;
  is_on_sale?: boolean;
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
  presents: Present[];
  albums: Album[];
}

const ALL_TAB = "All";
const DEFAULT_VISIBLE_COUNT = 36;
const MAX_ALBUMS_PER_USER = 10;
const MAX_ALBUM_TITLE_LENGTH = 30;

type SegmentedValue = typeof ALL_TAB | number;

const getStoredCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
};

const AccountView = () => {
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
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);

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
    fetch(`${process.env.REACT_APP_API_URL}/user-info/web/${username}`)
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

  const { notifications, unreadCount, markAllRead } = useNotifications(
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
      messageApi.warning(`You can create up to ${MAX_ALBUMS_PER_USER} albums`);
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
      messageApi.error(error instanceof Error ? error.message : "Failed to create album");
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
      messageApi.error(error instanceof Error ? error.message : "Failed to rename album");
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
      messageApi.error(error instanceof Error ? error.message : "Failed to delete album");
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
      label: <span>All</span>,
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
  const activeAlbumTitle = activeAlbum?.album_title ?? ALL_TAB;
  const hasReachedAlbumLimit = user.albums.length >= MAX_ALBUMS_PER_USER;
  const renderSocialAccount = (
    provider: "tg" | "vk",
    usernameValue: string | null,
    userIdValue: number | null | undefined,
    visibility: number,
  ) => {
    const isVisible = Number(visibility) === 1;
    const label = provider === "tg"
      ? usernameValue || (userIdValue ? "Telegram connected" : "Telegram not connected")
      : usernameValue || (userIdValue ? `id${userIdValue}` : "VK not connected");

    const href = provider === "tg"
      ? (usernameValue ? `https://t.me/${usernameValue}` : null)
      : (userIdValue ? `https://vk.com/id${userIdValue}` : null);

    return (
      <div className="flex items-center gap-2">
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
            className="flex items-center gap-1"
          >
            {label}
          </a>
        ) : (
          <SpoilerSpan pointerEvents={isOwn ? "auto" : "none"} className="text-[var(--liquid-glass-fg)]">
            {label}
          </SpoilerSpan>
        )}
      </div>
    );
  };

  return (
    <Layout className="min-h-screen">
      {contextHolder}

      <Content className="gap-5 flex flex-col py-[var(--size-2xs)] px-[var(--size-4xl)]">
        <Flex className="gap-5 flex justify-between items-start" vertical={false}>
          <Flex className="gap-5" vertical={false}>
            <Avatar
              size={140}
              src={
                user.profile_pic_url
                  ? `${process.env.REACT_APP_IMAGES_URL}/pfps/${user.profile_pic_url}`
                  : `${process.env.REACT_APP_IMAGES_URL}/pfps/example_user.png`
              }
              className="border border-gray-500 shrink-0"
            />

            <Flex vertical>
              <Title level={2} className="!mb-0">
                {user.username}
              </Title>

              {renderSocialAccount("tg", user.tg_username, user.user_tg_id, user.tg_visibility)}
              {renderSocialAccount("vk", user.vk_username, user.user_vk_id, user.vk_visibility)}

              <Text className="mt-3 leading-relaxed">{user.about_me}</Text>
            </Flex>
          </Flex>

          {isOwn ? (
            <Flex className="gap-3 flex flex-row h-full !items-center" vertical={false}>
              <Tooltip title="Send Gift">
                <Button
                  size="large"
                  icon={<GiftOutlined />}
                  className="!bg-[var(--liquid-glass-bg)]"
                  onClick={() => setIsGiftOpen(true)}
                >
                  Send Gift
                </Button>
              </Tooltip>
              <Tooltip title="History">
                <Button
                  size="large"
                  icon={<HistoryOutlined />}
                  className="!bg-[var(--liquid-glass-bg)]"
                  onClick={() => setIsHistoryOpen(true)}
                />
              </Tooltip>
              <Button
                size="large"
                icon={<EditOutlined />}
                className="!bg-[var(--liquid-glass-bg)]"
                onClick={() => setIsEditProfileOpen(true)}
              >
                Edit
              </Button>
            </Flex>
          ) : (
            <Flex className="gap-3 flex flex-row h-full !items-center" vertical={false}>
              {getStoredCurrentUser().user_id && (
                <Tooltip title="Send Gift">
                  <Button
                    size="large"
                    icon={<GiftOutlined />}
                    className="!bg-[var(--liquid-glass-bg)]"
                    onClick={() => setIsGiftOpen(true)}
                  >
                    Send Gift
                  </Button>
                </Tooltip>
              )}
              {getStoredCurrentUser().user_id && (
                <Tooltip title="Report">
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

        <div className="overflow-x-auto overflow-y-hidden whitespace-nowrap w-full">
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

            {isOwn && (
              <>
                {isAddingAlbum ? (
                  <Input
                    autoFocus
                    disabled={isCreatingAlbum}
                    maxLength={MAX_ALBUM_TITLE_LENGTH}
                    placeholder="Album name"
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
                  <Tooltip title={hasReachedAlbumLimit ? `Maximum ${MAX_ALBUMS_PER_USER} albums` : "Create album"}>
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
                {activeAlbumId === null ? "No gifts yet" : `No gifts in ${activeAlbumTitle}`}
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
                  isOwner={isOwn}
                  isVisible={item.is_visible !== 0}
                  albums={user.albums}
                  activeAlbumId={activeAlbumId}
                  onRefresh={loadUser}
                >
                  <ProfileGiftCard
                    cardImage={item.model_id !== null ? `${process.env.REACT_APP_IMAGES_URL}/presents/${`${item.image_url}.webp` || "placeholder.png"}` : `${process.env.REACT_APP_IMAGES_URL}/collections/${item.image_url}.webp`}
                    name={item.collection?.collection_name}
                    number={item.present_num}
                    isOnSale={item.is_on_sale}
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
          open={isEditProfileOpen}
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
          open={isReportOpen}
          senderId={getStoredCurrentUser().user_id}
          receiverId={user.user_id}
          onClose={() => setIsReportOpen(false)}
        />

        <SendGiftModal
          open={isGiftOpen}
          senderId={getStoredCurrentUser().user_id}
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

        <GiftDetailModal
          open={!!selectedGiftId}
          presentId={selectedGiftId}
          userId={user.user_id}
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
