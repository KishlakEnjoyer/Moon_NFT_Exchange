import { UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Flex, Image, Input, Modal, Tag, message, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "../services/auth";
import { useTranslation } from "react-i18next";
import UserNameWithBadge from "./UserNameWithBadge";

const { Text, Title } = Typography;
const { TextArea } = Input;

const MAX_DESCRIPTION_LENGTH = 100;

interface CollectionOption {
  id: number;
  name: string;
  image_url: string | null;
  base_price: string | null;
  purchase_limit: number | null;
}

interface UserOption {
  user_id: number;
  username: string;
  profile_pic_url: string | null;
  is_active: number;
  profile_badge_achievement_id: number | null;
  profile_badge_image_url: string | null;
  profile_badge_title: string | null;
}

interface SendGiftModalProps {
  open: boolean;
  senderId: number;
  onClose: () => void;
  onSent: (newBalance?: number) => void;
  initialReceiverId?: number | null;
}

const getStoredCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
};

const getSelfUserOption = (senderId: number): UserOption | null => {
  const currentUser = getStoredCurrentUser();
  if (Number(currentUser.user_id) !== senderId) {
    return null;
  }

  return {
    user_id: senderId,
    username: currentUser.username || `User #${senderId}`,
    profile_pic_url: currentUser.profile_pic_url || null,
    is_active: currentUser.is_active ?? 1,
    profile_badge_achievement_id: currentUser.profile_badge_achievement_id ?? null,
    profile_badge_image_url: currentUser.profile_badge_image_url ?? null,
    profile_badge_title: currentUser.profile_badge_title ?? null,
  };
};

