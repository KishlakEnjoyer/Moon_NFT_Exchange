import { Button, Card, Space, Typography, Image } from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import TONIcon from "./icons/TONIcon";
import "../styles/ListCardStyle.css";

interface ListingCardProps {
  giftName?: string;
  giftImage?: string;
  giftNumber?: string | number;
  giftPrice?: number | string;
}

const { Text } = Typography;

const ListingCard = ({ giftName, giftImage, giftNumber, giftPrice }: ListingCardProps) => {
  const handleCardClick = () => {
    alert(`Collection name: ${giftName}\n
Present image: ${giftImage}\n
Present number: ${giftNumber}\n
Present price: ${giftPrice} TON`); 
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
          src={giftImage}
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
          {giftName}
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: 'var(--size-sm)', 
            fontWeight: 'var(--font-light)', 
          }}
        >
          {giftNumber ? `#${giftNumber}` : 'No. not specified'}
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
          {giftPrice}
        </Button>

        <Button
          type="default"
          icon={<ShoppingCartOutlined />}
          style={{ aspectRatio: '1 / 1' }}
          size="large"
          className='icon-antd'
        />
      </div>
    </Card>
  );
};

export default ListingCard;