import { Button, Card, Space, Typography, Image } from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import TONIcon from "./icons/TONIcon";
import { ApiListing, getPresentImageUrl } from "../services/listingService";

interface ListingCardProps {
  item: ApiListing;
  onPresentClick?: (item: ApiListing) => void;
  onAddToCart?: (listingId: number) => void;
  isInCart?: boolean;
}

const { Text } = Typography;

const ListingCard = ({ item, onPresentClick, onAddToCart, isInCart }: ListingCardProps) => {
  const price = parseFloat(item.price).toFixed(2);

  return (
    <Card
      className="rounded-[var(--size-smm)] flex flex-col p-[var(--size-2xs)] w-full overflow-hidden z-[4] bg-[var(--liquid-glass-bg)] backdrop-blur-[var(--liquid-glass-blur)] shadow-[0px_5px_5px_-5px_rgba(34,60,80,0.6)] border-[1.5px] border-solid border-[var(--black-transparent)]"      
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
          className="w-full h-full rounded-[var(--size-smm)] object-cover object-center"
          alt={item.collection_name || 'Unknown Collection'}
          draggable={false}
          src={getPresentImageUrl(item.present_image_url)}
          preview={false}
          onClick={() => onPresentClick?.(item)}
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
          onClick={() => onPresentClick?.(item)}
        >
          {item.collection_name || 'Unknown Collection'}
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: 'var(--size-sm)', 
            fontWeight: 'var(--font-light)', 
          }}
        >
          #{item.present_id}
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
          className="rounded-[var(--size-smm)]"
          block>
          {price}
        </Button>

        <Button
          type="default"
          icon={<ShoppingCartOutlined />}
          size="large"
          className={`icon-antd aspect-square rounded-[var(--size-smm)] !bg-[var(--liquid-glass-bg)] ${isInCart ? '!border-[var(--color-primary)]' : ''}`}
          onClick={() => onAddToCart?.(item.listing_id)}
          disabled={isInCart}
        />
      </div>
    </Card>
  );
};

export default ListingCard;
