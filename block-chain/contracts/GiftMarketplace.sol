// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./GiftToken.sol";

contract GiftMarketplace {

    GiftToken public token;
    address public platformWallet;  // куда идёт комиссия платформы
    address public owner;

    // ── Настройки платформы ────────────────────────────────
    uint256 public marketplaceFeePercent = 5;    // 5% комиссия с продажи
    uint256 public upgradeFeePercent = 10;       // 10% от базовой цены коллекции
    uint256 public burnRefundPercent = 85;       // 85% компенсация при burn

    // ── Владение подарками ─────────────────────────────────
    // presentId (из MySQL) → адрес владельца
    mapping(uint256 => address) public presentOwner;

    // ── Листинги ───────────────────────────────────────────
    struct Listing {
        uint256 presentId;
        address seller;
        uint256 price;       // в TON (wei)
        bool isActive;
    }
    mapping(uint256 => Listing) public listings;  // presentId → Listing

    // ── Цены покупки (для burn компенсации) ───────────────
    // presentId → цена первоначальной покупки
    mapping(uint256 => uint256) public purchasePrice;

    // ── События ────────────────────────────────────────────
    event PresentPurchased(
        uint256 indexed presentId,
        address indexed buyer,
        uint256 price
    );
    event PresentUpgraded(
        uint256 indexed presentId,
        address indexed owner,
        uint256 fee
    );
    event PresentListed(
        uint256 indexed presentId,
        address indexed seller,
        uint256 price
    );
    event PresentSold(
        uint256 indexed presentId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 platformFee,
        uint256 sellerReceived
    );
    event PresentDelisted(
        uint256 indexed presentId,
        address indexed seller
    );
    event PresentBurned(
        uint256 indexed presentId,
        address indexed owner,
        uint256 refund
    );

    // ── Модификаторы ───────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyPresentOwner(uint256 presentId) {
        require(presentOwner[presentId] == msg.sender, "Not present owner");
        _;
    }

    constructor(address tokenAddress, address _platformWallet) {
        token = GiftToken(tokenAddress);
        platformWallet = _platformWallet;
        owner = msg.sender;
    }

    // ── Настройки (только owner) ───────────────────────────

    function setFees(
        uint256 _marketplaceFee,
        uint256 _upgradeFee,
        uint256 _burnRefund
    ) external onlyOwner {
        require(_marketplaceFee <= 30, "Max 30%");
        require(_upgradeFee <= 50, "Max 50%");
        require(_burnRefund <= 100, "Max 100%");
        marketplaceFeePercent = _marketplaceFee;
        upgradeFeePercent = _upgradeFee;
        burnRefundPercent = _burnRefund;
    }

    // ── 1. Покупка неулучшенного подарка из коллекции ──────
    // Вызывает бэкенд от имени покупателя
    // basePrice — базовая цена коллекции в TON (wei)
    function purchasePresent(
        uint256 presentId,
        uint256 basePrice
    ) external {
        require(presentOwner[presentId] == address(0), "Already owned");
        require(
            token.balanceOf(msg.sender) >= basePrice,
            "Insufficient balance"
        );

        // Покупатель платит платформе
        token.transferFrom(msg.sender, platformWallet, basePrice);

        // Записываем владельца и цену покупки
        presentOwner[presentId] = msg.sender;
        purchasePrice[presentId] = basePrice;

        emit PresentPurchased(presentId, msg.sender, basePrice);
    }

    // ── 2. Улучшение подарка (оплата) ─────────────────────
    // upgradeCost считает бэкенд: basePrice * upgradeFeePercent / 100
    function upgradePresent(
        uint256 presentId,
        uint256 upgradeCost
    ) external onlyPresentOwner(presentId) {
        require(
            token.balanceOf(msg.sender) >= upgradeCost,
            "Insufficient balance"
        );

        // Оплата улучшения идёт платформе
        token.transferFrom(msg.sender, platformWallet, upgradeCost);

        emit PresentUpgraded(presentId, msg.sender, upgradeCost);
    }

    // ── 3. Выставить подарок на продажу ───────────────────
    function listPresent(
        uint256 presentId,
        uint256 price
    ) external onlyPresentOwner(presentId) {
        require(price > 0, "Price must be > 0");
        require(!listings[presentId].isActive, "Already listed");

        listings[presentId] = Listing({
            presentId: presentId,
            seller: msg.sender,
            price: price,
            isActive: true
        });

        emit PresentListed(presentId, msg.sender, price);
    }

    // ── 4. Купить подарок на маркетплейсе (p2p) ───────────
    function buyPresent(uint256 presentId) external {
        Listing storage listing = listings[presentId];
        require(listing.isActive, "Not listed");
        require(msg.sender != listing.seller, "Cannot buy own present");
        require(
            token.balanceOf(msg.sender) >= listing.price,
            "Insufficient balance"
        );

        uint256 price = listing.price;
        address seller = listing.seller;

        // Считаем комиссию
        uint256 platformFee = (price * marketplaceFeePercent) / 100;
        uint256 sellerReceived = price - platformFee;

        // Переводим токены
        token.transferFrom(msg.sender, seller, sellerReceived);
        token.transferFrom(msg.sender, platformWallet, platformFee);

        // Меняем владельца
        presentOwner[presentId] = msg.sender;

        // Деактивируем листинг
        listing.isActive = false;

        emit PresentSold(presentId, msg.sender, seller, price, platformFee, sellerReceived);
    }

    // ── 5. Снять с продажи ────────────────────────────────
    function delistPresent(uint256 presentId) external onlyPresentOwner(presentId) {
        require(listings[presentId].isActive, "Not listed");
        listings[presentId].isActive = false;
        emit PresentDelisted(presentId, msg.sender);
    }

    // ── 6. Burn-to-redeem ─────────────────────────────────
    function burnPresent(uint256 presentId) external onlyPresentOwner(presentId) {
        require(!listings[presentId].isActive, "Delist first");

        uint256 originalPrice = purchasePrice[presentId];
        uint256 refund = (originalPrice * burnRefundPercent) / 100;

        require(
            token.balanceOf(platformWallet) >= refund,
            "Platform insufficient funds"
        );

        // Платформа отправляет компенсацию юзеру
        // (платформенный кошелёк должен approve маркетплейсу)
        token.transferFrom(platformWallet, msg.sender, refund);

        // Сжигаем — убираем владельца
        presentOwner[presentId] = address(0);

        emit PresentBurned(presentId, msg.sender, refund);
    }

    // ── Вспомогательные ───────────────────────────────────

    function getListing(uint256 presentId) external view returns (
        address seller,
        uint256 price,
        bool isActive
    ) {
        Listing memory l = listings[presentId];
        return (l.seller, l.price, l.isActive);
    }

    function getPresentOwner(uint256 presentId) external view returns (address) {
        return presentOwner[presentId];
    }
}