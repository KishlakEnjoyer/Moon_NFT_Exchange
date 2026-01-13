import { Button, Card, Space, Typography } from "antd";
import cardImage from "./card.png";
import { ShoppingCartOutlined } from "@ant-design/icons";
import TONIcon from "./icons/TONIcon";

const { Text } = Typography;

const ListingCard = () => {
  return (
    <Card
      className="listing-card"
      hoverable
      styles={{
        body: {
          padding: 'var(--size-sm)', 
          width: '100%'
        },
        cover: {
          padding: 0,
        },
      }}
      cover={
        <img
          alt="Mighty Arm"
          draggable={false}
          src={cardImage}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
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
        >
          Mighty Arm
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: 'var(--size-sm)', 
            fontWeight: 'var(--font-light)', 
          }}
        >
          #277
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
          size="small"
          block
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--size-xs)', 
            fontSize: 'var(--size-sm)', 
            height: 'var(--size-lg)', 
            backgroundColor: 'var(--blue-main)', 
            borderRadius: 'var(--size-xs)', 
            fontWeight: 'var(--font-medium)', 
          }}
        >
          
          70.2
        </Button>

        <Button
          type="default"
          icon={<ShoppingCartOutlined />}
          size="small"
          style={{
            height: 'var(--size-lg)', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 var(--size-xs)', 
            borderColor: 'var(--black-60)', 
            borderRadius: 'var(--size-xs)', 
            fontSize: 'var(--size-sm)', 
          }}
        />
      </div>
    </Card>
  );
};

export default ListingCard;