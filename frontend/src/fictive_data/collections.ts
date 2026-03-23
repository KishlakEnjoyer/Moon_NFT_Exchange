export interface Collection {
  collection_id: number;
  collection_name: string;
  collection_image_url: string;
  collection_limit: number;
  purchase_limit: number;
  blockchain_network: string;
  contract_address: string | null;
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const collections: Collection[] = [
  {
    collection_id: 1,
    collection_name: "Cap",
    collection_image_url: "cap.png",
    collection_limit: 10000,
    purchase_limit: 5,
    blockchain_network: "TON",
    contract_address: null,
    base_price: 50,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    collection_id: 2,
    collection_name: "Plush Pepe",
    collection_image_url: "pepe.png",
    collection_limit: 100000,
    purchase_limit: 10,
    blockchain_network: "TON",
    contract_address: null,
    base_price: 120,
    is_active: true,
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  },
  {
    collection_id: 3,
    collection_name: "Golden Bear",
    collection_image_url: "cap.png",
    collection_limit: 50000,
    purchase_limit: 3,
    blockchain_network: "TON",
    contract_address: null,
    base_price: 340,
    is_active: true,
    created_at: "2025-01-03T00:00:00Z",
    updated_at: "2025-01-03T00:00:00Z",
  },
];

export const getCollectionById = (id: number): Collection | undefined => {
  return collections.find((c) => c.collection_id === id);
};