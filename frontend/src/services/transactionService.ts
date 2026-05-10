import { authFetch } from "./auth";

export interface Transaction {
  transaction_id: number;
  transaction_price: string;
  platform_fee: string;
  seller_received: string;
  transaction_date: string;
  transaction_type: string;
  transaction_status: string;
  present_id: number;
  collection_name: string;
  buyer_id: number;
  buyer_username: string | null;
  buyer_profile_pic_url: string | null;
  buyer_profile_badge_achievement_id: number | null;
  buyer_profile_badge_image_url: string | null;
  buyer_profile_badge_title: string | null;
  seller_id: number;
  seller_username: string | null;
  seller_profile_pic_url: string | null;
  seller_profile_badge_achievement_id: number | null;
  seller_profile_badge_image_url: string | null;
  seller_profile_badge_title: string | null;
  blockchain_tx_hash: string | null;
}

export type TransactionFilter = "all" | "purchases" | "sales";

const API_URL = process.env.REACT_APP_API_URL;
const IMAGES_URL = process.env.REACT_APP_IMAGES_URL;

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
  const res = await authFetch(`${API_URL}/transactions/${userId}?${params}`);
  if (!res.ok) return [];
  return res.json();
};

export const getProfileAvatarUrl = (profilePicUrl: string | null | undefined): string => {
  if (!profilePicUrl) return `${IMAGES_URL}/pfps/example_user.png`;
  return `${IMAGES_URL}/pfps/${profilePicUrl}`;
};
