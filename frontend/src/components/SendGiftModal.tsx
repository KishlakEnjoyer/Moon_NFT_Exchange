import { Avatar, Button, Flex, Image, Input, Modal, message, Typography } from "antd";
import { useEffect, useState } from "react";

const { Text, Title } = Typography;
const { TextArea } = Input;

const MAX_DESCRIPTION_LENGTH = 200;

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
}

interface SendGiftModalProps {
  open: boolean;
  senderId: number;
  onClose: () => void;
  onSent: () => void;
  initialReceiverId?: number | null;
}

const SendGiftModal = ({ open, senderId, onClose, onSent, initialReceiverId }: SendGiftModalProps) => {
  const [messageApi, contextHolder] = message.useMessage();

  const [step, setStep] = useState<"user" | "collection">("user");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialReceiverId ?? null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);

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
  }, [open, initialReceiverId, messageApi]);

  const loadUsers = (query: string) => {
    fetch(`${process.env.REACT_APP_API_URL}/user-info/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const others = data.filter((u: any) => u.user_id !== senderId);
          const self = data.find((u: any) => u.user_id === senderId);
          setUsers(self ? [self, ...others] : others);
        }
      })
      .catch(() => setUsers([]));
  };

  const loadCollections = () => {
    fetch(`${process.env.REACT_APP_API_URL}/api/filters/collections`)
      .then((res) => res.json())
      .then((data) => setCollections(Array.isArray(data) ? data : []))
      .catch(() => {
        messageApi.error("Failed to load collections");
        setCollections([]);
      });
  };

  useEffect(() => {
    if (step === "user") {
      const timer = setTimeout(() => loadUsers(searchQuery), 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, step, senderId]);

  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
    setStep("collection");
    loadCollections();
  };

  const handleSend = async () => {
    if (!selectedUserId || !selectedCollectionId) return;

    setIsSending(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/gifts/send`, {
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
        throw new Error(error.detail || "Failed to send gift");
      }

      messageApi.success("Gift sent successfully!");
      onSent();
      onClose();
    } catch (error) {
      console.error("Failed to send gift:", error);
      messageApi.error(error instanceof Error ? error.message : "Failed to send gift");
    } finally {
      setIsSending(false);
    }
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  const collectionImage = (url: string | null | undefined) => {
    if (!url) return `${process.env.REACT_APP_IMAGES_URL}/collections/placeholder.png`;
    return `${process.env.REACT_APP_IMAGES_URL}/collections/${url}.webp`;
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={
          <Flex justify="space-between" gap={8}>
            {step === "collection" && (
              <Button onClick={() => setStep("user")} className="!bg-[var(--liquid-glass-bg)]">
                Back
              </Button>
            )}
            <Flex justify="flex-end" gap={8} className="flex-1">
              <Button onClick={onClose} className="!bg-[var(--liquid-glass-bg)]">
                Cancel
              </Button>
              {step === "collection" && selectedCollectionId && (
                <Button
                  type="primary"
                  onClick={handleSend}
                  loading={isSending}
                >
                  Send Gift {selectedCollection && `(${selectedCollection.base_price} TON)`}
                </Button>
              )}
            </Flex>
          </Flex>
        }
        width={560}
        title={<Title level={4} className="!mb-0">Send Gift</Title>}
      >
        <Flex vertical gap={16} className="mt-4">
          {step === "user" && (
            <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
              <Text strong className="block mb-3">Select a user to send a gift to</Text>
              <Input.Search
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
                allowClear
              />
              <Flex vertical gap={8} className="max-h-64 overflow-y-auto">
                {users.map((user) => {
                  const isSelf = user.user_id === senderId;
                  return (
                    <Flex
                      key={user.user_id}
                      align="center"
                      gap={12}
                      className={`cursor-pointer rounded-[var(--size-smm)] p-3 transition-colors ${isSelf ? 'bg-[var(--black-transparent-05)] border border-[var(--black-transparent)]' : 'hover:bg-[var(--black-transparent-05)]'}`}
                      onClick={() => handleUserSelect(user.user_id)}
                    >
                      <Avatar
                        size={40}
                        src={
                          user.profile_pic_url
                            ? `${process.env.REACT_APP_IMAGES_URL}/pfps/${user.profile_pic_url}`
                            : `${process.env.REACT_APP_IMAGES_URL}/pfps/example_user.png`
                        }
                      />
                      <Flex vertical>
                        <Text strong>{user.username}</Text>
                        {isSelf && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Gift yourself
                          </Text>
                        )}
                      </Flex>
                    </Flex>
                  );
                })}
                {users.length === 0 && (
                  <Text type="secondary" className="text-center py-4">
                    No users found
                  </Text>
                )}
              </Flex>
            </div>
          )}

          {step === "collection" && (
            <>
              {selectedUserId && (
                <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
                  <Text strong className="block mb-2">Recipient</Text>
                  <Flex align="center" gap={12}>
                    <Avatar
                      size={32}
                      src={
                        selectedUser?.profile_pic_url
                          ? `${process.env.REACT_APP_IMAGES_URL}/pfps/${selectedUser.profile_pic_url}`
                          : `${process.env.REACT_APP_IMAGES_URL}/pfps/example_user.png`
                      }
                    />
                    <Text>{selectedUser?.username || `User #${selectedUserId}`}</Text>
                  </Flex>
                </div>
              )}

              {!selectedCollectionId ? (
                <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-4">
                  <Text strong className="block mb-3">Select a collection</Text>
                  <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
                    {collections.map((col) => (
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
                      No collections available
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
                        Change collection
                      </Text>
                    </div>
                    </Flex>
                  </div>

                  <div className="rounded-[var(--size-smm)] border border-[var(--black-transparent)] bg-[var(--liquid-glass-bg)] p-6">
                    <Text strong className="block mb-2">Message (optional)</Text>
                    <TextArea
                      value={description}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      showCount
                      rows={3}
                      placeholder="Write a message..."
                      onChange={(e) => setDescription(e.target.value)}
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
