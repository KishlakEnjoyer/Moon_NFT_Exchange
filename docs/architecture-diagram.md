# Moon NFT Exchange — Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     USER BROWSER                                                │
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              React Frontend (TypeScript)                                 │   │
│  │                                                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │  MainView    │  │ AccountView  │  │  Modals      │  │  Components  │                │   │
│  │  │ (Marketplace)│  │  (Profile)   │  │ (Gift Detail)│  │ (Cart, etc)  │                │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                │   │
│  │         │                 │                  │                  │                        │   │
│  │         └─────────────────┴──────────────────┴──────────────────┘                        │   │
│  │                                    │                                                     │   │
│  │                     ┌──────────────▼──────────────┐                                     │   │
│  │                     │      Service Layer           │                                     │   │
│  │                     │                              │                                     │   │
│  │                     │  • listingService.ts         │                                     │   │
│  │                     │  • albumService.ts           │                                     │   │
│  │                     │  • profileService.ts         │                                     │   │
│  │                     │  • transactionService.ts     │                                     │   │
│  │                     │  • presentService.ts         │                                     │   │
│  │                     └──────────────┬──────────────┘                                     │   │
│  │                                    │                                                     │   │
│  │         ┌──────────────────────────┼──────────────────────────┐                         │   │
│  │         │                          │                          │                         │   │
│  │  ┌──────▼──────┐          ┌───────▼────────┐    ┌────────────▼──────┐                  │   │
│  │  │  REST API   │          │  WebSocket     │    │  Image Assets     │                  │   │
│  │  │  Calls      │          │  Connections   │    │  (Static URLs)    │                  │   │
│  │  │  (HTTPS)    │          │  (Real-time)   │    │                   │                  │   │
│  │  └──────┬──────┘          └───────┬────────┘    └───────────────────┘                  │   │
│  │         │                          │                                                     │   │
│  └─────────┼──────────────────────────┼─────────────────────────────────────────────────────┘   │
│            │                          │                                                         │
└────────────┼──────────────────────────┼─────────────────────────────────────────────────────────┘
             │                          │
             │                          │
             ▼                          ▼
┌────────────────────────┐   ┌────────────────────────────────────────────┐
│                        │   │              WebSocket Streams              │
│                        │   │                                            │
│   FASTAPI BACKEND      │   │  ┌──────────────────────────────────────┐  │
│                        │   │  │  /auth/ws/{userId}                   │  │
│  ┌──────────────────┐  │   │  │  → Real-time balance updates         │  │
│  │   API Routers    │  │   │  │  → balance_update messages           │  │
│  │                  │  │   │  └──────────────────────────────────────┘  │
│  │ • auth_router    │  │   │                                            │
│  │ • listings_router│  │   │  ┌──────────────────────────────────────┐  │
│  │ • gift_router    │  │   │  │  /notifications/ws/{userId}          │  │
│  │ • presents_router│  │   │  │  → Push notifications                │  │
│  │ • cart_router    │  │   │  │  → gift_received events              │  │
│  │ • albums_router  │  │   │  └──────────────────────────────────────┘  │
│  │ • transactions_  │  │   └────────────────────────────────────────────┘
│  │     router       │  │
│  │ • user_wallet_   │  │   ┌────────────────────────────────────────────┐
│  │     router       │  │   │             BACKEND SERVICES               │
│  │ • filters_router │  │   │                                            │
│  │ • topup_router   │  │   │  ┌──────────────────────────────────────┐  │
│  │ • notification_  │  │   │  │   Blockchain Service Layer            │  │
│  │     router       │  │   │  │                                      │  │
│  └────────┬─────────┘  │   │  │  client.py                            │  │
│           │            │   │  │  ├─ Web3 RPC Connection               │  │
│  ┌────────▼─────────┐  │   │  │  ├─ get_chain_id()                    │  │
│  │   Business Logic │  │   │  │  ├─ get_transaction()                 │  │
│  │                  │  │   │  │  └─ get_transaction_receipt()         │  │
│  │  gift_service.py │◄─┼───┼──┤                                      │  │
│  │  ├─ Validate     │  │   │  │  wallet_service.py                    │  │
│  │  ├─ Gas Sponsor  │  │   │  │  ├─ create_new_wallet()               │  │
│  │  ├─ Token Check  │  │   │  │  └─ get_native_balance()              │  │
│  │  └─ Create NFT   │  │   │  │                                      │  │
│  │                  │  │   │  │  token_service.py ⭐ CORE             │  │
│  │  topup_service   │◄─┼───┼──┤  ├─ approve_tokens()                  │  │
│  │  ├─ Faucet logic │  │   │  │  ├─ transfer_from_tokens()            │  │
│  │  └─ Cooldown     │  │   │  │  ├─ burn_tokens()                     │  │
│  │                  │  │   │  │  └─ send_eth()                        │  │
│  │  crypto_service  │  │   │  │                                      │  │
│  │  └─ Fernet encrypt│  │   │  │  ABI: MoonToken.json                 │  │
│  │                  │  │   │  │  (ERC-20 standard interface)          │  │
│  └────────┬─────────┘  │   │  └──────────────────────────────────────┘  │
│           │            │   └────────────────────┬───────────────────────┘
│           │            │                        │
└───────────┼────────────┘                        │
            │                                     │
            ▼                                     ▼
