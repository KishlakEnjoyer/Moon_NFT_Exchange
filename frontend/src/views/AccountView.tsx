import {
  Flex,
  Layout,
  Row,
  Space,
  Typography,
  Avatar,
  Button,
  Tooltip,
} from "antd";
import { Content } from "antd/es/layout/layout";
import "../styles/AccountViewStyle.css";
import Title from "antd/es/typography/Title";
import { Link } from "react-router-dom";
import { EditOutlined, HistoryOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import { useState } from "react";

const { Text } = Typography;

const AccountView = () => {
  const [showFullAbout, setShowFullAbout] = useState(false);

  const currentUser = {
    nickname: "KishlakEnjoyer",
    tg_username: "@jdm_enjoyerr",
    balance: 3.02,
    image_url: "ava.png",
    about_me:
      "TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.TG invester from Russia.",
  };

  // Проверяем, нужно ли показывать кнопку (текст длиннее 200 символов)
  const shouldShowToggle = currentUser.about_me.length > 200;

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
              <Link to={"https://t.me/jdm_enjoyerr"}>
                {currentUser.tg_username}
              </Link>
              <Text
                style={{
                  marginTop: "10px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: showFullAbout ? "unset" : 4,
                  WebkitBoxOrient: "vertical",
                  maxHeight: showFullAbout ? "none" : "80px",
                  lineHeight: "1.5",
                  transition: "max-height 0.3s ease",
                }}
              >
                {currentUser.about_me}
              </Text>
              {shouldShowToggle && (
                <Button
                  type="link"
                  onClick={() => setShowFullAbout(!showFullAbout)}
                  icon={showFullAbout ? <UpOutlined /> : <DownOutlined />}
                  style={{ 
                    padding: 0, 
                    height: 'auto',
                    marginTop: '5px',
                    color: '#1890ff'
                  }}
                >
                  {showFullAbout ? "Свернуть" : "Показать больше"}
                </Button>
              )}
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
        <Flex className="albums-of-presents"></Flex>
        <Space className="main-list" orientation="vertical" size={12}>
          {/* ... остальной контент */}
        </Space>
      </Content>
    </Layout>
  );
};

export default AccountView;