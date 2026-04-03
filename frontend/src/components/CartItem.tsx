import { Avatar, Button, Flex, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import TONIcon from "./icons/TONIcon";
import { CartItem as CartItemType, getPresentImageUrl } from "../services/listingService";

const { Text } = Typography;

interface CartItemProps {
  item: CartItemType;
  onRemove: (cart_item_id: number) => void;
  onPresentClick?: (item: CartItemType) => void;
  onClose?: () => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onRemove, onPresentClick, onClose }) => {
  const navigate = useNavigate();
  const price = parseFloat(item.price).toFixed(2);

  return (
    <Flex
      align="center"
      justify="space-between"
      className="bg-[var(--liquid-glass-bg)] rounded-[var(--size-smm)] p-3 border border-solid border-[var(--black-40)]"
    >
      <Flex align="center" gap={12}>
        <Avatar
          size={76}
          src={getPresentImageUrl(item.present_image_url)}
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
            {item.collection_name} #{item.present_id}
          </Text>
          <Text
            type="secondary"
            className="cursor-pointer hover:underline text-[var(--size-sm)]"
            onClick={() => {
                onClose?.();  
                if (item.seller_username) {
                  navigate(`/account/${item.seller_username}`);
                }
            }}
          >
            {item.seller_username || 'Unknown'}
          </Text>
        </Flex>
      </Flex>

      <Flex align="center" gap={8}>
        <Flex align="center" gap={4}>
          <Text strong className="text-[var(--size-base)]">{price}</Text>
          <TONIcon />
        </Flex>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemove(item.cart_item_id)}
        />
      </Flex>
      
    </Flex>
  );
};

export default CartItem;
