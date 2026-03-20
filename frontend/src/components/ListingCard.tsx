import { Button, Card, Space, Typography, Image } from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import TONIcon from "./icons/TONIcon";

interface ListingCardProps {
  collectionName?: string;
  presentImage?: string;
  presentNumber?: string | number;
  presentPrice?: number | string;
}

const { Text } = Typography;

const ListingCard = ({ collectionName, presentImage, presentNumber, presentPrice }: ListingCardProps) => {
  const handleCardClick = () => {
    alert(`Collection name: ${collectionName}\n
           Present image: ${presentImage}\n
           Present number: ${presentNumber}\n
           Present price: ${presentPrice} TON`); 
  };

  return (
    <Card
      className="rounded-[var(--size-sm)] flex flex-col p-[var(--size-2xs)] w-full overflow-hidden z-[4] bg-[var(--liquid-glass-bg)] backdrop-blur-[var(--liquid-glass-blur)] shadow-[0px_5px_5px_-5px_rgba(34,60,80,0.6)] border-[1.5px] border-solid border-[var(--black-transparent)]"      hoverable
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
          className="w-full h-full rounded-2xl object-cover object-center"
          alt={collectionName || 'Unknown Collection'}
          draggable={false}
          src={`/images/${presentImage || "placeholder.png"}`}
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
          {collectionName || 'Unknown Collection'}
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: 'var(--size-sm)', 
            fontWeight: 'var(--font-light)', 
          }}
        >
          {presentNumber ? `#${presentNumber}` : 'No. not specified'}
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
          {presentPrice ? `${presentPrice}` : 'Price not specified'}
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