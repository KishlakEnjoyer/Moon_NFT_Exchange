import {
  Flex, Layout, Typography, Avatar, Button,
  Tooltip, Image,
  FloatButton,
  Segmented,
} from "antd";
import { Content } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";
import { Link } from "react-router-dom";
import { EditOutlined, HistoryOutlined, UpOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState, useCallback } from "react";
import ProfileGiftCard from "../components/ProfileGiftCard";
import CardList from "../components/CardList";

const { Text } = Typography;

const AccountView = () => {
  const currentUser = {
    nickname: "KishlakEnjoyer",
    tg_username: "@jdm_enjoyerr",
    image_url: "ava.png",
    about_me: "TG invester from Russia.",
  };

  const presents = [
    { collectionName: "Cap", presentImage: "cap.png", presentNumber: 1, onSale: false, visible: false },
    { collectionName: "Plush Pepe", presentImage: "pepe2.png", presentNumber: 2, onSale: true, visible: true },
    { collectionName: "Plush Pepe", presentImage: "pepe.png", presentNumber: 120000, onSale: true, visible: true },
 
  ];

  const [visibleCount, setVisibleCount] = useState(36);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 12, presents.length));
  }, [presents.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < presents.length) loadMore();
      },
      { threshold: 1.0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => { if (sentinelRef.current) observer.unobserve(sentinelRef.current); };
  }, [visibleCount, presents.length, loadMore]);

  return (
    <Layout className="min-h-screen">
      <Content className="gap-5 flex flex-col py-[var(--size-2xs] px-[var(--size-4xl)]">
        <Flex className="gap-5 flex justify-between items-start" vertical={false}>
          <Flex className="gap-5" vertical={false}>
            <Avatar
              size={140}
              src={`/images/${currentUser.image_url}`}
              className="border border-gray-500 shrink-0"
            />

            <Flex className="flex flex-column" vertical>
              <Title level={2} className="!mb-0">
                {currentUser.nickname}
              </Title>

              <Link to="https://t.me/jdm_enjoyerr" className="flex items-center gap-1">
                <Image
                  src="/icons/tg-icon-png.png"
                  alt="TgIcon"
                  style={{ width: "var(--size-lg)" }}
                  preview={false}
                />
                {currentUser.tg_username}
              </Link>

              <Text className="mt-3 leading-relaxed">
                {currentUser.about_me}
              </Text>
            </Flex>
          </Flex>

          <Flex className="gap-3 flex flex-row h-full !items-center" vertical={false}>
            <Tooltip title="History">
              <Button size="large" icon={<HistoryOutlined />} className="!bg-[var(--liquid-glass-bg)]"/>
            </Tooltip>
            <Button size="large" icon={<EditOutlined />} className="!bg-[var(--liquid-glass-bg)]">Edit</Button>
          </Flex>
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
            items={presents}
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