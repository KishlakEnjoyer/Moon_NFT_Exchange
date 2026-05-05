import { Button, Card, Space, Typography, Image } from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import TONIcon from "./icons/TONIcon";
import { ApiListing, formatTonPrice, getPresentImageUrl } from "../services/listingService";
import { useTranslation } from "react-i18next";

interface ListingCardProps {
  item: ApiListing;
  onPresentClick?: (item: ApiListing) => void;
  onAddToCart?: (listingId: number) => void;
  onBuy?: (listingId: number) => void;
  isInCart?: boolean;
  isOwnListing?: boolean;
  buying?: boolean;
}

const { Text } = Typography;

const ListingCard = ({ item, onPresentClick, onAddToCart, onBuy, isInCart, isOwnListing, buying }: ListingCardProps) => {
  const { t } = useTranslation();
  const price = formatTonPrice(item.price, true);
  const fullPrice = formatTonPrice(item.price);
  const title = `${item.collection_name || t("marketplace.unknownCollection")} # ${item.present_num}`;

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
        <div className="aspect-square w-full overflow-hidden rounded-[var(--size-smm)]">
          <Image
            rootClassName="!block !w-full !h-full"
            className="!w-full !h-full object-cover object-center"
            alt={item.collection_name || t("marketplace.unknownCollection")}
            draggable={false}
            src={getPresentImageUrl(item.present_image_url)}
            preview={false}
            onClick={() => onPresentClick?.(item)}
          />
        </div>
      }
    >
      <Space orientation="vertical" size={1} className="w-full min-w-0">
        <Text
          strong
          ellipsis={{ tooltip: title }}
          className="block w-full cursor-pointer"
          style={{
            fontSize: 'var(--size-base)',
            fontWeight: 'var(--font-semibold)',
          }}
          onClick={() => onPresentClick?.(item)}
        >
          {title}
        </Text>
        {item.model_name && (
          <Text
            type="secondary"
            ellipsis={{ tooltip: item.model_name }}
            className="block w-full"
            style={{
              fontSize: 'var(--size-sm)',
              fontWeight: 'var(--font-light)',
            }}
          >
            {item.model_name}
          </Text>
        )}
      </Space>

      <div
        className="grid w-full items-center gap-[var(--size-xs)] mt-[var(--size-sm)]"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 44px" }}
      >
        <Button
          type="primary"
          icon={<TONIcon/>}
          size="large"
          className="rounded-[var(--size-smm)] min-w-0 !px-2 sm:!px-[15px]"
          title={`${fullPrice} TON`}
          loading={buying}
          disabled={isOwnListing}
          onClick={() => onBuy?.(item.listing_id)}
        >
          <span
            className="block min-w-0 truncate font-normal leading-none"
            style={{ fontSize: "clamp(14px, 3.9vw, 18px)" }}
          >
            {price}
          </span>
        </Button>

        <Button
          type="default"
          icon={<ShoppingCartOutlined />}
          size="large"
          className={`icon-antd aspect-square rounded-[var(--size-smm)] !bg-[var(--liquid-glass-bg)] ${isInCart ? '!border-[var(--color-primary)]' : ''}`}
          onClick={() => onAddToCart?.(item.listing_id)}
          disabled={isInCart || isOwnListing}
        />
      </div>
    </Card>
  );
};

export default ListingCard;