const SendGiftModal = ({
  open,
  senderId,
  onClose,
  onSent,
  initialReceiverId,
}: SendGiftModalProps) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const [step, setStep] = useState<"user" | "collection">("user");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialReceiverId ?? null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionSearchQuery, setCollectionSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);

  const loadUsers = useCallback((query: string) => {
    const params = new URLSearchParams({
      q: query,
      include_user_id: String(senderId),
    });

    fetch(`${process.env.REACT_APP_API_URL}/user-info/search?${params.toString()}`)
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const self = data.find((u: any) => u.user_id === senderId)
            || (!query.trim() ? getSelfUserOption(senderId) : null);
          const others = data.filter((u: any) => u.user_id !== senderId);
          setUsers(self ? [self, ...others] : others);
        }
      })
      .catch(() => setUsers([]));
  }, [senderId]);

  const loadCollections = useCallback(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/filters/collections`)
      .then((res) => res.json())
      .then((data) => setCollections(Array.isArray(data) ? data : []))
      .catch(() => {
        messageApi.error(t("sendGift.failedLoadCollections"));
        setCollections([]);
      });
  }, [messageApi, t]);

  useEffect(() => {
    if (!open) return;

    if (initialReceiverId) {
      setSelectedUserId(initialReceiverId);
      setStep("collection");
      loadCollections();
    } else {
      setStep("user");
      setSelectedUserId(null);
      loadUsers("");
    }

    setSelectedCollectionId(null);
    setDescription("");
    setCollectionSearchQuery("");
  }, [loadCollections, loadUsers, open, initialReceiverId]);

  useEffect(() => {
    if (step === "user") {
      const timer = setTimeout(() => loadUsers(searchQuery), 300);
      return () => clearTimeout(timer);
    }
  }, [loadUsers, searchQuery, step]);

  const handleUserSelect = (userId: number) => {
    const user = users.find((item) => item.user_id === userId);
    if (user?.is_active === 0) {
      return;
    }

    setSelectedUserId(userId);
    setStep("collection");
    loadCollections();
  };

  const handleSend = async () => {
    if (!selectedUserId || !selectedCollectionId) return;

    setIsSending(true);

    try {
      const res = await authFetch(`${process.env.REACT_APP_API_URL}/gifts/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: senderId,
          receiver_id: selectedUserId,
          collection_id: selectedCollectionId,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || t("sendGift.failedSendGift"));
      }

      const data = await res.json();
      const newBalance = data.new_balance ? parseFloat(data.new_balance) : undefined;

      messageApi.success(t("sendGift.sent"));
      onSent(newBalance);
      onClose();
    } catch (error) {
      console.error("Failed to send gift:", error);
      messageApi.error(error instanceof Error ? error.message : t("sendGift.failedSendGift"));
    } finally {
      setIsSending(false);
    }
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
  const selectedUserBlocked = selectedUser?.is_active === 0;

  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(collectionSearchQuery.trim().toLowerCase()),
  );

  const collectionImage = (url: string | null | undefined) => {
    if (!url) return `${process.env.REACT_APP_IMAGES_URL}/collections/placeholder.png`;

    if (/\.[a-z0-9]+$/i.test(url)) {
      return `${process.env.REACT_APP_IMAGES_URL}/collections/${url}`;
    }

    return `${process.env.REACT_APP_IMAGES_URL}/collections/${url}.webp`;
  };

  const handleBack = () => {
    if (step === "collection" && selectedCollectionId) {
      setSelectedCollectionId(null);
      return;
    }

    if (step === "collection") {
      setStep("user");
    }
  };

  return (
    <>
      {contextHolder}

      <Modal
        open={open}
        onCancel={onClose}
        footer={
          <Flex justify="space-between" gap={8} wrap="wrap">
            {step === "collection" && (
              <Button onClick={handleBack} className="!bg-[var(--liquid-glass-bg)]">
                {t("common.back")}
              </Button>
            )}

            <Flex justify="flex-end" gap={8} className="flex-1" wrap="wrap">
              <Button onClick={onClose} className="!bg-[var(--liquid-glass-bg)]">
                {t("common.cancel")}
              </Button>

              {step === "collection" && selectedCollectionId && !selectedUserBlocked && (
                <Button type="primary" onClick={handleSend} loading={isSending}>
                  {selectedCollection
                    ? t("sendGift.sendGiftPrice", { price: selectedCollection.base_price })
                    : t("sendGift.sendGift")}
                </Button>
              )}
            </Flex>
          </Flex>
        }
        width="min(560px, calc(100vw - 24px))"
        title={<Title level={4} className="!mb-0">{t("sendGift.title")}</Title>}
      >
        <Flex vertical gap={16} className="mt-4">
          {step === "user" && (
            <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
              <Text strong className="block mb-3">
                {t("sendGift.selectUser")}
              </Text>

              <Input.Search
                placeholder={t("sendGift.searchUsers")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
                allowClear
              />

              <Flex vertical gap={8} className="max-h-64 overflow-y-auto moon-mobile-scroll">
                {users.map((user) => {
                  const isSelf = user.user_id === senderId;
                  const isBlocked = user.is_active === 0;

                  return (
                    <Flex
                      key={user.user_id}
                      align="center"
                      gap={12}
                      className={`min-w-0 rounded-[var(--size-smm)] p-3 transition-colors ${
                        isBlocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                      } ${
                        isSelf
                          ? "bg-[var(--black-transparent-05)] border border-[var(--black-transparent)]"
                          : isBlocked
                            ? ""
                            : "hover:bg-[var(--black-transparent-05)]"
                      }`}
                      onClick={() => handleUserSelect(user.user_id)}
                    >
                      <Avatar
                        size={40}
                        src={
                          isBlocked || !user.profile_pic_url
                            ? undefined
                            : `${process.env.REACT_APP_IMAGES_URL}/pfps/${user.profile_pic_url}`
                        }
                        icon={isBlocked || !user.profile_pic_url ? <UserOutlined /> : undefined}
                      />

                      <Flex vertical className="min-w-0">
                        <UserNameWithBadge
                          username={user.username}
                          badgeId={user.profile_badge_achievement_id}
                          badgeImageUrl={user.profile_badge_image_url}
                          badgeTitle={user.profile_badge_title}
                          strong
                          className="max-w-full"
                        />

                        {isSelf && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t("sendGift.giftYourself")}
                          </Text>
                        )}

                        {isBlocked && (
                          <Tag color="red" className="w-fit">
                            {t("profile.accountBlocked")}
                          </Tag>
                        )}
                      </Flex>
                    </Flex>
                  );
                })}

                {users.length === 0 && (
                  <Text type="secondary" className="text-center py-4">
                    {t("sendGift.noUsers")}
                  </Text>
                )}
              </Flex>
            </div>
          )}

          {step === "collection" && (
            <>
              {selectedUserId && (
                <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
                  <Text strong className="block mb-2">
                    {t("sendGift.recipient")}
                  </Text>

                  <Flex align="center" gap={12}>
                    <Avatar
                      size={32}
                      src={
                        selectedUser?.is_active === 0 || !selectedUser?.profile_pic_url
                          ? undefined
                          : `${process.env.REACT_APP_IMAGES_URL}/pfps/${selectedUser.profile_pic_url}`
                      }
                      icon={
                        selectedUser?.is_active === 0 || !selectedUser?.profile_pic_url
                          ? <UserOutlined />
                          : undefined
                      }
                    />

                    <UserNameWithBadge
                      username={selectedUser?.username}
                      fallback={t("common.userFallback", { id: selectedUserId })}
                      badgeId={selectedUser?.profile_badge_achievement_id}
                      badgeImageUrl={selectedUser?.profile_badge_image_url}
                      badgeTitle={selectedUser?.profile_badge_title}
                    />

                    {selectedUserBlocked && (
                      <Tag color="red" className="w-fit">
                        {t("profile.accountBlocked")}
                      </Tag>
                    )}
                  </Flex>
                </div>
              )}

              {!selectedCollectionId ? (
                <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
                  <Text strong className="block mb-3">
                    {t("sendGift.selectCollection")}
                  </Text>

                  <Input.Search
                    placeholder={t("sendGift.searchCollections")}
                    value={collectionSearchQuery}
                    onChange={(e) => setCollectionSearchQuery(e.target.value)}
                    className="mb-4"
                    allowClear
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1 moon-mobile-scroll">
                    {filteredCollections.map((col) => (
                      <div
                        key={col.id}
                        className="group cursor-pointer rounded-lg border border-[var(--black-transparent)] bg-[var(--black-transparent-03)] overflow-hidden hover:border-[var(--liquid-glass-fg)] transition-all duration-200"
                        onClick={() => setSelectedCollectionId(col.id)}
                      >
                        <div className="flex items-center justify-center p-1">
                          <Image
                            src={collectionImage(col.image_url)}
                            alt={col.name}
                            preview={false}
                            className="w-full h-10 object-contain"
                          />
                        </div>

                        <div className="px-1.5 py-1 text-center">
                          <Text className="block text-[10px] truncate leading-tight text-[var(--liquid-glass-fg)]">
                            {col.name}
                          </Text>

                          <Text strong className="block text-[11px] text-[var(--liquid-glass-fg)] mt-0.5">
                            {col.base_price || "0"} TON
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>

                  {collections.length === 0 && (
                    <Text type="secondary" className="text-center py-4 block">
                      {t("sendGift.noCollections")}
                    </Text>
                  )}

                  {collections.length > 0 && filteredCollections.length === 0 && (
                    <Text type="secondary" className="text-center py-4 block">
                      {t("sendGift.noCollectionMatches")}
                    </Text>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
                    <Flex vertical align="center" gap={12}>
                      <div className="h-full w-full flex-shrink-0 flex items-center justify-center bg-[var(--black-transparent-05)] rounded-lg">
                        <Image
                          src={collectionImage(selectedCollection?.image_url)}
                          alt={selectedCollection?.name}
                          preview={false}
                          width={128}
                          height={128}
                          style={{ objectFit: "contain" }}
                        />
                      </div>

                      <Flex vertical className="flex-1">
                        <Text strong>{selectedCollection?.name}</Text>

                        <Text className="text-sm text-[var(--liquid-glass-fg)]">
                          {selectedCollection?.base_price || "0"} TON
                        </Text>
                      </Flex>

                      <div
                        className="mt-1 pt-1 border-t border-[var(--black-transparent)] cursor-pointer text-center"
                        onClick={() => setSelectedCollectionId(null)}
                      >
                        <Text type="secondary" className="text-xs hover:text-[var(--liquid-glass-fg)] transition-colors">
                          {t("sendGift.changeCollection")}
                        </Text>
                      </div>
                    </Flex>
                  </div>

                  <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-6">
                    <Text strong className="block mb-2">
                      {t("sendGift.messageOptional")}
                    </Text>

                    <TextArea
                      value={description}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      showCount={{
                        formatter: ({ count }) => `${count} / ${MAX_DESCRIPTION_LENGTH}`,
                      }}
                      rows={3}
                      placeholder={t("sendGift.writeMessage")}
                      onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </Flex>
      </Modal>
    </>
  );
};

export default SendGiftModal;
