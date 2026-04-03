export interface Transaction {
  transaction_id: number;
  transaction_price: string;
  platform_fee: string;
  seller_received: string;
  transaction_date: string;
  transaction_type: string;
  transaction_status: string;
  present_id: number;
  token_id: string;
  collection_name: string;
  blockchain_network: string;
  buyer_id: number;
  buyer_username: string | null;
  seller_id: number;
  seller_username: string | null;
  blockchain_tx_hash: string | null;
}

export type TransactionFilter = "all" | "purchases" | "sales";

const API_URL = process.env.REACT_APP_API_URL;

export const getUserTransactions = async (
  userId: number,
  filter: TransactionFilter = "all",
  limit: number = 50,
  offset: number = 0
): Promise<Transaction[]> => {
  const params = new URLSearchParams({
    filter_type: filter,
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${API_URL}/transactions/${userId}?${params}`);
  if (!res.ok) return [];
  return res.json();
};
