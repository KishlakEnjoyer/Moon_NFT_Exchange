import {
  Flex, Layout, Typography, Avatar, Button,
  Tooltip, Image,
  FloatButton,
  Segmented,
} from "antd";
import { Content } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";
import { Link, useParams } from "react-router-dom";
import { EditOutlined, HistoryOutlined, UpOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState, useCallback } from "react";
import ProfileGiftCard from "../components/ProfileGiftCard";
import CardList from "../components/CardList";

import { getUserByUsername } from "../fictive_data/users";

const { Text } = Typography;

const AccountView = () => {
  const [isOwn, setIsOwn] = useState(false);

  const { username } = useParams();
  const user = getUserByUsername(username ?? "");

  useEffect(() => {
    const checkOwnership = () => {
      const currentUser = localStorage.getItem('currentUser');
      const currentUserJSON = currentUser ? JSON.parse(currentUser) : { id: null };
      setIsOwn(currentUserJSON.id === user?.user_id);
    };

    checkOwnership();

    window.addEventListener('storage', checkOwnership); 
    return () => window.removeEventListener('storage', checkOwnership);
  }, []);

  const [visibleCount, setVisibleCount] = useState(36);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 12, user?.gifts.length ?? 0));
  }, [user?.gifts.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < (user?.gifts.length ?? 0)) loadMore();
      },
      { threshold: 1.0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => { if (sentinelRef.current) observer.unobserve(sentinelRef.current); };
  }, [visibleCount, user?.gifts.length, loadMore]);
  if (!user) return <div className="text-white flex justify-center min-h-screen w-full items-center text-2xl">Пользователь не найден.</div>;
  return (
    <Layout className="min-h-screen">
      <Content className="gap-5 flex flex-col py-[var(--size-2xs] px-[var(--size-4xl)]">
        <Flex className="gap-5 flex justify-between items-start" vertical={false}>
          <Flex className="gap-5" vertical={false}>
            <Avatar
              size={140}
              src={`/images/${user.profile_pic_url}`}
              className="border border-gray-500 shrink-0"
            />

            <Flex className="flex flex-column" vertical>
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
                    <span className="text-xs text-gray-400 ml-1">(скрыто)</span>
                  )}
                </Link>
              )}

              <Text className="mt-3 leading-relaxed">
                {user.about_me}
              </Text>
            </Flex>
          </Flex>

          {isOwn ? <Flex className="gap-3 flex flex-row h-full !items-center" vertical={false}>
            <Tooltip title="History">
              <Button size="large" icon={<HistoryOutlined />} className="!bg-[var(--liquid-glass-bg)]"/>
            </Tooltip>
            <Button size="large" icon={<EditOutlined />} className="!bg-[var(--liquid-glass-bg)]">Edit</Button>
          </Flex> : <Flex/>}
        </Flex>

        <div className="overflow-x-auto overflow-y-hidden whitespace-nowrap w-full">
          <Segmented<string>
            options={['All', 'Bears', 'BlackBG', 'Golden', 'Other']}
            onChange={(value) => console.log(value)}
            size="large"
          />
        </div>

        <div className="mb-2">
          <CardList
            items={user.gifts}
            renderCard={(item) => (
              <div className="w-full"> 
                <ProfileGiftCard
                  cardImage={`/images/${item.presentImage || "placeholder.png"}`}
                  name={item.collectionName}
                  number={item.presentNumber}
                  onSale={item.onSale}
                  visible={item.visible}
                />
              </div>
            )}
          />
        </div>

        <FloatButton.BackTop icon={<UpOutlined/>} className="!bg-[var(--liquid-glass-bg)] !right-[var(--size-s)] !bottom-[var(--size-s)]" shape="square"/>
      </Content>
    </Layout>
  );
};

export default AccountView;