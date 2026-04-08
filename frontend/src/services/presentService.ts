const API_URL = process.env.REACT_APP_API_URL;

export interface PresentDetail {
  present_id: number;
  present_num: number;
  image_url: string | null;
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
  is_on_sale: boolean;
  is_visible: number;
  is_upgraded: boolean;
  is_burned?: boolean;
  has_models: boolean;
  original_sender_username: string | null;
}

export const getPresentDetail = async (presentId: number): Promise<PresentDetail> => {
  const res = await fetch(`${API_URL}/presents/${presentId}/detail`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to fetch present details");
  }
  return res.json();
};

export const createListing = async (presentId: number, userId: number, price: string) => {
  const res = await fetch(`${API_URL}/listings/create`, {
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

export const togglePresentVisibility = async (presentId: number, userId: number) => {
  const res = await fetch(`${API_URL}/presents/${presentId}/toggle-visibility?user_id=${userId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to toggle visibility");
  }
  return res.json();
};
