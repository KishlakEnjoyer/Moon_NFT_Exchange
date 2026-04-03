import EyeInvisibleOutlined from "@ant-design/icons/lib/icons/EyeInvisibleOutlined";
import { Card, Image } from "antd";

interface ProfileGiftCardProps {
  cardImage?: string;
  name?: string;
  number?: string | number;
  isOnSale?: boolean;
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

  return (
    <div className={`relative w-full h-full z-4 cursor-pointer`} onClick={onClick}>
      {!isVisible && (
        <div className="w-full h-full absolute z-50 flex items-center justify-center">
          <EyeInvisibleOutlined className="text-white text-3xl bg-[var(--black-100-semiopac)] p-[var(--size-sm)] rounded-full" />
        </div>
      )}

      <div className="flex flex-row gap-[var(--size-s)] z-50 absolute top-[var(--size-xs)] right-[var(--size-xs)]">
        {isOnSale && 
          <div className="text-white backdrop-blur-[var(--size-2xs)] py-[var(--size-3xs)] px-[var(--size-xs)] font-[var(--font-semibold)] rounded-[var(--size-xs)] bg-[var(--green-accept)]">
            On Sale
          </div>
        }
        {number && 
          <div className="text-white backdrop-blur-[var(--size-2xs)] py-[var(--size-3xs)] px-[var(--size-xs)] font-[var(--font-semibold)] rounded-[var(--size-xs)] bg-[var(--accent-50)]">
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
        className="rounded-[18px] overflow-hidden aspect-square"
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
