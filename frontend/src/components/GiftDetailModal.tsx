import { Modal, Flex, Typography, Image, Button, Input, Tag, message } from "antd";
import { useState } from "react";
import { EyeOutlined, EyeInvisibleOutlined, TagOutlined } from "@ant-design/icons";
import TONIcon from "./icons/TONIcon";
import { createListing, togglePresentVisibility } from "../services/presentService";

const { Text, Title } = Typography;

interface Present {
  present_id: number;
  present_num: number;
  image_url: string | null;
  collection: { collection_name: string } | null;
  model_id: number | null;
  is_on_sale?: boolean;
}

interface GiftDetailModalProps {
  open: boolean;
  present: Present | null;
  userId: number;
  onClose: () => void;
  onRefresh: () => void;
}

const GiftDetailModal = ({ open, present, userId, onClose, onRefresh }: GiftDetailModalProps) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [selling, setSelling] = useState(false);
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!present) return null;

  const isUpgraded = present.model_id !== null;
  const imageUrl = present.image_url
    ? `${process.env.REACT_APP_IMAGES_URL}/collections/${present.image_url}.webp`
    : `${process.env.REACT_APP_IMAGES_URL}/presents/placeholder.png`;

  const handleToggleVisibility = async () => {
    try {
      await togglePresentVisibility(present.present_id, userId);
      onRefresh();
      messageApi.success(present.is_on_sale ? "Hidden" : "Shown");
    } catch (e: any) {
      messageApi.error(e.message || "Failed to toggle visibility");
    }
  };

  const handleSell = async () => {
    if (!price || parseFloat(price) <= 0) {
      messageApi.warning("Enter a valid price");
      return;
    }
    setSubmitting(true);
    try {
      await createListing(present.present_id, userId, price);
      messageApi.success("Listed for sale!");
      setSelling(false);
      setPrice("");
      onRefresh();
    } catch (e: any) {
      messageApi.error(e.message || "Failed to list for sale");
    } finally {
      setSubmitting(false);
    }
  };

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
            alt={present.collection?.collection_name || "Gift"}
            width={180}
            preview={false}
            className="rounded-[var(--size-smm)]"
          />

          <Flex vertical align="center" gap={4}>
            <Title level={4} className="!mb-0">
              {present.collection?.collection_name || "Unknown"} #{present.present_num}
            </Title>
            {isUpgraded ? (
              <Tag color="purple">Upgraded</Tag>
            ) : (
              <Tag>Basic</Tag>
            )}
            {present.is_on_sale && (
              <Tag color="orange">On Sale</Tag>
            )}
          </Flex>

          <Flex vertical gap={8} className="w-full">
            <Button
              type="default"
              size="large"
              block
              icon={present.is_on_sale ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              className="!bg-[var(--liquid-glass-bg)]"
              onClick={handleToggleVisibility}
            >
              {present.is_on_sale ? "Hide" : "Show"}
            </Button>

            {isUpgraded && !selling && !present.is_on_sale && (
              <Button
                type="primary"
                size="large"
                block
                icon={<TagOutlined />}
                onClick={() => setSelling(true)}
              >
                Put on Sale
              </Button>
            )}

            {selling && (
              <Flex vertical gap={8}>
                <Input
                  type="number"
                  placeholder="Price in TON"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  addonAfter={<TONIcon />}
                  size="large"
                />
                <Flex gap={8}>
                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={handleSell}
                    loading={submitting}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="large"
                    block
                    onClick={() => { setSelling(false); setPrice(""); }}
                  >
                    Cancel
                  </Button>
                </Flex>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

export default GiftDetailModal;
