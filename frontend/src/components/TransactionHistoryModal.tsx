import { Modal, Flex, Typography, Spin, Empty, Table, Tag, Avatar } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Transaction, TransactionFilter, getUserTransactions } from "../services/transactionService";

const { Text, Title } = Typography;

interface TransactionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  currentUsername: string;
}

const TransactionHistoryModal = ({ open, onClose, userId, currentUsername }: TransactionHistoryModalProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getUserTransactions(userId, filter)
      .then((data) => setTransactions(data))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [open, userId, filter]);

  const handleUserClick = (username: string | null | undefined) => {
    if (username) {
      onClose();
      navigate(`/account/${username}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  const getTypeTag = (tx: Transaction) => {
    const isPurchase = tx.buyer_id === userId;
    return (
      <Tag color={isPurchase ? "blue" : "green"}>
        {isPurchase ? "Purchase" : "Sale"}
      </Tag>
    );
  };

  const columns = [
    {
      title: "Type",
      dataIndex: "transaction_type",
      key: "type",
      width: 100,
      render: (_: string, tx: Transaction) => getTypeTag(tx),
    },
    {
      title: "Collection",
      dataIndex: "collection_name",
      key: "collection",
      width: 150,
      render: (name: string, tx: Transaction) => (
        <Text strong>#{tx.present_id}</Text>
      ),
    },
    {
      title: "Counterparty",
      key: "counterparty",
      width: 140,
      render: (_: unknown, tx: Transaction) => {
        const isPurchase = tx.buyer_id === userId;
        const otherUsername = isPurchase ? tx.seller_username : tx.buyer_username;
        return (
          <Flex align="center" gap={6}>
            <Avatar size={24} src={`${process.env.REACT_APP_IMAGES_URL}/pfps/example_user.png`} />
            <Text
              className="cursor-pointer hover:opacity-75"
              onClick={() => handleUserClick(otherUsername)}
            >
              {otherUsername || "Unknown"}
            </Text>
          </Flex>
        );
      },
    },
    {
      title: "Price",
      dataIndex: "transaction_price",
      key: "price",
      width: 100,
      render: (price: string) => (
        <Text strong>{parseFloat(price).toFixed(2)} TON</Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "transaction_status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "transaction_date",
      key: "date",
      width: 160,
      render: (date: string) => (
        <Text type="secondary">{new Date(date).toLocaleString()}</Text>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      title={<Title level={4} className="!mb-0">Transaction History</Title>}
    >
      <Flex vertical gap={16} className="mt-4">
        <Flex gap={8}>
          <Tag.CheckableTag
            checked={filter === "all"}
            onChange={() => setFilter("all")}
            className="text-[16px] p-1"
          >
            All
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={filter === "purchases"}
            onChange={() => setFilter("purchases")}
            className="text-[16px] p-1"
          >
            Purchases
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={filter === "sales"}
            onChange={() => setFilter("sales")}
            className="text-[16px] p-1"
          >
            Sales
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
                  ? "No transactions yet"
                  : filter === "purchases"
                  ? "No purchases yet"
                  : "No sales yet"}
              </Text>
            }
            className="py-8"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={transactions}
            rowKey="transaction_id"
            pagination={{ pageSize: 10, size: "small" }}
            size="small"
            scroll={{ y: 400 }}
          />
        )}
      </Flex>
    </Modal>
  );
};

export default TransactionHistoryModal;
