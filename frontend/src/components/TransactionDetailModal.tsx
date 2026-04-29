import { Avatar, Descriptions, Flex, Modal, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { Transaction, getProfileAvatarUrl } from "../services/transactionService";

const { Text, Title } = Typography;

export type TransactionViewKind = "purchase" | "sale" | "received" | "upgrade" | "burn";

interface TransactionDetailModalProps {
  open: boolean;
  transaction: Transaction | null;
  currentUserId: number;
  onClose: () => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "failed":
    case "cancelled":
      return "error";
    default:
      return "default";
  }
};

const getTransactionViewKind = (tx: Transaction, currentUserId: number): TransactionViewKind => {
  const type = tx.transaction_type.toLowerCase();

  if (type === "purchase") {
    if (tx.seller_id === currentUserId) {
      return "purchase";
    }

    return "received";
  }

  if (type === "marketplace") {
    return tx.buyer_id === currentUserId ? "purchase" : "sale";
  }

  if (type === "upgrade") {
    return "upgrade";
  }

  if (type === "burn") {
    return "burn";
  }

  return tx.buyer_id === currentUserId ? "purchase" : "sale";
};

const getViewTag = (kind: TransactionViewKind) => {
  switch (kind) {
    case "purchase":
      return <Tag color="blue">Purchase</Tag>;
    case "sale":
      return <Tag color="green">Sale</Tag>;
    case "received":
      return <Tag color="purple">Received</Tag>;
    case "upgrade":
      return <Tag color="gold">Upgrade</Tag>;
    case "burn":
      return <Tag color="volcano">Burn</Tag>;
    default:
      return <Tag>Transaction</Tag>;
  }
};

const formatTypeLabel = (type: string) => {
  switch (type.toLowerCase()) {
    case "purchase":
      return "Collection purchase";
    case "marketplace":
      return "Marketplace trade";
    case "upgrade":
      return "Gift upgrade";
    case "burn":
      return "Burn";
    default:
      return type;
  }
};

const formatAmount = (amount: string) => `${parseFloat(amount).toFixed(2)} TON`;

const renderUserValue = (
  username: string | null,
  profilePicUrl: string | null,
  fallbackId: number,
  navigate: ReturnType<typeof useNavigate>,
  onClose: () => void,
) => {
  const label = username || `User #${fallbackId}`;

  if (!username) {
    return <Text>{label}</Text>;
  }

  return (
    <Flex
      align="center"
      gap={8}
      className="cursor-pointer hover:opacity-75 transition-opacity"
      onClick={() => {
        onClose();
        navigate(`/account/${username}`);
      }}
    >
      <Avatar size={24} src={getProfileAvatarUrl(profilePicUrl)} />
      <Text>{label}</Text>
    </Flex>
  );
};

const TransactionDetailModal = ({
  open,
  transaction,
  currentUserId,
  onClose,
}: TransactionDetailModalProps) => {
  const navigate = useNavigate();

  if (!transaction) {
    return null;
  }

  const kind = getTransactionViewKind(transaction, currentUserId);
  const isCollectionPurchase = transaction.transaction_type.toLowerCase() === "purchase";

  const participantItems = isCollectionPurchase
    ? [
        {
          key: "purchased_by",
          label: "Purchased By",
          children: renderUserValue(
            transaction.seller_username,
            transaction.seller_profile_pic_url,
            transaction.seller_id,
            navigate,
            onClose,
          ),
        },
        {
          key: "received_by",
          label: "Received By",
          children: renderUserValue(
            transaction.buyer_username,
            transaction.buyer_profile_pic_url,
            transaction.buyer_id,
            navigate,
            onClose,
          ),
        },
      ]
    : [
        {
          key: "buyer",
          label: "Buyer",
          children: renderUserValue(
            transaction.buyer_username,
            transaction.buyer_profile_pic_url,
            transaction.buyer_id,
            navigate,
            onClose,
          ),
        },
        {
          key: "seller",
          label: "Seller",
          children: renderUserValue(
            transaction.seller_username,
            transaction.seller_profile_pic_url,
            transaction.seller_id,
            navigate,
            onClose,
          ),
        },
      ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(640px, calc(100vw - 24px))"
      zIndex={1100}
      title={<Title level={4} className="!mb-0">Transaction Details</Title>}
    >
      <Flex vertical gap={16} className="mt-4">
        <Flex justify="space-between" align="center" gap={12} wrap="wrap">
          <Text type="secondary">Transaction #{transaction.transaction_id}</Text>
          <Flex gap={8} wrap="wrap">
            {getViewTag(kind)}
            <Tag color={getStatusColor(transaction.transaction_status)}>
              {transaction.transaction_status}
            </Tag>
          </Flex>
        </Flex>

        <Descriptions
          bordered
          size="small"
          column={1}
          items={[
            {
              key: "type",
              label: "Source Type",
              children: formatTypeLabel(transaction.transaction_type),
            },
            {
              key: "collection",
              label: "Collection",
              children: transaction.collection_name,
            },
            {
              key: "present",
              label: "Present",
              children: `#${transaction.present_id}`,
            },
            ...participantItems,
            {
              key: "price",
              label: "Price",
              children: formatAmount(transaction.transaction_price),
            },
            {
              key: "platform_fee",
              label: "Platform Fee",
              children: formatAmount(transaction.platform_fee),
            },
            {
              key: "seller_received",
              label: "Seller Received",
              children: formatAmount(transaction.seller_received),
            },
            {
              key: "tx_hash",
              label: "Blockchain Tx Hash",
              children: transaction.blockchain_tx_hash ? (
                <Text code copyable className="break-all">
                  {transaction.blockchain_tx_hash}
                </Text>
              ) : (
                "Not available"
              ),
            },
            {
              key: "date",
              label: "Date",
              children: new Date(transaction.transaction_date).toLocaleString(),
            },
          ]}
        />
      </Flex>
    </Modal>
  );
};

export default TransactionDetailModal;
