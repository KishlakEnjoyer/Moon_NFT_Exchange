import { Modal, Flex, Typography, Image, Button, Avatar } from "antd";
import { ApiListing, formatTonPrice, getPresentImageUrl, getSellerAvatarUrl, recordListingView } from "../services/listingService";
import TONIcon from "./icons/TONIcon";
import { useNavigate } from "react-router-dom";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { getPriceEstimate } from "../services/presentService";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;
const MARKET_TOLERANCE = 0.05;

interface ModalPresentDetailProps {
  open: boolean;
  item: ApiListing | null;
  onClose: () => void;
  onAddToCart?: (listingId: number) => void;
  onBuy?: (listingId: number) => void;
  isInCart?: boolean;
  isOwnListing?: boolean;
  buying?: boolean;
}

const ModalPresentDetail: React.FC<ModalPresentDetailProps> = ({
  open,
  item,
  onClose,
  onAddToCart,
  onBuy,
  isInCart,
  isOwnListing,
  buying,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [marketStatusKey, setMarketStatusKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    recordListingView(item.listing_id).catch((error) => {
      console.error("Failed to record listing view:", error);
    });
  }, [open, item]);

  useEffect(() => {
    if (!open || !item) {
      setMarketStatusKey(null);
      return;
    }

    let cancelled = false;
    setMarketStatusKey(null);

    getPriceEstimate(item.present_id)
      .then((estimate) => {
        if (cancelled) return;

        const avgPrice = Number(estimate.avg_price);
        const listingPrice = Number(item.price);

        if (!Number.isFinite(avgPrice) || avgPrice <= 0 || !Number.isFinite(listingPrice)) {
          setMarketStatusKey("listing.marketPrice");
          return;
        }

        if (listingPrice > avgPrice * (1 + MARKET_TOLERANCE)) {
          setMarketStatusKey("listing.aboveMarket");
          return;
        }

        if (listingPrice < avgPrice * (1 - MARKET_TOLERANCE)) {
          setMarketStatusKey("listing.belowMarket");
          return;
        }

        setMarketStatusKey("listing.marketPrice");
      })
      .catch(() => {
        if (!cancelled) {
          setMarketStatusKey("listing.marketPrice");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, item]);

  if (!item) return null;

  const price = formatTonPrice(item.price, true);
  const fullPrice = formatTonPrice(item.price);

  const handleSellerClick = () => {
    onClose();
    if (item.seller_username) {
      navigate(`/account/${item.seller_username}`);
    }
  };

  const attributes = [
    {
      key: t("listing.owner"),
      value: (
        <Flex
          align="center"
          gap={8}
          className="cursor-pointer hover:opacity-75 transition-opacity"
          onClick={handleSellerClick}
        >
          <Avatar
            size={32}
            src={getSellerAvatarUrl(item.seller_profile_pic_url)}
            className="shrink-0 border border-solid border-[var(--black-transparent)]"
          />
          <Text className="!text-[var(--accent-150)] max-w-[150px]" ellipsis={{ tooltip: item.seller_username || t("common.unknown") }}>
            {item.seller_username || t("common.unknown")}
          </Text>
        </Flex>
      ),
    },
    {
      key: t("listing.model"),
      value: item.model_name || '-',
    },
    {
      key: t("listing.symbol"),
      value: item.symbol_name || '-',
    },
    {
      key: t("listing.market"),
      value: marketStatusKey ? t(marketStatusKey) : t("listing.checkingMarket"),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(400px, calc(100vw - 24px))"
      title={null}
      centered
    >
      <Flex vertical align="center" gap={16} className="pt-4">
        <Image
          src={getPresentImageUrl(item.present_image_url)}
          alt={item.collection_name}
          width="min(180px, 60vw)"
          preview={false}
          className="rounded-[var(--size-smm)]"
        />

        <Flex vertical align="center" gap={4}>
          <Title level={4} className="!mb-0 !text-center max-w-full">
            {item.collection_name} # {item.present_num}
          </Title>
          {item.model_name && <Text type="secondary">{item.model_name}</Text>}
        </Flex>

        <div className="w-full rounded-[var(--size-smm)] border-solid border border-[var(--black-60)] overflow-hidden">
          {attributes.map((attr, i) => (
            <Flex
              key={attr.key}
              justify="space-between"
              align="center"
              gap={12}
              wrap="wrap"
              className={`px-4 py-3 ${i % 2 === 0 ? 'bg-[var(--liquid-glass-bg)]' : ''} ${i !== attributes.length - 1 ? 'border-b border-[var(--black-transparent)]' : ''}`}
            >
              <Text type="secondary" className="shrink-0 mr-4">{attr.key}</Text>
              <Flex align="center" gap={8} className="min-w-0">
                {typeof attr.value === 'string' ? (
                  <Text className="break-words text-right">{attr.value}</Text>
                ) : (
                  attr.value
                )}
              </Flex>
            </Flex>
          ))}
        </div>

        <div
          className="grid w-full items-center gap-2"
          style={{ gridTemplateColumns: "minmax(0, 1fr) 52px" }}
        >
          <Button
            type="primary"
            size="large"
            icon={<TONIcon />}
            className="min-w-0"
            title={`${fullPrice} TON`}
            loading={buying}
            disabled={isOwnListing}
            onClick={() => onBuy?.(item.listing_id)}
          >
            <span className="block min-w-0 truncate">{t("listing.buyFor", { price })}</span>
          </Button>
          <Button 
            type="default" 
            size="large" 
            icon={<ShoppingCartOutlined />}
            className="!bg-[var(--liquid-glass-bg)]"
            onClick={() => onAddToCart?.(item.listing_id)}
            disabled={isInCart || isOwnListing}
          />
        </div>
      </Flex>
    </Modal>
  );
};

export default ModalPresentDetail;
