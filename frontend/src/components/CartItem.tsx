import { Avatar, Button, Flex, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import TONIcon from "./icons/TONIcon";
import { ListingFull } from "../fictive_data/listings";

const { Text } = Typography;

interface CartItemProps {
  item: ListingFull;
  onRemove: (listing_id: number) => void;
  onPresentClick?: (item: ListingFull) => void;
  onClose?: () => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onRemove, onPresentClick, onClose }) => {
  const navigate = useNavigate();

  return (
    <Flex
      align="center"
      justify="space-between"
      className="bg-[var(--liquid-glass-bg)] rounded-[var(--size-smm)] p-3 border border-solid border-[var(--black-40)]"
    >
      <Flex align="center" gap={12}>
        <Avatar
          size={76}
          src={`${process.env.REACT_APP_IMAGES_URL}/presents/${item.present.image_url}`}
          shape="square"
          className="rounded-[var(--size-xs)] cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => onPresentClick?.(item)}
        />
        <Flex vertical>
          <Text
            strong
            className="cursor-pointer hover:opacity-75 transition-opacity text-[var(--size-base)]"
            onClick={() => onPresentClick?.(item)}
          >
            {item.present.collectionName} #{item.present.present_num}
          </Text>
          <Text
            type="secondary"
            className="cursor-pointer hover:underline text-[var(--size-sm)]"
            onClick={() => {
                onClose?.();  
                navigate(`/account/${item.seller.username}`);
            }}
          >
            {item.seller.username}
          </Text>
        </Flex>
      </Flex>

      <Flex align="center" gap={8}>
        <Flex align="center" gap={4}>
          <Text strong className="text-[var(--size-base)]">{item.price}</Text>
          <TONIcon />
        </Flex>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemove(item.listing_id)}
        />
      </Flex>
      
    </Flex>
  );
};

export default CartItem;