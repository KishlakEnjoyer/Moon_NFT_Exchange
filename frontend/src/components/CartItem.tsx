import { Avatar, Button, Flex, Typography } from "antd";
import { DeleteOutlined, ShoppingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import TONIcon from "./icons/TONIcon";
import { CartItem as CartItemType, getPresentImageUrl } from "../services/listingService";
import { useTranslation } from "react-i18next";
import UserNameWithBadge from "./UserNameWithBadge";

const { Text } = Typography;

interface CartItemProps {
  item: CartItemType;
  onRemove: (cart_item_id: number) => void;
  onBuy?: (item: CartItemType) => void;
  buying?: boolean;
  disabled?: boolean;
  onPresentClick?: (item: CartItemType) => void;
  onClose?: () => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onRemove, onBuy, buying, disabled, onPresentClick, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const price = parseFloat(item.price).toFixed(2);

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={12}
      wrap="wrap"
      className="bg-[var(--liquid-glass-bg)] rounded-[var(--size-smm)] p-2 sm:p-3 border border-solid border-[var(--black-40)]"
    >
      <Flex align="center" gap={12} className="min-w-0 flex-1">
        <Avatar
          size={{ xs: 56, sm: 76 }}
          src={getPresentImageUrl(item.present_image_url)}
          shape="square"
          className="rounded-[var(--size-xs)] cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => onPresentClick?.(item)}
        />
        <Flex vertical className="min-w-0">
          <Text
            strong
            ellipsis={{ tooltip: `${item.collection_name} # ${item.present_num}` }}
            className="cursor-pointer hover:opacity-75 transition-opacity text-[var(--size-base)] max-w-[180px] sm:max-w-[280px]"
            onClick={() => onPresentClick?.(item)}
          >
            {item.collection_name} # {item.present_num}
          </Text>
          <UserNameWithBadge
            username={item.seller_username}
            fallback={t("common.unknown")}
            badgeId={item.seller_profile_badge_achievement_id}
            badgeImageUrl={item.seller_profile_badge_image_url}
            badgeTitle={item.seller_profile_badge_title}
            badgeSize={16}
            textColorClassName="!text-gray-400"
            textClassName="text-[var(--size-sm)]"
            className="hover:underline"
            onClick={() => {
              onClose?.();
              if (item.seller_username) {
                navigate(`/account/${item.seller_username}`);
              }
            }}
          />
        </Flex>
      </Flex>

      <Flex align="center" gap={8} className="ml-auto">
        <Flex align="center" gap={4}>
          <Text strong className="text-[var(--size-base)]">{price}</Text>
          <TONIcon />
        </Flex>
        <Button
          type="primary"
          icon={<ShoppingOutlined />}
          loading={buying}
          disabled={disabled || buying}
          title={t("cart.buyItem")}
          onClick={() => onBuy?.(item)}
        >
          <span className="hidden sm:inline">{t("cart.buyItem")}</span>
        </Button>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          disabled={disabled || buying}
          onClick={() => onRemove(item.cart_item_id)}
        />
      </Flex>
      
    </Flex>
  );
};

export default CartItem;
