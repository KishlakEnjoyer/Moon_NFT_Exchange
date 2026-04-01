import {
  Flex, Layout, Typography, Avatar, Button,
  Tooltip, Image,
  FloatButton,
  Segmented,
  Spin,
} from "antd";
import { Content } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";
import { Link, useParams } from "react-router-dom";
import { EditOutlined, HistoryOutlined, SmileOutlined, UpOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ProfileGiftCard from "../components/ProfileGiftCard";
import CardList from "../components/CardList";
import NotFound from "./NotFound";

const { Text } = Typography;

interface Present {
  present_id: number;
  present_num: number;
  image_url: string | null;
  collection: { collection_name: string; } | null;
}

interface UserProfile {
  user_id: number;
  username: string;
  tg_username: string | null;
  tg_visibility: number;
  profile_pic_url: string | null;
  about_me: string | null;
  presents: Present[];
}

const AccountView = () => {

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isOwn, setIsOwn] = useState(false);
  const [visibleCount, setVisibleCount] = useState(36);
  const [activeCollection, setActiveCollection] = useState<string>('All');

  const { username } = useParams();

  useEffect(() => {
    if (!username) return;

    fetch(`${process.env.REACT_APP_API_URL}/user-info/web/${username}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    const checkOwnership = () => {
      const raw = localStorage.getItem("currentUser");
      const currentUser = raw ? JSON.parse(raw) : null;
      setIsOwn(currentUser?.id === user?.user_id);
    };

    checkOwnership();
    window.addEventListener('storage', checkOwnership);
    return () => window.removeEventListener('storage', checkOwnership);
  }, [user]);

  // Исправлено: Set<string> → Array.from() чтобы не было ошибки downlevelIteration
  const collectionTabs = useMemo(() => {
    if (!user) return ['All'];
    const names = user.presents
      .map(p => p.collection?.collection_name)
      .filter((name): name is string => Boolean(name));
    return ['All', ...Array.from(new Set(names))];
  }, [user?.presents]);

  // Исправлено: filteredPresents теперь всегда Present[], не Present[] | undefined
  const filteredPresents = useMemo((): Present[] => {
    if (!user) return [];
    if (activeCollection === 'All') return user.presents;
    return user.presents.filter(p => p.collection?.collection_name === activeCollection);
  }, [user?.presents, activeCollection]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 12, filteredPresents.length));
  }, [filteredPresents.length]);

  // Исправлено: visibleCount сравниваем с filteredPresents.length, а не user?.presents.length
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredPresents.length) loadMore();
      },
      { threshold: 1.0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => { if (sentinelRef.current) observer.unobserve(sentinelRef.current); };
  }, [visibleCount, filteredPresents.length, loadMore]);

  if (loading) return <Spin size="large" className="my-20" />;
  if (!user) return <NotFound />;

  return (
    <Layout className="min-h-screen">
      <Content className="gap-5 flex flex-col py-[var(--size-2xs)] px-[var(--size-4xl)]">
        <Flex className="gap-5 flex justify-between items-start" vertical={false}>
          <Flex className="gap-5" vertical={false}>
            <Avatar
              size={140}
              src={`${process.env.REACT_APP_IMAGES_URL}/pfps/${user.profile_pic_url}`}
              className="border border-gray-500 shrink-0"
            />

            <Flex vertical>
              <Title level={2} className="!mb-0">
                {user.username}
              </Title>

              {(user.tg_visibility || isOwn) && (
                <Link
                  to={`https://t.me/${user.tg_username}`}
                  className="flex items-center gap-1"
                >
                  <Image
                    src="/icons/tg-icon-png.png"
                    alt="TgIcon"
                    style={{ width: "var(--size-lg)" }}
                    preview={false}
                  />
                  {user.tg_username}
                  {isOwn && !user.tg_visibility && (
                    <span className="text-xs text-gray-400 ml-1">Hidden</span>
                  )}
                </Link>
              )}

              <Text className="mt-3 leading-relaxed">
                {user.about_me}
              </Text>
            </Flex>
          </Flex>

          {isOwn ? (
            <Flex className="gap-3 flex flex-row h-full !items-center" vertical={false}>
              <Tooltip title="History">
                <Button size="large" icon={<HistoryOutlined />} className="!bg-[var(--liquid-glass-bg)]" />
              </Tooltip>
              <Button size="large" icon={<EditOutlined />} className="!bg-[var(--liquid-glass-bg)]">
                Edit
              </Button>
            </Flex>
          ) : <Flex />}
        </Flex>

        <div className="overflow-x-auto overflow-y-hidden whitespace-nowrap w-full">
          {/* Исправлено: collectionTabs всегда содержит минимум 'All', скрываем если только он и есть */}
          {collectionTabs.length > 1 ? (
            <Segmented<string>
              options={collectionTabs}
              value={activeCollection}
              onChange={(value) => {
                setActiveCollection(value);
                setVisibleCount(36);
              }}
              size="large"
            />
          ) : (
            <Text className="text-gray-400">No collections yet</Text>
          )}
        </div>

        <div className="mb-2">
          {/* Исправлено: проверяем filteredPresents, а не user.presents — чтобы работало и при фильтрации */}
          {filteredPresents.length === 0 && (
            <Flex className="justify-center text-center flex flex-col w-full gap-2.5 py-16">
              <SmileOutlined className="text-5xl text-[var(--liquid-glass-fg)] justify-center" rotate={180} />
              <Text className="text-gray-400">
                {activeCollection === 'All' ? 'No gifts yet' : `No gifts in ${activeCollection}`}
              </Text>
            </Flex>
          )}
          <CardList
            items={filteredPresents.slice(0, visibleCount)}
            renderCard={(item) => (
              <div className="w-full">
                <ProfileGiftCard
                  cardImage={`${process.env.REACT_APP_IMAGES_URL}/presents/${item.image_url || "placeholder.png"}`}
                  name={item.collection?.collection_name}
                  number={item.present_num}
                />
              </div>
            )}
          />
          <div ref={sentinelRef} className="h-1" />
        </div>

        <FloatButton.BackTop
          icon={<UpOutlined />}
          className="!bg-[var(--liquid-glass-bg)] !right-[var(--size-s)] !bottom-[var(--size-s)]"
          shape="square"
        />
      </Content>
    </Layout>
  );
};

export default AccountView;