import useDocumentTitle from "../hooks/useDocumentTitle";
import { Avatar, FloatButton, Layout, Spin, Empty, Flex, Tag, Tabs, Typography } from "antd";
import { Content } from "antd/es/layout/layout";
import FilterBar from "../components/FilterBar";
import type { FilterState } from "../components/FilterBar";
import { InboxOutlined, TrophyOutlined, UpOutlined, UserOutlined } from "@ant-design/icons";
import ListingCard from "../components/ListingCard";
import CardList from "../components/CardList";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ApiListing,
  getActiveListings,
  addToCart,
  CartItem,
  getCart,
  buyListing,
  TopSpender,
  getTopSpenders,
  formatTonPrice,
  getSellerAvatarUrl,
} from "../services/listingService";
import ModalPresentDetail from "../components/ModalPresentDetail";
import { message } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;
type MainTabKey = "all" | "for_you" | "most_viewed" | "top_users";

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
  const { t } = useTranslation();
  useDocumentTitle("Moon Exchange - Home");
  const [messageApi, contextHolder] = message.useMessage();

  const [listings, setListings] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedPresent, setSelectedPresent] = useState<ApiListing | null>(null);
  const [buyingListingId, setBuyingListingId] = useState<number | null>(null);
  const [listingFilters, setListingFilters] = useState<FilterState>(DEFAULT_LISTING_FILTERS);
  const [activeTab, setActiveTab] = useState<MainTabKey>("all");
  const [topUsers, setTopUsers] = useState<TopSpender[]>([]);
  const [topUsersLoading, setTopUsersLoading] = useState(false);

  const currentUser = getStoredCurrentUser();
  const currentUserId = currentUser.user_id;
  const currentUserBlocked = currentUser.is_active === 0;
  const showListingFilters = activeTab === "all" || activeTab === "most_viewed";

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
    if (activeTab !== "all" && activeTab !== "most_viewed") return;

    setLoading(true);
    try {
      const effectiveFilters = activeTab === "most_viewed"
        ? { ...listingFilters, sort: "most_viewed" }
        : listingFilters;
      const data = await getActiveListings(effectiveFilters);
      setListings(data);
    } catch (e: any) {
      setListings([]);
      messageApi.error(e.message || t("marketplace.failedLoadListings"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, listingFilters, messageApi, t]);

  const loadTopUsers = useCallback(async () => {
    setTopUsersLoading(true);
    try {
      const data = await getTopSpenders(20);
      setTopUsers(data);
    } catch (e: any) {
      setTopUsers([]);
      messageApi.error(e.message || t("marketplace.failedLoadTopUsers"));
    } finally {
      setTopUsersLoading(false);
    }
  }, [messageApi, t]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    if (activeTab === "all" || activeTab === "most_viewed") {
      loadListings();
    }
  }, [activeTab, loadListings]);

  useEffect(() => {
    if (activeTab === "top_users") {
      loadTopUsers();
    }
  }, [activeTab, loadTopUsers]);

  useEffect(() => {
    const handleListingsChanged = () => {
      if (activeTab === "all" || activeTab === "most_viewed") {
        loadListings();
      }
      if (activeTab === "top_users") {
        loadTopUsers();
      }
      loadCart();
    };

    window.addEventListener("listingsChanged", handleListingsChanged);
    return () => window.removeEventListener("listingsChanged", handleListingsChanged);
  }, [activeTab, loadListings, loadTopUsers, loadCart]);

  const handleAddToCart = async (listingId: number) => {
    if (!currentUserId) {
      messageApi.warning(t("marketplace.loginAddCart"));
      return;
    }
    if (currentUserBlocked) {
      messageApi.error("Аккаунт заблокирован");
      return;
    }
    try {
      await addToCart(currentUserId, listingId);
      await loadCart();
      messageApi.success(t("marketplace.addedToCart"));
    } catch (e: any) {
      messageApi.error(e.message || t("marketplace.failedAddCart"));
    }
  };

  const handleBuyListing = async (listingId: number) => {
    if (!currentUserId) {
      messageApi.warning(t("marketplace.loginBuyLots"));
      return;
    }
    if (currentUserBlocked) {
      messageApi.error("Аккаунт заблокирован");
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
      messageApi.success(t("marketplace.purchasedFor", { price: parseFloat(result.price).toFixed(2) }));
    } catch (e: any) {
      messageApi.error(e.message || t("marketplace.failedBuyLot"));
    } finally {
      setBuyingListingId(null);
    }
  };

  const cartListingIds = new Set(cartItems.map((i) => i.listing_id));

  const handleFilterChange = useCallback((filters: FilterState) => {
    setListingFilters(filters);
  }, []);

  const tabItems = [
    { key: "all", label: t("marketplace.tabs.all") },
    { key: "for_you", label: t("marketplace.tabs.forYou") },
    { key: "most_viewed", label: t("marketplace.tabs.mostViewed") },
    { key: "top_users", label: t("marketplace.tabs.topUsers") },
  ];

  const renderListingContent = () => {
    if (loading) {
      return <Spin size="large" className="my-20" />;
    }

    if (listings.length === 0) {
      return (
        <Flex vertical align="center" justify="center" className="min-h-[60vh] gap-4">
          <Empty
            image={<InboxOutlined style={{ fontSize: 80, color: "var(--liquid-glass-fg)", opacity: 0.3 }} />}
            styles={{ image: { height: 100 } }}
            description={
              <Text type="secondary" style={{ fontSize: "var(--size-lg)" }}>
                {t("marketplace.noLots")}
              </Text>
            }
          />
        </Flex>
      );
    }

    return (
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
    );
  };

  const renderForYouContent = () => (
    <Flex vertical align="center" justify="center" className="min-h-[60vh] gap-4">
      <Empty
        image={<InboxOutlined style={{ fontSize: 80, color: "var(--liquid-glass-fg)", opacity: 0.3 }} />}
        styles={{ image: { height: 100 } }}
        description={
          <Text type="secondary" style={{ fontSize: "var(--size-lg)" }}>
            {t("marketplace.forYouPlaceholder")}
          </Text>
        }
      />
    </Flex>
  );

  const renderTopUsersContent = () => {
    if (topUsersLoading) {
      return <Spin size="large" className="my-20" />;
    }

    if (topUsers.length === 0) {
      return (
        <Flex vertical align="center" justify="center" className="min-h-[60vh] gap-4">
          <Empty
            image={<TrophyOutlined style={{ fontSize: 80, color: "var(--liquid-glass-fg)", opacity: 0.3 }} />}
            styles={{ image: { height: 100 } }}
            description={
              <Text type="secondary" style={{ fontSize: "var(--size-lg)" }}>
                {t("marketplace.noTopUsers")}
              </Text>
            }
          />
        </Flex>
      );
    }

    return (
      <div className="moon-top-users-list">
        {topUsers.map((user, index) => {
          const username = user.username ? `@${user.username}` : `User #${user.user_id}`;
          const avatarUrl = user.profile_pic_url ? getSellerAvatarUrl(user.profile_pic_url) : undefined;
          const name = user.username ? (
            <Link className="moon-top-user-link" to={`/account/${encodeURIComponent(user.username)}`}>
              {username}
            </Link>
          ) : (
            <Text strong>{username}</Text>
          );

          return (
            <div className="moon-top-user-row" key={user.user_id}>
              <Tag className="moon-top-user-rank" color={index < 3 ? "gold" : "default"}>
                {index < 3 && <TrophyOutlined />}
                {index + 1}
              </Tag>
              <Avatar
                size={44}
                src={avatarUrl}
                icon={!avatarUrl ? <UserOutlined /> : undefined}
              />
              <div className="moon-top-user-main">
                {name}
                <Text type="secondary" className="moon-top-user-meta">
                  {t("marketplace.transactionsCount", { count: user.transactions_count })}
                </Text>
              </div>
              <Text strong className="moon-top-user-spent">
                {t("marketplace.spentTon", { amount: formatTonPrice(user.spent_ton) })}
              </Text>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === "for_you") return renderForYouContent();
    if (activeTab === "top_users") return renderTopUsersContent();
    return renderListingContent();
  };

  return (
    <Layout className="min-h-screen">
      {contextHolder}
      <Content className="py-[var(--size-2xs)] px-2 sm:px-4 lg:px-[var(--size-4xl)]">
        <div className="sticky top-0 z-[200] py-2 sm:py-[var(--size-sm)] h-auto">
          <Tabs
            className="moon-market-tabs"
            activeKey={activeTab}
            items={tabItems}
            onChange={(key) => setActiveTab(key as MainTabKey)}
          />
          {showListingFilters && (
            <FilterBar loading={loading} onFilterChange={handleFilterChange} />
          )}
        </div>

        {renderContent()}

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
