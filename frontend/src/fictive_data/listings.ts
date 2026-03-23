import { getPresentById, Present } from "./presents";
import { getUserById, User } from "./users";

export type ListingStatus = "active" | "sold" | "cancelled";

export interface Listing {
  listing_id: number;
  present_id: number;
  seller_id: number;
  status_id: ListingStatus;
  price: number;
  blockchain_tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingFull extends Listing {
  present: Present;
  seller: User;
}

export const listings: Listing[] = [
  {
    listing_id: 1,
    present_id: 2,
    seller_id: 1,
    status_id: "active",
    price: 120,
    blockchain_tx_hash: null,
    created_at: "2025-01-01T10:00:00Z",
    updated_at: "2025-01-01T10:00:00Z",
  },
  {
    listing_id: 2,
    present_id: 3,
    seller_id: 1,
    status_id: "active",
    price: 150,
    blockchain_tx_hash: null,
    created_at: "2025-01-02T12:00:00Z",
    updated_at: "2025-01-02T12:00:00Z",
  },
  {
    listing_id: 5,
    present_id: 1,
    seller_id: 5,
    status_id: "active",
    price: 50,
    blockchain_tx_hash: null,
    created_at: "2025-01-05T11:00:00Z",
    updated_at: "2025-01-05T11:00:00Z",
  },
  {
    listing_id: 6,
    present_id: 5,
    seller_id: 4,
    status_id: "sold",
    price: 200,
    blockchain_tx_hash: "0xdef456",
    created_at: "2025-01-06T08:00:00Z",
    updated_at: "2025-01-07T08:00:00Z",
  },
  {
    listing_id: 5,
    present_id: 1,
    seller_id: 5,
    status_id: "active",
    price: 50,
    blockchain_tx_hash: null,
    created_at: "2025-01-05T11:00:00Z",
    updated_at: "2025-01-05T11:00:00Z",
  },
  {
    listing_id: 5,
    present_id: 1,
    seller_id: 5,
    status_id: "active",
    price: 50,
    blockchain_tx_hash: null,
    created_at: "2025-01-05T11:00:00Z",
    updated_at: "2025-01-05T11:00:00Z",
  },
  {
    listing_id: 5,
    present_id: 1,
    seller_id: 5,
    status_id: "active",
    price: 50,
    blockchain_tx_hash: null,
    created_at: "2025-01-05T11:00:00Z",
    updated_at: "2025-01-05T11:00:00Z",
  },
  {
    listing_id: 5,
    present_id: 1,
    seller_id: 5,
    status_id: "active",
    price: 50,
    blockchain_tx_hash: null,
    created_at: "2025-01-05T11:00:00Z",
    updated_at: "2025-01-05T11:00:00Z",
  },
  {
    listing_id: 5,
    present_id: 1,
    seller_id: 5,
    status_id: "active",
    price: 50,
    blockchain_tx_hash: null,
    created_at: "2025-01-05T11:00:00Z",
    updated_at: "2025-01-05T11:00:00Z",
  },
  {
    listing_id: 5,
    present_id: 1,
    seller_id: 5,
    status_id: "active",
    price: 50,
    blockchain_tx_hash: null,
    created_at: "2025-01-05T11:00:00Z",
    updated_at: "2025-01-05T11:00:00Z",
  },
  {
    listing_id: 5,
    present_id: 1,
    seller_id: 5,
    status_id: "active",
    price: 50,
    blockchain_tx_hash: null,
    created_at: "2025-01-05T11:00:00Z",
    updated_at: "2025-01-05T11:00:00Z",
  },
];

export const getListingsFull = (): ListingFull[] => {
  return listings
    .map((l) => {
      const present = getPresentById(l.present_id);
      const seller = getUserById(l.seller_id);
      if (!present || !seller) return null;
      return { ...l, present, seller };
    })
    .filter(Boolean) as ListingFull[];
};

export const getActiveListings = (): ListingFull[] => {
  return getListingsFull().filter((l) => l.status_id === "active");
};

export const getListingById = (id: number): ListingFull | undefined => {
  return getListingsFull().find((l) => l.listing_id === id);
};