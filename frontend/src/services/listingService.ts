import { authFetch } from "./auth";

export interface ApiListing {
  listing_id: number;
  price: string;
  present_id: number;
  present_num: number;
  present_image_url: string | null;
  collection_id: number;
  collection_name: string;
  model_name: string | null;
  background_image_url: string | null;
  symbol_name: string | null;
  seller_id: number;
  seller_username: string | null;
  seller_profile_pic_url: string | null;
  seller_wallet: string | null;
}

export interface CartItem {
  cart_item_id: number;
  listing_id: number;
  price: string;
  present_id: number;
  present_num: number;
  present_image_url: string | null;
  collection_name: string;
  model_name: string | null;
  seller_id: number;
  seller_username: string | null;
}

export interface Cart {
  user_id: number;
  items: CartItem[];
  total: string;
}

export interface BuyListingResponse {
  listing_id: number;
  present_id: number;
  buyer_id: number;
  seller_id: number;
  price: string;
  platform_fee: string;
  seller_received: string;
  buyer_tx_hash: string;
  seller_tx_hash: string | null;
  new_balance: string | null;
  seller_new_balance: string | null;
}

export interface ListingSearchParams {
  search?: string;
  smart?: boolean;
  collection_ids?: number[];
  model_ids?: number[];
  background_ids?: number[];
  symbol_ids?: number[];
  price_min?: number;
  price_max?: number;
  sort?: string | null;
}

const API_URL = process.env.REACT_APP_API_URL;
const IMAGES_URL = process.env.REACT_APP_IMAGES_URL;

export const formatTonPrice = (price: string | number, compact = false): string => {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "0.00";

  if (compact && Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const setArrayParam = (searchParams: URLSearchParams, name: string, values?: number[]) => {
  if (values?.length) {
    searchParams.set(name, values.join(","));
  }
};

export const getActiveListings = async (params: ListingSearchParams = {}): Promise<ApiListing[]> => {
  const searchParams = new URLSearchParams();
  const search = params.search?.trim();

  if (search) {
    searchParams.set("search", search);
    searchParams.set("smart", String(Boolean(params.smart)));
  }

  setArrayParam(searchParams, "collection_ids", params.collection_ids);
  setArrayParam(searchParams, "model_ids", params.model_ids);
  setArrayParam(searchParams, "background_ids", params.background_ids);
  setArrayParam(searchParams, "symbol_ids", params.symbol_ids);

  if (params.price_min !== undefined) {
    searchParams.set("price_min", String(params.price_min));
  }

  if (params.price_max !== undefined) {
    searchParams.set("price_max", String(params.price_max));
  }

  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  const query = searchParams.toString();
  const res = await fetch(`${API_URL}/listings/active${query ? `?${query}` : ""}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.detail || "Failed to load listings");
  }

  return res.json();
};

export const getCart = async (userId: number): Promise<Cart> => {
  const res = await authFetch(`${API_URL}/cart/${userId}`);
  if (!res.ok) return { user_id: userId, items: [], total: "0" };
  return res.json();
};

export const addToCart = async (userId: number, listingId: number): Promise<CartItem> => {
  const res = await authFetch(`${API_URL}/cart/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, listing_id: listingId }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to add to cart");
  }
  return res.json();
};

export const removeFromCart = async (cartItemId: number): Promise<void> => {
  const res = await authFetch(`${API_URL}/cart/${cartItemId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to remove from cart");
  }
};

export const clearCart = async (userId: number): Promise<void> => {
  const res = await authFetch(`${API_URL}/cart/clear/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to clear cart");
  }
};

export const buyListing = async (listingId: number): Promise<BuyListingResponse> => {
  const res = await authFetch(`${API_URL}/listings/${listingId}/buy`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to buy listing");
  }
  return res.json();
};

export const getPresentImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return `${IMAGES_URL}/presents/placeholder.png`;
  return `${IMAGES_URL}/presents/${imageUrl}`;
};

export const getSellerAvatarUrl = (profilePicUrl: string | null | undefined): string => {
  if (!profilePicUrl) return `${IMAGES_URL}/pfps/example_user.png`;
  return `${IMAGES_URL}/pfps/${profilePicUrl}`;
};
