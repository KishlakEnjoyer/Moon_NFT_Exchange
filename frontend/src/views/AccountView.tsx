import {
  Flex,
  Layout,
  Row,
  Space,
  Typography,
  Avatar,
  Button,
  Tooltip,
  Col,
  Image,
  Card
} from "antd";
import { Content } from "antd/es/layout/layout";
import "../styles/AccountViewStyle.css";
import Title from "antd/es/typography/Title";
import { Link } from "react-router-dom";
import { EditOutlined, HistoryOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";


const { Text } = Typography;

const AccountView = () => {
  const presentInfo = {
    name: "Mighty Arm",
    modelName: 'Gold Arm',
    cardImage: "card.png",
    number: "#277",
    price: 70.2
  };

  const [visibleCount, setVisibleCount] = useState(36); 
    const items = Array.from({ length: 152 }); 
  
    const sentinelRef = useRef(null);
  
    const loadMore = () => {
      setVisibleCount((prev) => Math.min(prev + 12, items.length));
    };
  
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && visibleCount < items.length) {
            loadMore();
          }
        },
        { threshold: 1.0 }
      );
  
      if (sentinelRef.current) {
        observer.observe(sentinelRef.current);
      }
  
      return () => {
        if (sentinelRef.current) {
          observer.unobserve(sentinelRef.current);
        }
      };
    }, [visibleCount, items.length, loadMore]);

  const currentUser = {
    nickname: "KishlakEnjoyer",
    tg_username: "@jdm_enjoyerr",
    balance: 3.02,
    image_url: "ava.png",
    about_me:
      `TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia. invester.`,
  };
  const handleCardClick = () => {
    alert(`Collection name: ${presentInfo.name}\n
Present image: ${presentInfo.cardImage}\n
Present model name: ${presentInfo.modelName}\n
Present number: ${presentInfo.number}\n
Present price: ${presentInfo.price} TON`); 
  };


  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Content className="account-container">
        <Flex className="top-info" vertical={false}>
          <Flex style={{ gap: "20px" }} vertical={false}>
            <Avatar
              size={140}
              src={currentUser.image_url}
              style={{ border: "1px solid gray", flexShrink: 0 }}
            />
            <Flex className="user-info" vertical>
              <Title level={2} style={{ marginBottom: "0px" }}>
                {currentUser.nickname}
              </Title>
              <Link to={"https://t.me/jdm_enjoyerr"} style={{display: 'flex', gap: 'var(--size-2xs)'}}>
                <Image
              src="/icons/tg-icon-png.png"
              alt="TgIcon"
              style={{ width: "var(--size-lg)" }}
              preview={false}
            />{currentUser.tg_username}
              </Link>
              {/* about_me will be have 250 max lenght */}
              <Text
                style={{
                  marginTop: "10px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  lineHeight: "1.5",
                  transition: "max-height 0.3s ease",
                }}
              >
                {currentUser.about_me}
              </Text>
            </Flex>
          </Flex>

          <Flex className="icons-container" vertical={false}>
            <Tooltip title="History">
              <Button size="large" icon={<HistoryOutlined />} />
            </Tooltip>
            <Button size="large" icon={<EditOutlined />}>
              Edit
            </Button>
          </Flex>
        </Flex>
        <Flex className="albums-of-presents">
          <Button></Button>
        </Flex>
        <Space className="main-list" orientation="vertical" size={12}>
          <Row gutter={[12, 12]} justify="start">
            {items.slice(0, visibleCount).map((_, index) => (
              <Col
                key={index}
                xs={12}
                sm={8}
                md={6}
                lg={4}
                xl={3}
              >
                <Card
                hoverable
                styles={{
                  cover: {
                    padding: 0,
                  },
                }} 
                bodyStyle={{ display: 'none' }}
                cover={
                  <Image src={presentInfo.cardImage}
                  alt="Mighty Arm"
                  draggable={false}
                  preview={false}
                  onClick={handleCardClick}/>
                }/>
              </Col>
            ))}
          </Row>
        </Space>
      </Content>
    </Layout>
  );
};

export default AccountView;