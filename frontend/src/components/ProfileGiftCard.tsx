import EyeInvisibleOutlined from "@ant-design/icons/lib/icons/EyeInvisibleOutlined";
import { Card, Image } from "antd";
import "../styles/ProfileCardStyle.css";


interface ProfileGiftCardProps {
  cardImage?: string;
  name?: string;
  number?: string | number;
  onSale?: boolean;
  visible?: boolean;
}

const ProfileGiftCard = ({
  cardImage,
  name,
  number,
  onSale = true,
  visible = true
}: ProfileGiftCardProps) => {

  return (
    <div className="card-container">
      {!visible && <div className="black-tone">
        <EyeInvisibleOutlined className="eyeIcon" />
      </div>}

      <div className="gift-properties">
        {onSale && 
          <div className="propbadge sale-badge">
            On Sale
          </div>
        }
        {number && 
          <div className="propbadge number-badge">
            #{number}
          </div>
        }
      </div>

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