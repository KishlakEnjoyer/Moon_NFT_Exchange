import { Modal, Flex, Typography, Image, Button, Avatar } from "antd";
import { ApiListing, getPresentImageUrl } from "../services/listingService";
import TONIcon from "./icons/TONIcon";
import { useNavigate } from "react-router-dom";
import { ShoppingCartOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface ModalPresentDetailProps {
  open: boolean;
  item: ApiListing | null;
  onClose: () => void;
  onAddToCart?: (listingId: number) => void;
  isInCart?: boolean;
}

const ModalPresentDetail: React.FC<ModalPresentDetailProps> = ({ open, item, onClose, onAddToCart, isInCart }) => {
  const navigate = useNavigate();
  if (!item) return null;

  const price = parseFloat(item.price).toFixed(2);

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
            size={24}
            src={`${process.env.REACT_APP_IMAGES_URL}/pfps/example_user.png`}
          />
          <Text className="!text-[var(--accent-150)]">{item.seller_username || 'Unknown'}</Text>
        </Flex>
      ),
    },
    {
      key: 'Model',
      value: item.model_name || '—',
    },
    {
      key: 'Symbol',
      value: item.symbol_name || '—',
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={400}
      title={null}
    >
      <Flex vertical align="center" gap={16} className="pt-4">
        <Image
          src={getPresentImageUrl(item.present_image_url)}
          alt={item.collection_name}
          width={180}
          preview={false}
          className="rounded-[var(--size-smm)]"
        />

        <Flex vertical align="center" gap={4}>
          <Title level={4} className="!mb-0">
            {item.collection_name} #{item.present_id}
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

        <Flex className="w-full" gap={8}>
          <Button type="primary" size="large" style={{ flex: 3 }} icon={<TONIcon />}>
            {price} TON — Buy
          </Button>
          <Button 
            type="default" 
            size="large" 
            style={{ flex: 1 }} 
            icon={<ShoppingCartOutlined />}
            className="!bg-[var(--liquid-glass-bg)]"
            onClick={() => onAddToCart?.(item.listing_id)}
            disabled={isInCart}
          />
        </Flex>
      </Flex>
    </Modal>
  );
};

export default ModalPresentDetail;
