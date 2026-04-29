import useDocumentTitle from "../hooks/useDocumentTitle";
import { FloatButton, Layout, Spin, Empty, Flex, Typography } from "antd";
import { Content } from "antd/es/layout/layout";
import FilterBar from "../components/FilterBar";
import type { FilterState } from "../components/FilterBar";
import { InboxOutlined, UpOutlined } from "@ant-design/icons";
import ListingCard from "../components/ListingCard";
import CardList from "../components/CardList";
import { useState, useEffect, useCallback } from "react";
import { ApiListing, getActiveListings, addToCart, CartItem, getCart, buyListing } from "../services/listingService";
import ModalPresentDetail from "../components/ModalPresentDetail";
import { message } from "antd";

const { Text } = Typography;

const DEFAULT_LISTING_FILTERS: FilterState = {
  search: "",
  smart: false,
  collection_ids: [],
  model_ids: [],
  background_ids: [],
  symbol_ids: [],
  sort: null,
};

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

const MainView = () => {
  useDocumentTitle("Moon Exchange - Home");
  const [messageApi, contextHolder] = message.useMessage();

  const [listings, setListings] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedPresent, setSelectedPresent] = useState<ApiListing | null>(null);
  const [buyingListingId, setBuyingListingId] = useState<number | null>(null);
  const [listingFilters, setListingFilters] = useState<FilterState>(DEFAULT_LISTING_FILTERS);

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
      const data = await getActiveListings(listingFilters);
      setListings(data);
    } catch (e: any) {
      setListings([]);
      messageApi.error(e.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [listingFilters, messageApi]);

  useEffect(() => {
    loadListings();
    loadCart();
  }, [loadListings, loadCart]);

  useEffect(() => {
    const handleListingsChanged = () => {
      loadListings();
      loadCart();
    };

    window.addEventListener("listingsChanged", handleListingsChanged);
    return () => window.removeEventListener("listingsChanged", handleListingsChanged);
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

  const handleBuyListing = async (listingId: number) => {
    if (!currentUserId) {
      messageApi.warning("Please log in to buy lots");
      return;
    }

    setBuyingListingId(listingId);
    try {
      const result = await buyListing(listingId);
      updateStoredBalance(result.new_balance);
      setListings((prev) => prev.filter((item) => item.listing_id !== listingId));
      setCartItems((prev) => prev.filter((item) => item.listing_id !== listingId));
      if (selectedPresent?.listing_id === listingId) {
        setSelectedPresent(null);
      }
      messageApi.success(`Purchased for ${parseFloat(result.price).toFixed(2)} TON`);
    } catch (e: any) {
      messageApi.error(e.message || "Failed to buy lot");
    } finally {
      setBuyingListingId(null);
    }
  };

  const cartListingIds = new Set(cartItems.map((i) => i.listing_id));

  const handleFilterChange = useCallback((filters: FilterState) => {
    setListingFilters(filters);
  }, []);

  return (
    <Layout className="min-h-screen">
      {contextHolder}
      <Content className="py-[var(--size-2xs)] px-2 sm:px-4 lg:px-[var(--size-4xl)]">
        <div className="sticky top-0 z-[200] py-2 sm:py-[var(--size-sm)] h-auto">
          <FilterBar loading={loading} onFilterChange={handleFilterChange} />
        </div>

        {loading ? (
          <Spin size="large" className="my-20" />
        ) : listings.length === 0 ? (
          <Flex vertical align="center" justify="center" className="min-h-[60vh] gap-4">
            <Empty
              image={<InboxOutlined style={{ fontSize: 80, color: "var(--liquid-glass-fg)", opacity: 0.3 }} />}
              styles={{ image: { height: 100 } }}
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
                onBuy={handleBuyListing}
                isInCart={cartListingIds.has(item.listing_id)}
                isOwnListing={item.seller_id === currentUserId}
                buying={buyingListingId === item.listing_id}
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
          onBuy={handleBuyListing}
          isInCart={selectedPresent ? cartListingIds.has(selectedPresent.listing_id) : false}
          isOwnListing={selectedPresent ? selectedPresent.seller_id === currentUserId : false}
          buying={selectedPresent ? buyingListingId === selectedPresent.listing_id : false}
        />
      </Content>
    </Layout>
  );
};

export default MainView;
