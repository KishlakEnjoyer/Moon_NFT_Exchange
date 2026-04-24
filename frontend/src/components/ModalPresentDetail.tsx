import { Modal, Flex, Typography, Image, Button, Avatar } from "antd";
import { ApiListing, formatTonPrice, getPresentImageUrl, getSellerAvatarUrl } from "../services/listingService";
import TONIcon from "./icons/TONIcon";
import { useNavigate } from "react-router-dom";
import { ShoppingCartOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

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
      key: 'Owner',
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
          <Text className="!text-[var(--accent-150)] max-w-[150px]" ellipsis={{ tooltip: item.seller_username || 'Unknown' }}>
            {item.seller_username || 'Unknown'}
          </Text>
        </Flex>
      ),
    },
    {
      key: 'Model',
      value: item.model_name || '-',
    },
    {
      key: 'Symbol',
      value: item.symbol_name || '-',
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
              className={`px-4 py-3 ${i % 2 === 0 ? 'bg-[var(--liquid-glass-bg)]' : ''} ${i !== attributes.length - 1 ? 'border-b border-[var(--black-transparent)]' : ''}`}
            >
              <Text type="secondary" className="shrink-0 mr-4">{attr.key}</Text>
              <Flex align="center" gap={8}>
                {typeof attr.value === 'string' ? (
                  <Text>{attr.value}</Text>
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
            <span className="block min-w-0 truncate">{price} TON - Buy</span>
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