┌────────────────────────┐   ┌────────────────────────────────────────────┐
│      MySQL Database    │   │          EVM Blockchain (Ganache/Sepolia)  │
│                        │   │                                            │
│  ┌──────────────────┐  │   │  ┌──────────────────────────────────────┐  │
│  │  users           │  │   │  │  Smart Contract: MoonToken.sol       │  │
│  │  ├─ id           │  │   │  │  (ERC-20 Token)                      │  │
│  │  ├─ wallet_addr  │◄─┼───┼──┤                                      │  │
│  │  ├─ wallet_pk_enc│  │   │  │  Functions:                          │  │
│  │  └─ balance      │  │   │  │  • transfer()                        │  │
│  └──────────────────┘  │   │  │  • transferFrom()                    │  │
│                        │   │  │  • approve() / allowance()            │  │
│  ┌──────────────────┐  │   │  │  • burn()                            │  │
│  │  presents        │  │   │  │  • balanceOf()                       │  │
│  │  ├─ id           │  │   │  │  • name/symbol/decimals/totalSupply  │  │
│  │  ├─ collection_id│  │   │  └──────────────────────────────────────┘  │
│  │  ├─ current_owner│  │   │                                            │
│  │  └─ tx_hash      │  │   │  Network Configurations:                   │
│  └──────────────────┘  │   │  • Ganache (local dev, chainId 1337)       │
│                        │   │  • Sepolia (testnet)                       │
│  ┌──────────────────┐  │   │                                            │
│  │  listings        │  │   │  Platform Wallets:                         │  │
│  │  ├─ present_id   │  │   │  • PLATFORM_OWNER_PRIVATE_KEY              │
│  │  ├─ seller_id    │  │   │    (faucet + gas sponsor)                  │
│  │  ├─ price        │  │   │  • User wallets (encrypted in DB)          │
│  │  └─ is_active    │  │   └────────────────────────────────────────────┘
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │  transactions    │  │
│  │  ├─ id           │  │
│  │  ├─ type         │  │
│  │  ├─ blockchain_  │  │
│  │  │   tx_hash     │  │
│  │  └─ status       │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │  albums          │  │
│  │  cart            │  │
│  │  notifications   │  │
│  │  wallet_topups   │  │
│  └──────────────────┘  │
└────────────────────────┘
```

---

## Key Transaction Flows

### 1. 🎁 GIFT PURCHASE FLOW (Marketplace Buy)

```
User A (Buyer)                    Frontend                    Backend API                Blockchain
     │                               │                           │                          │
     │─── Click "Buy Gift" ─────────>│                           │                          │
     │                               │                           │                          │
     │                               │── POST /cart/add ────────>│                          │
     │                               │   {listing_id}            │                          │
     │                               │                           │                          │
     │                               │<── 200 OK ────────────────│                          │
     │                               │   {cart_item}             │                          │
     │                               │                           │                          │
     │─── Open Cart & Checkout ─────>│                           │                          │
     │                               │                           │                          │
     │                               │── POST /gifts/purchase ──>│                          │
     │                               │   {present_id, receiver}  │                          │
     │                               │                           │                          │
     │                               │                           │── get_user_wallet() ──────>│
     │                               │                           │<─ wallet_address ─────────│
     │                               │                           │                          │
     │                               │                           │── Check: Gas Sponsor? ────>│
     │                               │                           │   If yes:                  │
     │                               │                           │   ├─ send_eth() ──────────>│ (fund user gas)
     │                               │                           │   ├─ approve_tokens() ────>│ (user approves platform)
     │                               │                           │   └─ transfer_from() ────>│ (platform pulls tokens)
     │                               │                           │   If no:                   │
     │                               │                           │   └─ transfer() ─────────>│ (direct user transfer)
     │                               │                           │                          │
     │                               │                           │<─ tx_hash ────────────────│
     │                               │                           │                          │
     │                               │                           │── Save Present in DB ────┐│
     │                               │                           │── Record Transaction ───>││
     │                               │                           │<─ 200 OK ───────────────┘│
     │                               │<── {present_detail} ──────│                          │
     │<── Success Notification ──────│                           │                          │
     │                               │                           │                          │
     │                               │<── WS: balance_update ────│                          │
     │<── Balance Updated ──────────│                           │                          │
