import {
  Flex, Layout, Typography, Avatar, Button,
  Tooltip, Image, Row, Col, Space,
  FloatButton,
} from "antd";
import { Content } from "antd/es/layout/layout";
import "../styles/AccountViewStyle.css";
import Title from "antd/es/typography/Title";
import { Link } from "react-router-dom";
import { EditOutlined, HistoryOutlined, UpOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState, useCallback } from "react";
import ProfileGiftCard from "../components/ProfileGiftCard";

const { Text } = Typography;

const AccountView = () => {
  const currentUser = {
    nickname: "KishlakEnjoyer",
    tg_username: "@jdm_enjoyerr",
    image_url: "ava.png",
    about_me: "TG invester from Russia.",
  };

  const presentInfo = { name: "Mighty Arm", cardImage: "card.png", number: 277 };

  const items = Array.from({ length: 152 });
  const [visibleCount, setVisibleCount] = useState(36);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 12, items.length));
  }, [items.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < items.length) loadMore();
      },
      { threshold: 1.0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => { if (sentinelRef.current) observer.unobserve(sentinelRef.current); };
  }, [visibleCount, items.length, loadMore]);

  return (
    <Layout style={{ minHeight: "var(--size-height)" }}>
      <Content className="account-container">
        <Flex className="top-info" vertical={false}>
          <Flex style={{ gap: "var(--size-lg)" }} vertical={false}>
            <Avatar size={140} src={currentUser.image_url}
              style={{ border: "1px solid gray", flexShrink: 0 }} />
            <Flex className="user-info" vertical>
              <Title level={2} style={{ marginBottom: "0px" }}>
                {currentUser.nickname}
              </Title>
              <Link to="https://t.me/jdm_enjoyerr"
                style={{ display: "flex", gap: "var(--size-2xs)" }}>
                <Image src="/icons/tg-icon-png.png" alt="TgIcon"
                  style={{ width: "var(--size-lg)" }} preview={false} />
                {currentUser.tg_username}
              </Link>
              <Text style={{ marginTop: "var(--size-sm)", lineHeight: "1.5" }}>
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

        <Flex className="albums-of-presents">
          <Button>ALL</Button>
        </Flex>

        <Space className="main-list" orientation="vertical" size={12}>
          <Row gutter={[12, 12]} justify="start">
            {items.slice(0, visibleCount).map((_, index) => (
              <Col key={index} xs={12} sm={8} md={6} lg={4} xl={3}>
                <ProfileGiftCard
                  cardImage={presentInfo.cardImage}
                  name={presentInfo.name}
                  number={presentInfo.number}
                />
              </Col>
            ))}
          </Row>

          {visibleCount < items.length && (
            <div ref={sentinelRef} style={{ height: "var(--size-lg)", width: "100%" }} />
          )}
        </Space>
        <FloatButton.BackTop icon={<UpOutlined/>} style={{ right: 'var(--size-s)', bottom: 'var(--size-s)' }} shape="square"/>
      </Content>
    </Layout>
  );
};

export default AccountView;