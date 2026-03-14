import EyeInvisibleOutlined from "@ant-design/icons/lib/icons/EyeInvisibleOutlined";
import { Card, Image } from "antd";


interface ProfileGiftCardProps {
  cardImage?: string;
  name?: string;
  number?: string | number;
  onSale?: boolean;
}

const ProfileGiftCard = ({
  cardImage,
  name,
  number,
  onSale = true
}: ProfileGiftCardProps) => {

  return (
    <div className="card-container" style={{position: "relative"}}>
      {onSale && <div className="black-tone" style={{
          width: "100%", 
          height: "100%", 
          position: "absolute", 
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}

        >
        <EyeInvisibleOutlined style={{
          fontSize: "var(--size-xl)",
          background: "var(--black-100-semiopac)",
          padding: "var(--size-sm)",
          borderRadius: "50%",
          backdropFilter: "blur(var(--size-2xs))"
        }} />
      </div>}

      {number && 
        <div style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1001,
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(4px)",
          borderRadius: 6,
          padding: "var(--size-3xs) var(--size-xs)",
          fontSize: 11,
          fontWeight: "var(--font-semibold)",
          color: "#fff",
        }}>
          #{number}
        </div>
      }

      <Card
        hoverable
        styles={{
          cover: { padding: 0, background: "none" },
          body: { display: "none" },
        }}
        style={{ borderRadius: 18, overflow: "hidden" }}
        cover={
          <Image
            src={cardImage}
            alt={name}
            draggable={false}
            preview={false}
          />
        }
      />
    </div>
  );
};

export default ProfileGiftCard;