```

### 2. 💰 TOKEN TOP-UP FLOW (Faucet)

```
User                          Frontend                    Backend API                Blockchain
 │                               │                           │                          │
 │─── Click "Get Tokens" ───────>│                           │                          │
 │                               │                           │                          │
 │                               │── POST /topup ───────────>│                          │
 │                               │   {user_id, amount}       │                          │
 │                               │                           │                          │
 │                               │                           │── Check: 5min cooldown? ─┐│
 │                               │                           │<─ Yes/No ───────────────┘│
 │                               │                           │                          │
 │                               │                           │── If allowed:             │
 │                               │                           │   transfer_tokens_to_user─>│
 │                               │                           │   (from platform wallet)  │
 │                               │                           │                          │
 │                               │                           │<─ tx_hash ────────────────│
 │                               │                           │                          │
 │                               │                           │── Record TopUp in DB ────┐│
 │                               │                           │<─ 200 OK ───────────────┘│
 │                               │<── {success, tx_hash} ────│                          │
 │<── Tokens Received ───────────│                           │                          │
 │                               │<── WS: balance_update ────│                          │
 │<── Balance Updated ──────────│                           │                          │
```

### 3. 🔥 BURN TO REDEEM FLOW

```
User                          Frontend                    Backend API                Blockchain
 │                               │                           │                          │
 │─── Open Gift Detail ─────────>│                           │                          │
 │─── Click "Burn & Redeem" ────>│                           │                          │
 │                               │                           │                          │
 │                               │── POST /presents/{id}/   ─>│                          │
 │                               │      burn?user_id=X       │                          │
 │                               │                           │                          │
 │                               │                           │── burn_tokens() ─────────>│
 │                               │                           │   (destroys NFT tokens)   │
 │                               │                           │                          │
 │                               │                           │<─ tx_hash ────────────────│
 │                               │                           │                          │
 │                               │                           │── Refund 75% to user ────>│
 │                               │                           │   (send_eth back)         │
 │                               │                           │                          │
 │                               │                           │── Update DB:             ┐│
 │                               │                           │   ├─ Present removed     ││
 │                               │                           │   └─ Transaction logged  ││
 │                               │                           │<─ 200 OK ───────────────┘│
 │                               │<── {success, refund_amt} ──│                          │
 │<── Tokens Redeemed ───────────│                           │                          │
 │                               │<── WS: balance_update ────│                          │
```

### 4. 📊 REAL-TIME BALANCE UPDATES (WebSocket)

```
User Browser                  Backend WebSocket Handler        Blockchain/DB
     │                               │                              │
     │─── Connect WS ───────────────>│                              │
     │   /auth/ws/{user_id}          │                              │
     │                               │                              │
     │                               │<── Balance changed? ─────────│
     │                               │    (from any transaction)    │
     │                               │                              │
     │<── {"type":"balance_update",  │                              │
     │     "balance": 123.45} ──────│                              │
     │                               │                              │
     │─── Update UI ────────────────>│ (display new balance)        │
     │                               │                              │
     │                               │    ... continuous stream ...  │
     │                               │                              │
     │─── Ping (every 30s) ─────────>│                              │
     │<── Pong ──────────────────────│                              │
     │                               │                              │
