import useDocumentTitle from "../hooks/useDocumentTitle";
import { FloatButton, Layout, Spin, Empty, Flex, Typography } from "antd";
import { Content } from "antd/es/layout/layout";
import FilterBar from "../components/FilterBar";
import { InboxOutlined, UpOutlined } from "@ant-design/icons";
import ListingCard from "../components/ListingCard";
import CardList from "../components/CardList";
import { useState, useEffect, useCallback } from "react";
import { ApiListing, getActiveListings, addToCart, CartItem, getCart } from "../services/listingService";
import ModalPresentDetail from "../components/ModalPresentDetail";
import { message } from "antd";

const { Text } = Typography;

const getStoredCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
};

const MainView = () => {
  useDocumentTitle("Moon Exchange - Home");
  const [messageApi, contextHolder] = message.useMessage();

  const [listings, setListings] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedPresent, setSelectedPresent] = useState<ApiListing | null>(null);

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

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActiveListings();
      setListings(data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
    loadCart();
  }, [loadListings, loadCart]);

  const handleAddToCart = async (listingId: number) => {
    if (!currentUserId) {
      messageApi.warning("Please log in to add items to cart");
      return;
    }
    try {
      await addToCart(currentUserId, listingId);
      await loadCart();
      messageApi.success("Added to cart");
    } catch (e: any) {
      messageApi.error(e.message || "Failed to add to cart");
    }
  };

  const cartListingIds = new Set(cartItems.map((i) => i.listing_id));

  return (
    <Layout className="min-h-screen">
      {contextHolder}
      <Content className="py-[var(--size-2xs)] px-[var(--size-4xl)]">
        <div className="sticky top-0 z-[200] py-[var(--size-sm)] h-auto">
          <FilterBar />
        </div>

        {loading ? (
          <Spin size="large" className="my-20" />
        ) : listings.length === 0 ? (
          <Flex vertical align="center" justify="center" className="min-h-[60vh] gap-4">
            <Empty
              image={<InboxOutlined style={{ fontSize: 80, color: "var(--liquid-glass-fg)", opacity: 0.3 }} />}
              imageStyle={{ height: 100 }}
              description={
                <Text type="secondary" style={{ fontSize: "var(--size-lg)" }}>
                  No lots available
                </Text>
              }
            />
          </Flex>
        ) : (
          <CardList
            items={listings}
            renderCard={(item) => (
              <ListingCard
                item={item}
                onPresentClick={() => setSelectedPresent(item)}
                onAddToCart={handleAddToCart}
                isInCart={cartListingIds.has(item.listing_id)}
              />
            )}
          />
        )}

        <FloatButton.BackTop icon={<UpOutlined/>} className="!bg-[var(--liquid-glass-bg)] !right-[var(--size-s)] !bottom-[var(--size-s)]" shape="square"/>

        <ModalPresentDetail
          open={!!selectedPresent}
          item={selectedPresent}
          onClose={() => setSelectedPresent(null)}
          onAddToCart={handleAddToCart}
          isInCart={selectedPresent ? cartListingIds.has(selectedPresent.listing_id) : false}
        />
      </Content>
    </Layout>
  );
};

export default MainView;
