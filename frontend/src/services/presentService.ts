import { authFetch } from "./auth";

const API_URL = process.env.REACT_APP_API_URL;
const IMAGES_URL = process.env.REACT_APP_IMAGES_URL;

export interface PresentDetail {
  present_id: number;
  present_num: number;
  image_url: string | null;
  description: string | null;
  collection_id: number;
  collection_name: string;
  collection_image_url: string | null;
  base_price: string;
  total_supply: number;
  model_name: string | null;
  model_image_url: string | null;
  background_name: string | null;
  background_image_url: string | null;
  symbol_name: string | null;
  symbol_image_url: string | null;
  owner_username: string | null;
  owner_id: number | null;
  owner_profile_pic_url: string | null;
  owner_profile_badge_achievement_id: number | null;
  owner_profile_badge_image_url: string | null;
  owner_profile_badge_title: string | null;
  is_on_sale: boolean;
  active_listing_id: number | null;
  active_listing_price: string | null;
  is_visible: number;
  is_upgraded: boolean;
  is_burned?: boolean;
  has_models: boolean;
  original_sender_username: string | null;
  original_sender_profile_pic_url: string | null;
  original_sender_profile_badge_achievement_id: number | null;
  original_sender_profile_badge_image_url: string | null;
  original_sender_profile_badge_title: string | null;
}

export interface UpgradePresentResponse {
  present_id: number;
  image_url: string | null;
  model_id: number | null;
  model_name: string | null;
  background_id: number | null;
  background_name: string | null;
  symbol_id: number | null;
  symbol_name: string | null;
  tx_hash: string;
  price: string;
  new_balance: string;
}

export interface PriceEstimate {
  avg_price: string | null;
  low_price: string | null;
  high_price: string | null;
  listings_count: number;
}

const hasFileExtension = (value: string) => /\.[a-z0-9]+$/i.test(value);

const withDefaultExtension = (value: string, extension: string) => (
  hasFileExtension(value) ? value : `${value}.${extension}`
);

export const getPresentDisplayImageUrl = (
  imageUrl: string | null | undefined,
  isUpgraded: boolean,
): string => {
  if (!imageUrl) return `${IMAGES_URL}/presents/placeholder.png`;

  if (isUpgraded) {
    return `${IMAGES_URL}/presents/${imageUrl}`;
  }

  return `${IMAGES_URL}/collections/${withDefaultExtension(imageUrl, "webp")}`;
};

export const getPresentDetail = async (presentId: number): Promise<PresentDetail> => {
  const res = await fetch(`${API_URL}/presents/${presentId}/detail`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to fetch present details");
  }
  return res.json();
};

export const getPriceEstimate = async (presentId: number): Promise<PriceEstimate> => {
  const res = await fetch(`${API_URL}/price-estimate/pricing/present/${presentId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to fetch recommended price");
  }
  return res.json();
};

export const upgradePresent = async (
  presentId: number,
  userId?: number,
): Promise<UpgradePresentResponse> => {
  const query = userId !== undefined ? `?user_id=${userId}` : "";
  const res = await authFetch(`${API_URL}/presents/${presentId}/upgrade${query}`, {
    method: "POST",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to upgrade present");
  }

  return res.json();
};

export const createListing = async (presentId: number, userId: number, price: string) => {
  const res = await authFetch(`${API_URL}/listings/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ present_id: presentId, seller_id: userId, price }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to create listing");
  }
  return res.json();
};

export const cancelListing = async (presentId: number) => {
  const res = await authFetch(`${API_URL}/listings/${presentId}/cancel`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to remove listing");
  }
  return res.json();
};

export const togglePresentVisibility = async (presentId: number, userId: number) => {
  const res = await authFetch(`${API_URL}/presents/${presentId}/toggle-visibility?user_id=${userId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to toggle visibility");
  }
  return res.json();
};