```

### 5. 🔐 TELEGRAM AUTH FLOW

```
User in Telegram              Frontend                    Backend API
     │                               │                          │
     │─── Open WebApp ──────────────>│                          │
     │                               │                          │
     │                               │── POST /auth/init ──────>│
     │                               │   {tg_init_data}        │
     │                               │                          │
     │                               │<── {state, auth_url} ───│
     │                               │                          │
     │                               │── Poll GET /auth/status/ │
     │                               │     {state} (every 2s) ─>│
     │                               │                          │
     │                               │<── {status: "complete",  │
     │                               │        user_id, wallet} ─│
     │                               │                          │
     │<── Logged In ────────────────│                          │
     │   (localStorage: currentUser) │                          │
```

---

## Data Flow Summary

### Frontend → Backend (REST API)
- All business logic calls go through REST endpoints
- Environment variable: `REACT_APP_API_URL`
- Examples: listings, cart, profiles, transactions, gifts

### Frontend → Backend (WebSocket)
- Real-time updates via WebSocket connections
- Environment variable: `REACT_APP_WS_URL`
- Two streams:
  - `/auth/ws/{userId}` — balance updates
  - `/notifications/ws/{userId}` — push notifications

### Backend → Blockchain (EVM RPC)
- All blockchain calls go through `web3.py` via `BLOCKCHAIN_RPC_URL`
- Environment variable: `BLOCKCHAIN_RPC_URL`
- Interactions:
  - Token transfers (ERC-20)
  - Token approvals
  - Token burns
  - Native ETH transfers (for gas)

### Backend → Database (MySQL)
- All persistent data stored in MySQL
- Tables: users, presents, listings, transactions, albums, cart, notifications, wallet_topups

---

## Smart Contract: MoonToken.sol

```solidity
// Location: blockchain/contracts/MoonToken.sol
// Standard: ERC-20
// Solidity: 0.8.28
// EVM Version: Shanghai

Key Functions:
├── transfer(to, amount)          // Direct token transfer
├── transferFrom(from, to, amount) // Platform-mediated transfer
├── approve(spender, amount)      // Approve platform to spend tokens
├── allowance(owner, spender)     // Check approved amount
├── burn(amount)                  // Burn tokens (owner only)
├── balanceOf(address)            // Query token balance
├── name() / symbol() / decimals() / totalSupply()  // Metadata
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Ant Design, Tailwind CSS, React Router v7 |
| **Backend** | Python 3, FastAPI, SQLAlchemy, Pydantic |
| **Blockchain** | Solidity 0.8.28, Hardhat, web3.py, ERC-20 |
| **Database** | MySQL |
| **Real-time** | WebSockets (FastAPI WebSocket support) |
| **Deployment** | Docker, Docker Compose |
| **Local Dev** | Ganache (chainId 1337) |
| **Testnet** | Sepolia |
| **Telegram** | Aiogram (Telegram Bot API) |
| **Encryption** | Fernet (for private key storage) |

---

## Key Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
REACT_APP_IMAGES_URL=http://localhost:8000/images
REACT_APP_BURN_REFUND_PERCENT=75
```

### Backend (.env)
```
BLOCKCHAIN_RPC_URL=http://localhost:8545
TOKEN_CONTRACT_ADDRESS=0x...
PLATFORM_OWNER_PRIVATE_KEY=0x...
WALLET_MASTER_ENCRYPTION_KEY=your-secret-key
GAS_SPONSOR_ENABLED=true
MAX_GAS_PRICE=50000000000
MAX_DAILY_GAS_BUDGET=10000000000000000000
DATABASE_URL=mysql+pymysql://user:pass@db:3306/moon_nft
```

### Blockchain (Hardhat)
```
SEPOLIA_RPC_URL=https://...
SEPOLIA_PRIVATE_KEY=0x...
```

---

## Security Notes

1. **Private Key Encryption**: User wallet private keys are encrypted with Fernet before storing in DB
2. **CORS**: Configured to only allow specific frontend origins
3. **Gas Sponsor Limits**: Platform has configurable max gas price and daily budget
4. **Top-up Cooldown**: 5-minute cooldown between faucet requests to prevent abuse
5. **Allowance Check**: Platform checks user allowance before attempting transfer_from

---

*Generated for Moon NFT Exchange — Diploma Project 2026*
