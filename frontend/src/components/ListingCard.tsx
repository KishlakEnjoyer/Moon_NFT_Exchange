import { Button, Card, Space, Typography, Image } from "antd";
import cardImage from "./card.png";
import { ShoppingCartOutlined } from "@ant-design/icons";
import TONIcon from "./icons/TONIcon";

const { Text } = Typography;

const ListingCard = () => {
  return (
    <Card
      className="listing-card"
      hoverable
      styles={{
        body: {
          padding: '0', 
          width: '100%',
          paddingTop: 'var(--size-sm)',
        },
        cover: {
          padding: 0,
        },
      }}
      cover={
        <Image
          className="card-image"
          alt="Mighty Arm"
          draggable={false}
          src={cardImage}
        />
      }
    >
      <Space orientation="vertical" size={1}>
        <Text
          strong
          style={{
            fontSize: 'var(--size-base)', 
            fontWeight: 'var(--font-semibold)', 
          }}
        >
          Mighty Arm
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: 'var(--size-sm)', 
            fontWeight: 'var(--font-light)', 
          }}
        >
          #277
        </Text>
      </Space>

      <div
        style={{
          display: 'flex',
          gap: 'var(--size-xs)', 
          marginTop: 'var(--size-sm)', 
        }}
      >
        <Button
          type="primary"
          icon={<TONIcon/>}
          size="large"
          block>
          70.2
        </Button>

        <Button
          type="default"
          icon={<ShoppingCartOutlined />}
          style={{ aspectRatio: '1 / 1' }}
          size="large"
        />
      </div>
    </Card>
  );
};

export default ListingCard;