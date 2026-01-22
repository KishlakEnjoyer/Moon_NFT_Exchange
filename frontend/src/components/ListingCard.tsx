import { Button, Card, Space, Typography, Image } from "antd";
import cardPng from "./card.png";
import { ShoppingCartOutlined } from "@ant-design/icons";
import TONIcon from "./icons/TONIcon";
import "../styles/ListCardStyle.css";


const { Text } = Typography;

const ListingCard = () => {
  const presentInfo = {
    name: "Mighty Arm",
    cardImage: cardPng,
    number: "#277",
    price: 70.2
  };

  const handleCardClick = () => {
    alert(`Collection name: ${presentInfo.name}\n
Present image: ${presentInfo.cardImage}\n
Present number: ${presentInfo.number}\n
Present price: ${presentInfo.price} TON`); 
  };

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
          src={presentInfo.cardImage}
          preview={false}
          onClick={handleCardClick}
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
          onClick={handleCardClick}
        >
          {presentInfo.name}
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: 'var(--size-sm)', 
            fontWeight: 'var(--font-light)', 
          }}
        >
          {presentInfo.number}
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
          {presentInfo.price}
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