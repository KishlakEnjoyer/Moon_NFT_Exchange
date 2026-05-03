import { Modal, Button, Flex, Divider, Typography, Empty, message } from "antd";
import { useState, useEffect, useCallback } from "react";
import TONIcon from "./icons/TONIcon";
import { CartItem, getCart, removeFromCart, clearCart, buyListing } from "../services/listingService";
import CartItemRow from "./CartItem";
import { useTranslation } from "react-i18next";

const { Text, Title } = Typography;

const getStoredCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
};

const updateStoredBalance = (newBalance: string | null) => {
  if (!newBalance) return;
  const currentUser = getStoredCurrentUser();
  if (!currentUser.user_id) return;
  localStorage.setItem(
    "currentUser",
    JSON.stringify({ ...currentUser, balance: parseFloat(newBalance) }),
  );
  window.dispatchEvent(new Event("storage"));
};

interface ModalCartProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const ModalCart: React.FC<ModalCartProps> = ({ open, onClose, onOpen }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [purchasing, setPurchasing] = useState(false);

  const currentUser = getStoredCurrentUser();
  const currentUserId = currentUser.user_id;
  const currentUserBlocked = currentUser.is_active === 0;

  const loadCart = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const cart = await getCart(currentUserId);
      setCartItems(cart.items);
    } catch {
      setCartItems([]);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (open) {
      loadCart();
    }
  }, [open, loadCart]);

  const handleRemove = async (cartItemId: number) => {
    try {
      await removeFromCart(cartItemId);
      setCartItems((prev) => prev.filter((item) => item.cart_item_id !== cartItemId));
    } catch (e: any) {
      messageApi.error(e.message || t("cart.failedRemoveItem"));
    }
  };

  const handleClearCart = async () => {
    if (!currentUserId) return;
    try {
      await clearCart(currentUserId);
      setCartItems([]);
    } catch (e: any) {
      messageApi.error(e.message || t("cart.failedClearCart"));
    }
  };

  const handleBuyCart = async () => {
    if (!currentUserId || cartItems.length === 0) return;
    if (currentUserBlocked) {
      messageApi.error("Аккаунт заблокирован");
      return;
    }

    setPurchasing(true);
    const purchasedListingIds: number[] = [];

    try {
      for (const item of cartItems) {
        const result = await buyListing(item.listing_id);
        purchasedListingIds.push(item.listing_id);
        updateStoredBalance(result.new_balance);
      }

      setCartItems([]);
      window.dispatchEvent(new Event("listingsChanged"));
      messageApi.success(t("cart.purchaseCompleted"));
    } catch (e: any) {
      setCartItems((prev) => prev.filter((item) => !purchasedListingIds.includes(item.listing_id)));
      window.dispatchEvent(new Event("listingsChanged"));
      messageApi.error(e.message || t("cart.failedBuyCart"));
    } finally {
      setPurchasing(false);
    }
  };

  const handlePresentClick = (_item: CartItem) => {
    onClose();
  };

  const total = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0);

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        title={<Title level={4} className="!mb-0">{t("cart.title")}</Title>}
        width="min(780px, calc(100vw - 24px))"
      >
        <Flex vertical gap={12} className="mt-4 max-h-[70vh]">
          <Flex vertical gap={12} className="mt-2 sm:mt-4 max-h-[52vh] overflow-y-auto moon-mobile-scroll">
            {cartItems.length === 0 ? (
              <Empty description={t("cart.empty")} className="py-8" />
            ) : (
              <>
                <Flex justify="flex-end">
                  <Button type="link" size="small" onClick={handleClearCart}>
                    {t("cart.clear")}
                  </Button>
                </Flex>
                {cartItems.map((item) => (
                  <CartItemRow
                    key={item.cart_item_id}
                    item={item}
                    onRemove={handleRemove}
                    onPresentClick={handlePresentClick}
                    onClose={onClose}
                  />
                ))}
              </>
            )}
          </Flex>

          {cartItems.length > 0 && (
            <>
              <Divider className="!my-2" />
              <Flex justify="space-between" align="center">
                <Text type="secondary">{t("cart.total")}</Text>
                <Flex align="center" gap={6}>
                  <Title level={4} className="!mb-0">{total.toFixed(2)}</Title>
                  <TONIcon />
                </Flex>
              </Flex>
              <Button type="primary" size="large" block loading={purchasing} disabled={currentUserBlocked} onClick={handleBuyCart}>
                {t("cart.buy")}
              </Button>
            </>
          )}
        </Flex>
      </Modal>
    </>
  );
};

export default ModalCart;
