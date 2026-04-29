import EyeInvisibleOutlined from "@ant-design/icons/lib/icons/EyeInvisibleOutlined";
import { Card, Image } from "antd";

interface ProfileGiftCardProps {
  cardImage?: string;
  name?: string;
  number?: string | number;
  isOnSale?: boolean | number;
  isVisible?: boolean;
  isUpgraded?: boolean;
  onClick?: () => void;
}

const ProfileGiftCard = ({
  cardImage,
  name,
  number,
  isOnSale = false,
  isVisible = true,
  isUpgraded = false,
  onClick
}: ProfileGiftCardProps) => {
  const showOnSale = isOnSale === true || isOnSale === 1;

  return (
    <div className={`relative w-full h-full z-4 cursor-pointer`} onClick={onClick}>
      {!isVisible && (
        <div className="w-full h-full absolute z-50 flex items-center justify-center">
          <EyeInvisibleOutlined className="text-white text-3xl bg-[var(--black-100-semiopac)] p-[var(--size-sm)] rounded-full" />
        </div>
      )}

      <div className="flex max-w-[calc(100%-16px)] flex-row flex-wrap justify-end gap-1 sm:gap-[var(--size-s)] z-50 absolute top-[var(--size-xs)] right-[var(--size-xs)]">
        {showOnSale &&
          <div className="text-[11px] sm:text-[var(--size-base)] text-white backdrop-blur-[var(--size-2xs)] py-[var(--size-3xs)] px-[var(--size-xs)] font-[var(--font-semibold)] rounded-[var(--size-xs)] bg-[var(--green-accept)]">
            On Sale
          </div>
        }
        {number &&
          <div className="max-w-full truncate text-[11px] sm:text-[var(--size-base)] text-white backdrop-blur-[var(--size-2xs)] py-[var(--size-3xs)] px-[var(--size-xs)] font-[var(--font-semibold)] rounded-[var(--size-xs)] bg-[var(--accent-50)]">
            #{number?.toLocaleString('en-US') ?? '0'}
          </div>
        }
      </div>

      <Card
        hoverable
        styles={{
          cover: { padding: 0, margin: 0, background: "none", width: "100%", justifyContent: "center" },
          body: { display: "none", width: "100%" },
        }}
        className="rounded-[var(--size-smm)] sm:rounded-[18px] overflow-hidden aspect-square"
        cover={
          <Image
            src={cardImage}
            alt={name}
            draggable={false}
            preview={false}
            className={`w-full h-full object-cover ${!isUpgraded ? 'p-4' : ''}`}
          />
        }
      />
    </div>
  );
};

export default ProfileGiftCard;
