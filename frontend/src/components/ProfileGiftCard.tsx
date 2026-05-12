import EyeInvisibleOutlined from "@ant-design/icons/lib/icons/EyeInvisibleOutlined";
import PushpinFilled from "@ant-design/icons/lib/icons/PushpinFilled";
import { Card, Image } from "antd";
import { useTranslation } from "react-i18next";

interface ProfileGiftCardProps {
  cardImage?: string;
  name?: string;
  number?: string | number;
  isOnSale?: boolean | number;
  activeListingPrice?: string | number | null;
  isVisible?: boolean;
  isUpgraded?: boolean;
  isPinned?: boolean | number;
  onClick?: () => void;
}

const ProfileGiftCard = ({
  cardImage,
  name,
  number,
  isOnSale = false,
  activeListingPrice = null,
  isVisible = true,
  isUpgraded = false,
  isPinned = false,
  onClick,
}: ProfileGiftCardProps) => {
  const { t } = useTranslation();

  const showPinned = isPinned === true || isPinned === 1;
  const showOnSale = isOnSale === true || isOnSale === 1;

  const parsedListingPrice = Number(activeListingPrice);
  const hasListingPrice =
    activeListingPrice !== null &&
    activeListingPrice !== undefined &&
    activeListingPrice !== "";

  const listingPriceLabel =
    hasListingPrice && Number.isFinite(parsedListingPrice)
      ? `${parsedListingPrice.toFixed(2)} TON`
      : null;

  return (
    <div className="relative w-full h-full z-4 cursor-pointer" onClick={onClick}>
      {!isVisible && (
        <div className="w-full h-full absolute z-50 flex items-center justify-center">
          <EyeInvisibleOutlined className="text-white text-3xl bg-[var(--black-100-semiopac)] p-[var(--size-sm)] rounded-full" />
        </div>
      )}

      {showPinned && (
        <div
          className="absolute left-[var(--size-xs)] top-[var(--size-xs)] z-[60] flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-100)] text-black shadow-[0_0_14px_rgba(250,204,21,0.9)] ring-2 ring-black/30"
        >
          <PushpinFilled className="text-[15px] text-white" />
        </div>
      )}

      <div className="flex max-w-[calc(100%-16px)] flex-row flex-wrap justify-end gap-1 sm:gap-[var(--size-s)] z-50 absolute top-[var(--size-xs)] right-[var(--size-xs)]">
        {showOnSale && listingPriceLabel && (
          <div className="max-w-full truncate text-[11px] sm:text-[var(--size-base)] text-white backdrop-blur-[var(--size-2xs)] py-[var(--size-3xs)] px-[var(--size-xs)] font-[var(--font-semibold)] rounded-[var(--size-xs)] bg-[var(--green-accept)]">
            {listingPriceLabel}
          </div>
        )}

        {showOnSale && !listingPriceLabel && (
          <div className="text-[11px] sm:text-[var(--size-base)] text-white backdrop-blur-[var(--size-2xs)] py-[var(--size-3xs)] px-[var(--size-xs)] font-[var(--font-semibold)] rounded-[var(--size-xs)] bg-[var(--green-accept)]">
            {t("profileCard.onSale")}
          </div>
        )}

        {number && (
          <div className="max-w-full truncate text-[11px] sm:text-[var(--size-base)] text-white backdrop-blur-[var(--size-2xs)] py-[var(--size-3xs)] px-[var(--size-xs)] font-[var(--font-semibold)] rounded-[var(--size-xs)] bg-[var(--accent-50)]">
            #{number?.toLocaleString("en-US") ?? "0"}
          </div>
        )}
      </div>

      <Card
        hoverable
        styles={{
          cover: {
            padding: 0,
            margin: 0,
            background: "none",
            width: "100%",
            justifyContent: "center",
          },
          body: {
            display: "none",
            width: "100%",
          },
        }}
        className={`rounded-[var(--size-smm)] sm:rounded-[18px] overflow-hidden aspect-square ${
          showPinned
            ? "ring-2 ring-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.45)]"
            : ""
        }`}
        cover={
          <Image
            src={cardImage}
            alt={name}
            draggable={false}
            preview={false}
            className={`w-full h-full object-cover ${!isUpgraded ? "p-4" : ""}`}
          />
        }
      />
    </div>
  );
};

export default ProfileGiftCard;