export interface Present {
  present_id: number;
  collection_id: number;
  model_id: number;
  background_id: number;
  symbol_id: number;
  present_num: number;
  token_id: string | null;
  metadata_uri: string | null;
  image_url: string;
  generated_at: string | null;
  is_burned: boolean;

  collectionName: string;
  modelName: string;
  modelRarity: number;    // % редкости
  backgroundName: string;
  backgroundRarity: number;
  symbolName: string;
  symbolRarity: number;
}

export const presents: Present[] = [
  {
    present_id: 1,
    collection_id: 1,
    model_id: 1,
    background_id: 1,
    symbol_id: 1,
    present_num: 1,
    token_id: null,
    metadata_uri: null,
    image_url: "cap.png",
    generated_at: "2025-01-01T00:00:00Z",
    is_burned: false,
    collectionName: "Cap",
    modelName: "Classic",
    modelRarity: 12.5,
    backgroundName: "Carmine",
    backgroundRarity: 1.0,
    symbolName: "Bubbles",
    symbolRarity: 0.7,
  },
  {
    present_id: 2,
    collection_id: 2,
    model_id: 2,
    background_id: 2,
    symbol_id: 2,
    present_num: 1,
    token_id: null,
    metadata_uri: null,
    image_url: "pepe.png",
    generated_at: "2025-01-02T00:00:00Z",
    is_burned: false,
    collectionName: "Plush Pepe",
    modelName: "Rock and Roll",
    modelRarity: 2.5,
    backgroundName: "Carmine",
    backgroundRarity: 1.0,
    symbolName: "Bubbles",
    symbolRarity: 0.7,
  },
  {
    present_id: 3,
    collection_id: 2,
    model_id: 3,
    background_id: 2,
    symbol_id: 3,
    present_num: 2,
    token_id: null,
    metadata_uri: null,
    image_url: "pepe2.png",
    generated_at: "2025-01-03T00:00:00Z",
    is_burned: false,
    collectionName: "Plush Pepe",
    modelName: "Jazz",
    modelRarity: 5.0,
    backgroundName: "Carmine",
    backgroundRarity: 1.0,
    symbolName: "Stars",
    symbolRarity: 3.2,
  },
  {
    present_id: 4,
    collection_id: 2,
    model_id: 4,
    background_id: 3,
    symbol_id: 4,
    present_num: 3,
    token_id: null,
    metadata_uri: null,
    image_url: "pepe3.png",
    generated_at: "2025-01-04T00:00:00Z",
    is_burned: false,
    collectionName: "Plush Pepe",
    modelName: "Hip Hop",
    modelRarity: 8.0,
    backgroundName: "Ocean",
    backgroundRarity: 2.5,
    symbolName: "Flames",
    symbolRarity: 1.5,
  },
  {
    present_id: 5,
    collection_id: 2,
    model_id: 5,
    background_id: 4,
    symbol_id: 5,
    present_num: 4,
    token_id: null,
    metadata_uri: null,
    image_url: "pepe4.png",
    generated_at: "2025-01-05T00:00:00Z",
    is_burned: false,
    collectionName: "Plush Pepe",
    modelName: "Classical",
    modelRarity: 15.0,
    backgroundName: "Forest",
    backgroundRarity: 4.0,
    symbolName: "Hearts",
    symbolRarity: 6.0,
  },
];

export const getPresentById = (id: number): Present | undefined => {
  return presents.find((p) => p.present_id === id);
};