import { Button, Card, Space, Typography } from "antd";
import cardImage from "./card.png";
import { ShoppingCartOutlined } from "@ant-design/icons";

const { Text } = Typography;

const ListingCard = () => {
  return (
    <Card
      className="listing-card"
      hoverable
      cover={
        <img
          alt="Mighty Arm"
          draggable={false}
          src={cardImage}
          style={{
            width: "100%",
            objectFit: "cover", 
            objectPosition: "center",
          }}
        />
      }
    >
      <Space orientation="vertical" size={0}>
        <Text strong>Mighty Arm</Text>
        <Text type="secondary" style={{fontSize: 'var(--size-sm)'}}>#277</Text>

        <Space orientation="horizontal">
          <Button type="primary" icon={<ShoppingCartOutlined />} block>
            <img src="/icons/ton-icon.png" alt="TON" style={{ width: 16, height: 16 }} />
            70.2
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default ListingCard;