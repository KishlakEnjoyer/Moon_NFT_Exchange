import { Modal, Flex, Typography, Spin, Empty, Table, Tag, Avatar, Button } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Transaction,
  TransactionFilter,
  getProfileAvatarUrl,
  getUserTransactions,
} from "../services/transactionService";
import TransactionDetailModal, { TransactionViewKind } from "./TransactionDetailModal";
import { useTranslation } from "react-i18next";
import UserNameWithBadge from "./UserNameWithBadge";

const { Text, Title } = Typography;

interface TransactionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  currentUsername: string;
}

const TransactionHistoryModal = ({ open, onClose, userId, currentUsername }: TransactionHistoryModalProps) => {
  const { t, i18n } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getUserTransactions(userId, filter)
      .then((data) => setTransactions(data))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [open, userId, filter]);

  useEffect(() => {
    if (!open) {
      setSelectedTransaction(null);
    }
  }, [open]);

  const handleUserClick = (username: string | null | undefined) => {
    if (username) {
      onClose();
      navigate(`/account/${username}`);
    }
  };

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

  const getTransactionViewKind = (tx: Transaction): TransactionViewKind => {
    const type = tx.transaction_type.toLowerCase();

    if (type === "purchase") {
      if (tx.seller_id === userId) {
        return "purchase";
      }

      return "received";
    }

    if (type === "marketplace") {
      return tx.buyer_id === userId ? "purchase" : "sale";
    }

    if (type === "upgrade") {
      return "upgrade";
    }

    if (type === "burn") {
      return "burn";
    }

    return tx.buyer_id === userId ? "purchase" : "sale";
  };

  const getTypeTag = (tx: Transaction) => {
    const kind = getTransactionViewKind(tx);

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

  const getCounterpartyUsername = (tx: Transaction) => {
    const kind = getTransactionViewKind(tx);

    if (kind === "purchase") {
      return tx.buyer_id === userId ? tx.seller_username : tx.buyer_username;
    }

    if (kind === "received") {
      return tx.seller_username;
    }

    if (kind === "sale") {
      return tx.buyer_username;
    }

    return tx.buyer_id === userId ? tx.seller_username : tx.buyer_username;
  };

  const getCounterpartyBadge = (tx: Transaction) => {
    const otherUsername = getCounterpartyUsername(tx);
    return otherUsername === tx.buyer_username
      ? {
          id: tx.buyer_profile_badge_achievement_id,
          imageUrl: tx.buyer_profile_badge_image_url,
          title: tx.buyer_profile_badge_title,
        }
      : {
          id: tx.seller_profile_badge_achievement_id,
          imageUrl: tx.seller_profile_badge_image_url,
          title: tx.seller_profile_badge_title,
        };
  };

  const columns = [
    {
      title: t("transactions.type"),
      dataIndex: "transaction_type",
      key: "type",
      width: 100,
      render: (_: string, tx: Transaction) => getTypeTag(tx),
    },
    {
      title: t("transactions.collection"),
      dataIndex: "collection_name",
      key: "collection",
      width: 190,
      render: (name: string, tx: Transaction) => (
        <Flex vertical gap={0}>
          <Text strong>{name}</Text>
          <Text type="secondary">{t("transactions.gift", { id: tx.present_id })}</Text>
        </Flex>
      ),
    },
    {
      title: t("transactions.counterparty"),
      key: "counterparty",
      width: 140,
      render: (_: unknown, tx: Transaction) => {
        const otherUsername = getCounterpartyUsername(tx);
        const otherProfilePicUrl =
          otherUsername === tx.buyer_username
            ? tx.buyer_profile_pic_url
            : tx.seller_profile_pic_url;
        const otherBadge = getCounterpartyBadge(tx);

        return (
          <Flex align="center" gap={6}>
            <Avatar size={24} src={getProfileAvatarUrl(otherProfilePicUrl)} />
            <UserNameWithBadge
              username={otherUsername}
              fallback={t("common.unknown")}
              badgeId={otherBadge.id}
              badgeImageUrl={otherBadge.imageUrl}
              badgeTitle={otherBadge.title}
              badgeSize={16}
              onClick={(event) => {
                event.stopPropagation();
                handleUserClick(otherUsername);
              }}
            />
          </Flex>
        );
      },
    },
    {
      title: t("transactions.price"),
      dataIndex: "transaction_price",
      key: "price",
      width: 100,
      render: (price: string) => (
        <Text strong>{parseFloat(price).toFixed(2)} TON</Text>
      ),
    },
    {
      title: t("transactions.status"),
      dataIndex: "transaction_status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: t("transactions.date"),
      dataIndex: "transaction_date",
      key: "date",
      width: 160,
      render: (date: string) => (
        <Text type="secondary">{new Date(date).toLocaleString(i18n.language)}</Text>
      ),
    },
    {
      title: "",
      key: "details",
      width: 90,
      align: "right" as const,
      render: (_: unknown, tx: Transaction) => (
        <Button
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedTransaction(tx);
          }}
        >
          {t("transactions.details")}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width="min(860px, calc(100vw - 24px))"
        title={<Title level={4} className="!mb-0">{t("transactions.historyTitle")}</Title>}
      >
        <Flex vertical gap={16} className="mt-4">
          <Flex gap={8} wrap="wrap">
            <Tag.CheckableTag
              checked={filter === "all"}
              onChange={() => setFilter("all")}
              className="text-[16px] p-1"
            >
              {t("transactions.all")}
            </Tag.CheckableTag>
            <Tag.CheckableTag
              checked={filter === "purchases"}
              onChange={() => setFilter("purchases")}
              className="text-[16px] p-1"
            >
              {t("transactions.purchases")}
            </Tag.CheckableTag>
            <Tag.CheckableTag
              checked={filter === "sales"}
              onChange={() => setFilter("sales")}
              className="text-[16px] p-1"
            >
              {t("transactions.sales")}
            </Tag.CheckableTag>
          </Flex>

          {loading ? (
            <Flex justify="center" className="py-12">
              <Spin size="large" />
            </Flex>
          ) : transactions.length === 0 ? (
            <Empty
              description={
                <Text type="secondary">
                  {filter === "all"
                    ? t("transactions.noTransactions")
                    : filter === "purchases"
                    ? t("transactions.noPurchases")
                    : t("transactions.noSales")}
                </Text>
              }
              className="py-8"
            />
          ) : (
            <Table
              columns={columns}
              dataSource={transactions}
              rowKey="transaction_id"
              rowClassName={() => "cursor-pointer"}
              onRow={(record) => ({
                onClick: () => setSelectedTransaction(record),
              })}
              pagination={{ pageSize: 10, size: "small" }}
              size="small"
              scroll={{ x: 860, y: 400 }}
            />
          )}
        </Flex>
      </Modal>

      <TransactionDetailModal
        open={selectedTransaction !== null}
        transaction={selectedTransaction}
        currentUserId={userId}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  );
};

export default TransactionHistoryModal;
