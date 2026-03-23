import { Modal, Button, Flex, Divider, Typography, Empty } from "antd";
import { useState } from "react";
import TONIcon from "./icons/TONIcon";
import { ListingFull } from "../fictive_data/listings";
import CartItem from "./CartItem";
import ModalPresentDetail from "./ModalPresentDetail";


const { Text, Title } = Typography;

interface ModalCartProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  items: ListingFull[];
}

const ModalCart: React.FC<ModalCartProps> = ({ open, onClose, onOpen, items: initialItems }) => {
  const [items, setItems] = useState<ListingFull[]>(initialItems);
  const [selectedPresent, setSelectedPresent] = useState<ListingFull | null>(null);

  const handleRemove = (listing_id: number) => {
    setItems((prev) => prev.filter((item) => item.listing_id !== listing_id));
  };

  const handlePresentClick = (item: ListingFull) => {
    onClose();                 
    setSelectedPresent(item);  
  };

  const handlePresentClose = () => {
    setSelectedPresent(null);   
    onOpen();
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        title={<Title level={4} className="!mb-0">Cart</Title>}
        width={780}
      >
        <Flex vertical gap={12} className="mt-4 max-h-[65vh]">
          <Flex vertical gap={12} className="mt-4 max-h-[50vh] overflow-y-auto">
            {items.length === 0 ? (
              <Empty description="Cart is empty" className="py-8" />
            ) : (
              items.map((item) => (
                <CartItem
                  key={item.listing_id}
                  item={item}
                  onRemove={handleRemove}
                  onPresentClick={handlePresentClick}
                  onClose={onClose}
                />
              ))
            )}
          </Flex>

          {items.length > 0 && (
            <>
              <Divider className="!my-2" />
              <Flex justify="space-between" align="center">
                <Text type="secondary">Total:</Text>
                <Flex align="center" gap={6}>
                  <Title level={4} className="!mb-0">{total.toFixed(2)}</Title>
                  <TONIcon />
                </Flex>
              </Flex>
              <Button type="primary" size="large" block>
                Buy
              </Button>
            </>
          )}
        </Flex>
      </Modal>

      <ModalPresentDetail
        open={!!selectedPresent}
        item={selectedPresent}
        onClose={handlePresentClose}
      />
    </>
  );
};

export default ModalCart;