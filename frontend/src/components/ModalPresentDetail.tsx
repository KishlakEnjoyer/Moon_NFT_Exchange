import { Modal, Flex, Typography, Image, Button, Avatar } from "antd";
import { ListingFull } from "../fictive_data/listings";
import { getCollectionById } from "../fictive_data/collections";
import TONIcon from "./icons/TONIcon";
import { useNavigate } from "react-router-dom";
import { ShoppingCartOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface ModalPresentDetailProps {
  open: boolean;
  item: ListingFull | null;
  onClose: () => void;
}

const ModalPresentDetail: React.FC<ModalPresentDetailProps> = ({ open, item, onClose }) => {
  const navigate = useNavigate();
  if (!item) return null;

  const { present, seller, price } = item;
  const collection = getCollectionById(present.collection_id);

  const handleSellerClick = () => {
    onClose();
    navigate(`/account/${seller.username}`);
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
            src={`${process.env.REACT_APP_IMAGES_URL}/pfps/${seller.profile_pic_url}`}
          />
          <Text className="!text-[var(--accent-150)]">{seller.username}</Text>
        </Flex>
      ),
    },
    {
      key: 'Model',
      value: present.modelName,
    },
    {
      key: 'Symbol',
      value: present.symbolName,
    },
    {
      key: 'Backdrop',
      value: present.backgroundName,
    },
    {
      key: 'Quantity',
      value: collection
        ? `${present.present_num.toLocaleString('en-US')} of ${collection.collection_limit.toLocaleString('en-US')} issued`
        : present.present_num.toLocaleString('en-US'),
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
          src={`${process.env.REACT_APP_IMAGES_URL}/presents/${present.image_url}`}
          alt={present.collectionName}
          width={180}
          preview={false}
          className="rounded-[var(--size-smm)]"
        />

        <Flex vertical align="center" gap={4}>
          <Title level={4} className="!mb-0">
            {present.collectionName} #{present.present_num.toLocaleString('en-US')}
          </Title>
          <Text type="secondary">{present.modelName}</Text>
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
            {price} — Buy
        </Button>
        <Button type="default" size="large" style={{ flex: 1 }} icon={<ShoppingCartOutlined />}
            className="!bg-[var(--liquid-glass-bg)]"
        />
        </Flex>
      </Flex>
    </Modal>
  );
};

export default ModalPresentDetail;