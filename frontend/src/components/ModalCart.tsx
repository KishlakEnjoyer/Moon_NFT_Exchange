import { Modal, Button, Flex, Divider, Typography, Empty, message } from "antd";
import { useState, useEffect, useCallback } from "react";
import TONIcon from "./icons/TONIcon";
import { CartItem, getCart, removeFromCart, clearCart } from "../services/listingService";
import CartItemRow from "./CartItem";

const { Text, Title } = Typography;

const getStoredCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
};

interface ModalCartProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const ModalCart: React.FC<ModalCartProps> = ({ open, onClose, onOpen }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const currentUserId = getStoredCurrentUser().user_id;

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
      messageApi.error(e.message || "Failed to remove item");
    }
  };

  const handleClearCart = async () => {
    if (!currentUserId) return;
    try {
      await clearCart(currentUserId);
      setCartItems([]);
    } catch (e: any) {
      messageApi.error(e.message || "Failed to clear cart");
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
        title={<Title level={4} className="!mb-0">Cart</Title>}
        width={780}
      >
        <Flex vertical gap={12} className="mt-4 max-h-[65vh]">
          <Flex vertical gap={12} className="mt-4 max-h-[50vh] overflow-y-auto">
            {cartItems.length === 0 ? (
              <Empty description="Cart is empty" className="py-8" />
            ) : (
              <>
                <Flex justify="flex-end">
                  <Button type="link" size="small" onClick={handleClearCart}>
                    Clear cart
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
                <Text type="secondary">Total:</Text>
                <Flex align="center" gap={6}>
                  <Title level={4} className="!mb-0">{total.toFixed(2)}</Title>
                  <TONIcon />
                </Flex>
              </Flex>
              <Button type="primary" size="large" block>
                Buy
              </Button>
            </>
          )}
        </Flex>
      </Modal>
    </>
  );
};

export default ModalCart;
