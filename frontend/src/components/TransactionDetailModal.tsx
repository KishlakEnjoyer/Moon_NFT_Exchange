import { Avatar, Descriptions, Flex, Modal, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { Transaction, getProfileAvatarUrl } from "../services/transactionService";
import { useTranslation } from "react-i18next";

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

const getViewTag = (kind: TransactionViewKind, t: (key: string) => string) => {
  switch (kind) {
    case "purchase":
      return <Tag color="blue">{t("transactions.purchase")}</Tag>;
    case "sale":
      return <Tag color="green">{t("transactions.sale")}</Tag>;
    case "received":
      return <Tag color="purple">{t("transactions.received")}</Tag>;
    case "upgrade":
      return <Tag color="blue">{t("transactions.upgrade")}</Tag>;
    case "burn":
      return <Tag color="volcano">{t("transactions.burn")}</Tag>;
    default:
      return <Tag>{t("transactions.transaction")}</Tag>;
  }
};

const formatTypeLabel = (type: string, t: (key: string) => string) => {
  switch (type.toLowerCase()) {
    case "purchase":
      return t("transactions.collectionPurchase");
    case "marketplace":
      return t("transactions.marketplaceTrade");
    case "upgrade":
      return t("transactions.giftUpgrade");
    case "burn":
      return t("transactions.burn");
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
  t: (key: string, options?: Record<string, unknown>) => string,
) => {
  const label = username || t("common.userFallback", { id: fallbackId });

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
  const { t, i18n } = useTranslation();
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
          label: t("transactions.purchasedBy"),
          children: renderUserValue(
            transaction.seller_username,
            transaction.seller_profile_pic_url,
            transaction.seller_id,
            navigate,
            onClose,
            t,
          ),
        },
        {
          key: "received_by",
          label: t("transactions.receivedBy"),
          children: renderUserValue(
            transaction.buyer_username,
            transaction.buyer_profile_pic_url,
            transaction.buyer_id,
            navigate,
            onClose,
            t,
          ),
        },
      ]
    : [
        {
          key: "buyer",
          label: t("transactions.buyer"),
          children: renderUserValue(
            transaction.buyer_username,
            transaction.buyer_profile_pic_url,
            transaction.buyer_id,
            navigate,
            onClose,
            t,
          ),
        },
        {
          key: "seller",
          label: t("transactions.seller"),
          children: renderUserValue(
            transaction.seller_username,
            transaction.seller_profile_pic_url,
            transaction.seller_id,
            navigate,
            onClose,
            t,
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
      title={<Title level={4} className="!mb-0">{t("transactions.detailsTitle")}</Title>}
    >
      <Flex vertical gap={16} className="mt-4">
        <Flex justify="space-between" align="center" gap={12} wrap="wrap">
          <Text type="secondary">{t("transactions.transactionNumber", { id: transaction.transaction_id })}</Text>
          <Flex gap={8} wrap="wrap">
            {getViewTag(kind, t)}
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
              label: t("transactions.sourceType"),
              children: formatTypeLabel(transaction.transaction_type, t),
            },
            {
              key: "collection",
              label: t("transactions.collection"),
              children: transaction.collection_name,
            },
            {
              key: "present",
              label: t("transactions.present"),
              children: `#${transaction.present_id}`,
            },
            ...participantItems,
            {
              key: "price",
              label: t("transactions.price"),
              children: formatAmount(transaction.transaction_price),
            },
            {
              key: "platform_fee",
              label: t("transactions.platformFee"),
              children: formatAmount(transaction.platform_fee),
            },
            {
              key: "seller_received",
              label: t("transactions.sellerReceived"),
              children: formatAmount(transaction.seller_received),
            },
            {
              key: "tx_hash",
              label: t("transactions.txHash"),
              children: transaction.blockchain_tx_hash ? (
                <Text code copyable className="break-all">
                  {transaction.blockchain_tx_hash}
                </Text>
              ) : (
                t("transactions.notAvailable")
              ),
            },
            {
              key: "date",
              label: t("transactions.date"),
              children: new Date(transaction.transaction_date).toLocaleString(i18n.language),
            },
          ]}
        />
      </Flex>
    </Modal>
  );
};

export default TransactionDetailModal;
