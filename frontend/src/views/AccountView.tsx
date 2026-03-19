import {
  Flex, Layout, Typography, Avatar, Button,
  Tooltip, Image,
  FloatButton,
  Segmented,
} from "antd";
import { Content } from "antd/es/layout/layout";
import "../styles/AccountViewStyle.css";
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
    { collectionName: "Cap", presentImage: "cap.png", presentNumber: 1 },
    { collectionName: "Plush Pepe", presentImage: "pepe2.png", presentNumber: 2 },
    { collectionName: "Plush Pepe", presentImage: "pepe.png", presentNumber: 3 },
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
      <Content className="account-container">

        <Flex className="top-info" vertical={false}>
          <Flex className="gap-5" vertical={false}>

            <Avatar
              size={140}
              src={`/images/${currentUser.image_url}`}
              className="border border-gray-500 shrink-0"
            />

            <Flex className="user-info" vertical>
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

          <Flex className="icons-container" vertical={false}>
            <Tooltip title="History">
              <Button size="large" icon={<HistoryOutlined />} />
            </Tooltip>
            <Button size="large" icon={<EditOutlined />}>Edit</Button>
          </Flex>
        </Flex>

        <div className="overflow-x-auto overflow-y-hidden whitespace-nowrap w-full">
          <Segmented<string>
            options={['All', 'Bears', 'BlackBG', 'Golden', 'Other']}
            onChange={(value) => console.log(value)}
            size="large"
          />
        </div>

        <CardList
          items={presents}
          renderCard={(item) => (
            <ProfileGiftCard
              cardImage={`/images/${item.presentImage || "placeholder.png"}`}
              name={item.collectionName}
              number={item.presentNumber}
            />
          )}
        />

        <FloatButton.BackTop
          icon={<UpOutlined />}
          style={{ right: 'var(--size-s)', bottom: 'var(--size-s)' }}
          shape="square"
        />
      </Content>
    </Layout>
  );
};

export default AccountView;