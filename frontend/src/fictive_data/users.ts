export interface Gift {
  present_id: number;
  onSale: boolean;
  visible: boolean;
}

export interface User {
  user_id: number;
  role_id: number;
  user_tg_id: number;
  tg_username: string;
  tg_visibility: boolean;
  username: string;
  profile_pic_url: string;
  wallet_address: string;
  is_active: boolean;
  about_me: string | null;
  gifts: Gift[];
}

export const users: User[] = [
  {
    user_id: 1,
    role_id: 1,
    user_tg_id: 12345678,
    tg_username: "jdm_enjoyerr",
    tg_visibility: true,
    username: "KishlakEnjoyer",
    profile_pic_url: "ava.png",
    wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
    is_active: true,
    about_me: "TG investor from Russia.",
    gifts: [
      { present_id: 1, onSale: false, visible: false },
      { present_id: 2, onSale: true, visible: true },
      { present_id: 3, onSale: true, visible: true },
    ],
  },
  {
    user_id: 2,
    role_id: 1,
    user_tg_id: 87654321,
    tg_username: "crypto_wiz",
    tg_visibility: false,
    username: "CryptoWizard",
    profile_pic_url: "ava.png",
    wallet_address: "0xabcdef1234567890abcdef1234567890abcdef12",
    is_active: true,
    about_me: "Collector of rare digital gifts.",
    gifts: [
      { present_id: 4, onSale: true, visible: true },
      { present_id: 5, onSale: false, visible: true },
    ],
  },
  {
    user_id: 3,
    role_id: 1,
    user_tg_id: 11223344,
    tg_username: "moon_hodl",
    tg_visibility: false,
    username: "MoonHodler",
    profile_pic_url: "ava.png",
    wallet_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    is_active: true,
    about_me: "To the moon 🚀",
    gifts: [
      { present_id: 6, onSale: false, visible: true },
      { present_id: 7, onSale: true, visible: true },
      { present_id: 8, onSale: true, visible: false },
    ],
  },
  {
    user_id: 4,
    role_id: 1,
    user_tg_id: 55667788,
    tg_username: "pepe_nft",
    tg_visibility: true,
    username: "PepeCollector",
    profile_pic_url: "ava.png",
    wallet_address: "0xcafebabecafebabecafebabecafebabecafebabe",
    is_active: true,
    about_me: "All things Pepe.",
    gifts: [
      { present_id: 9, onSale: false, visible: true },
      { present_id: 10, onSale: true, visible: true },
    ],
  },
  {
    user_id: 5,
    role_id: 1,
    user_tg_id: 99001122,
    tg_username: "ton_whale",
    tg_visibility: true,
    username: "TonWhale",
    profile_pic_url: "023933c7810baed41527c26a1ab051a1.jpg",
    wallet_address: "0xf00df00df00df00df00df00df00df00df00df00d",
    is_active: true,
    about_me: "Big fish in the TON ocean.",
    gifts: [
      { present_id: 11, onSale: true, visible: true },
      { present_id: 12, onSale: false, visible: false },
      { present_id: 13, onSale: true, visible: true },
      { present_id: 14, onSale: false, visible: true },
    ],
  },
];

export const getUserByUsername = (username: string): User | undefined => {
  return users.find((u) => u.username === username);
};

export const getUserById = (id: number): User | undefined => {
  return users.find((u) => u.user_id === id);
};