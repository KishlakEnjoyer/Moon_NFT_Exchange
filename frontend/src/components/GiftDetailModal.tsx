import { Modal, Flex, Typography, Image, Button, Avatar, Tag, message, Popconfirm, InputNumber } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RightOutlined, CheckOutlined, FireOutlined, TagOutlined, StopOutlined } from "@ant-design/icons";
import {
  PresentDetail,
  cancelListing,
  createListing,
  getPresentDetail,
  getPresentDisplayImageUrl,
  togglePresentVisibility,
  upgradePresent,
} from "../services/presentService";
import { authFetch } from "../services/auth";

const { Text, Title } = Typography;

const API_URL = process.env.REACT_APP_API_URL;

interface GiftDetailModalProps {
  open: boolean;
  presentId: number | null;
  userId: number;
  canManage?: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const GiftDetailModal = ({ open, presentId, userId, canManage = false, onClose, onRefresh }: GiftDetailModalProps) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [detail, setDetail] = useState<PresentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isListingFormOpen, setIsListingFormOpen] = useState(false);
  const [listingPrice, setListingPrice] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !presentId) return;
    setLoading(true);
    setDetail(null);
    setIsListingFormOpen(false);
    setListingPrice(null);
    getPresentDetail(presentId)
      .then((data) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [open, presentId]);

  if (!detail && !loading) return null;

  const handleToggleVisibility = async () => {
    if (!detail) return;
    try {
      await togglePresentVisibility(detail.present_id, userId);
      setDetail({ ...detail, is_visible: detail.is_visible === 1 ? 0 : 1 });
      onRefresh();
    } catch (e: any) {
      messageApi.error(e.message || "Failed to toggle visibility");
    }
  };

  const handleBurn = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`${API_URL}/presents/${detail.present_id}/burn?user_id=${userId}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Burn failed");
      }
      const data = await res.json();
      messageApi.success(`Burned! Received ${parseFloat(data.refund_amount).toFixed(2)} TON`);
      setDetail({ ...detail, is_burned: true });
      onRefresh();
    } catch (e: any) {
      messageApi.error(e.message || "Failed to burn");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgrade = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const data = await upgradePresent(detail.present_id, userId);
      const refreshed = await getPresentDetail(detail.present_id);
      setDetail(refreshed);
      onRefresh();

      try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        if (currentUser.user_id === userId) {
          localStorage.setItem(
            "currentUser",
            JSON.stringify({ ...currentUser, balance: parseFloat(data.new_balance) }),
          );
          window.dispatchEvent(new Event("storage"));
        }
      } catch {
      }

      messageApi.success(`Upgraded! Paid ${parseFloat(data.price).toFixed(2)} TON`);
    } catch (e: any) {
      messageApi.error(e.message || "Failed to upgrade");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateListing = async () => {
    if (!detail) return;
    if (!listingPrice || listingPrice <= 0) {
      messageApi.error("Enter a valid price");
      return;
    }

    setSubmitting(true);
    try {
      await createListing(detail.present_id, userId, listingPrice.toFixed(2));
      setDetail({ ...detail, is_on_sale: true });
      setIsListingFormOpen(false);
      setListingPrice(null);
      onRefresh();
      messageApi.success("Gift listed for sale");
    } catch (e: any) {
      messageApi.error(e.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelListing = async () => {
    if (!detail) return;

    setSubmitting(true);
    try {
      await cancelListing(detail.present_id);
      setDetail({ ...detail, is_on_sale: false });
      onRefresh();
      messageApi.success("Gift removed from sale");
    } catch (e: any) {
      messageApi.error(e.message || "Failed to remove listing");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerClick = () => {
    if (detail?.owner_username) {
      onClose();
      navigate(`/account/${detail.owner_username}`);
    }
  };

  const handleSenderClick = () => {
    if (detail?.original_sender_username) {
      onClose();
      navigate(`/account/${detail.original_sender_username}`);
    }
  };

  const basePrice = parseFloat(detail?.base_price || "0");
  const burnRefundPercent = parseFloat(process.env.REACT_APP_BURN_REFUND_PERCENT || "75");
  const upgradePercent = parseFloat(process.env.REACT_APP_UPGRADE_PERCENT || "25");
  const burnRefundAmount = (basePrice * burnRefundPercent / 100).toFixed(2);
  const upgradePriceAmount = (basePrice * upgradePercent / 100).toFixed(2);
  const ownerAvatarUrl = detail?.owner_profile_pic_url
    ? `${process.env.REACT_APP_IMAGES_URL}/pfps/${detail.owner_profile_pic_url}`
    : `${process.env.REACT_APP_IMAGES_URL}/pfps/example_user.png`;
  const senderAvatarUrl = detail?.original_sender_profile_pic_url
    ? `${process.env.REACT_APP_IMAGES_URL}/pfps/${detail.original_sender_profile_pic_url}`
    : `${process.env.REACT_APP_IMAGES_URL}/pfps/example_user.png`;
  const giftDescription = detail?.description?.trim();

  const attributes = [
    {
      key: "Owner",
      value: (
        <Flex
          align="center"
          gap={8}
          className="cursor-pointer hover:opacity-75 transition-opacity"
          onClick={handleOwnerClick}
        >
          <Avatar size={24} src={ownerAvatarUrl} />
          <Text className="!text-[var(--accent-150)]">{detail?.owner_username || "Unknown"}</Text>
        </Flex>
      ),
    },
    ...(detail?.original_sender_username ? [{
      key: "From",
      value: (
        <Flex
          align="center"
          gap={8}
          className="cursor-pointer hover:opacity-75 transition-opacity"
          onClick={handleSenderClick}
        >
          <Avatar size={24} src={senderAvatarUrl} />
          <Text className="!text-[var(--accent-150)]">{detail.original_sender_username}</Text>
        </Flex>
      ),
    }] : []),
    {
      key: "Collection",
      value: detail?.collection_name || "-",
    },
    {
      key: "Total Supply",
      value: detail?.total_supply || 0,
    },
    {
      key: "Base Price",
      value: `${parseFloat(detail?.base_price || "0").toFixed(2)} TON`,
    },
    ...(giftDescription ? [{
      key: "Message",
      value: (
        <Text className="max-w-[220px] whitespace-pre-wrap break-words text-right">
          {giftDescription}
        </Text>
      ),
    }] : [])
  ];

  if (detail?.is_upgraded) {
    if (detail.model_name) {
      attributes.push({ key: "Model", value: detail.model_name });
    }
    if (detail.background_name) {
      attributes.push({ key: "Background", value: detail.background_name });
    }
    if (detail.symbol_name) {
      attributes.push({ key: "Symbol", value: detail.symbol_name });
    }
  }

  const imageUrl = getPresentDisplayImageUrl(
    detail?.image_url || detail?.collection_image_url,
    !!detail?.is_upgraded,
  );

  const hasModels = detail?.has_models;
  const canListForSale = canManage && !!detail?.is_upgraded && !detail?.is_on_sale;
  const canRemoveFromSale = canManage && !!detail?.is_on_sale;

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={400}
        title={null}
      >
        <Flex vertical align="center" gap={16} className="pt-4">
          <Image
            src={imageUrl}
            alt={detail?.collection_name}
            width={180}
            preview={false}
            className="rounded-[var(--size-smm)]"
          />

          <Flex vertical align="center" gap={4}>
            <Title level={4} className="!mb-0">
              {detail?.collection_name} #{detail?.present_num}
            </Title>
            <Flex gap={4}>
              {detail?.is_upgraded ? (
                <Tag color="purple">Upgraded</Tag>
              ) : (
                <Tag>Basic</Tag>
              )}
              {detail?.is_on_sale && (
                <Tag color="orange">On Sale</Tag>
              )}
            </Flex>
          </Flex>

          <div className="w-full rounded-[var(--size-smm)] border-solid border border-[var(--black-60)] overflow-hidden">
            {attributes.map((attr, i) => (
              <Flex
                key={attr.key}
                justify="space-between"
                align="center"
                className={`px-4 py-3 ${i % 2 === 0 ? "bg-[var(--liquid-glass-bg)]" : ""} ${i !== attributes.length - 1 ? "border-b border-[var(--black-transparent)]" : ""}`}
              >
                <Text type="secondary" className="shrink-0 mr-4">{attr.key}</Text>
                <Flex align="center" gap={8}>
                  {typeof attr.value === "string" ? (
                    <Text>{attr.value}</Text>
                  ) : (
                    attr.value
                  )}
                </Flex>
              </Flex>
            ))}
          </div>

          <Flex vertical gap={8} className="w-full">
            {canManage && (
              <Flex
                align="center"
                justify="space-between"
                className="cursor-pointer px-2 py-1 rounded hover:bg-[var(--black-transparent-05)] transition-colors"
                onClick={handleToggleVisibility}
              >
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {detail?.is_visible === 1
                    ? "This gift is visible"
                    : "This gift is hidden"}
                </Text>
                <Text
                  className="!text-[var(--accent-150)]"
                  style={{ fontSize: 13 }}
                >
                  {detail?.is_visible === 1 ? "Hide from Profile" : "Show"} <RightOutlined style={{ fontSize: 10 }} />
                </Text>
              </Flex>
            )}

            {canManage && !detail?.is_on_sale && !detail?.is_upgraded && (
              <Popconfirm
                title="Burn to Redeem"
                description={
                  <Flex vertical gap={4}>
                    <Text>
                      You will receive <Text strong style={{ color: "var(--color-primary)" }}>{burnRefundAmount} TON</Text>
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({burnRefundPercent}% of base price). This action cannot be undone.
                    </Text>
                  </Flex>
                }
                onConfirm={handleBurn}
                okText="Burn"
                cancelText="Cancel"
                okButtonProps={{ danger: true, loading: submitting }}
              >
                <Button
                  danger
                  size="large"
                  block
                  icon={<FireOutlined />}
                  loading={submitting}
                >
                  Burn to Redeem - {burnRefundAmount} TON
                </Button>
              </Popconfirm>
            )}

            {canManage && hasModels && !detail?.is_upgraded && (
              <Button
                type="primary"
                size="large"
                block
                icon={<FireOutlined />}
                loading={submitting}
                onClick={handleUpgrade}
              >
                Upgrade - {upgradePriceAmount} TON
              </Button>
            )}

            {canListForSale && !isListingFormOpen && (
              <Button
                type="primary"
                size="large"
                block
                icon={<TagOutlined />}
                onClick={() => setIsListingFormOpen(true)}
              >
                List for Sale
              </Button>
            )}

            {canListForSale && isListingFormOpen && (
              <Flex vertical gap={8}>
                <InputNumber
                  min={0.01}
                  step={0.01}
                  precision={2}
                  value={listingPrice}
                  onChange={(value) => setListingPrice(typeof value === "number" ? value : null)}
                  placeholder="Price"
                  addonAfter="TON"
                  size="large"
                  className="w-full"
                />
                <Flex gap={8}>
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<TagOutlined />}
                    loading={submitting}
                    onClick={handleCreateListing}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="large"
                    block
                    onClick={() => {
                      setIsListingFormOpen(false);
                      setListingPrice(null);
                    }}
                  >
                    Cancel
                  </Button>
                </Flex>
              </Flex>
            )}

            {canRemoveFromSale && (
              <Button
                danger
                size="large"
                block
                icon={<StopOutlined />}
                loading={submitting}
                onClick={handleCancelListing}
              >
                Remove from Sale
              </Button>
            )}

            {(!canManage || !hasModels) && (
              <Button
                type="default"
                size="large"
                block
                icon={<CheckOutlined />}
                onClick={onClose}
              >
                OK
              </Button>
            )}
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

export default GiftDetailModal;
