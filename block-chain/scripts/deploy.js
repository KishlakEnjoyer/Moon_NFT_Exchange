const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  // 1. Деплоим токен
  const GiftToken = await hre.ethers.getContractFactory("GiftToken");
  const token = await GiftToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ GiftToken deployed to:", tokenAddress);

  // 2. Деплоим маркетплейс (передаём адрес токена и платформенный кошелёк)
  const GiftMarketplace = await hre.ethers.getContractFactory("GiftMarketplace");
  const marketplace = await GiftMarketplace.deploy(
    tokenAddress,
    deployer.address  // платформенный кошелёк = owner (Account #0)
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ GiftMarketplace deployed to:", marketplaceAddress);

  // 3. Сохраняем оба ABI и адреса
  const tokenArtifact = await hre.artifacts.readArtifact("GiftToken");
  const marketplaceArtifact = await hre.artifacts.readArtifact("GiftMarketplace");

  const contractInfo = {
    token: { address: tokenAddress, abi: tokenArtifact.abi },
    marketplace: { address: marketplaceAddress, abi: marketplaceArtifact.abi }
  };

  const outPath = process.env.DOCKER
    ? "/backend/contract_info.json"
    : path.resolve(__dirname, "../../backend/contract_info.json");

  fs.writeFileSync(outPath, JSON.stringify(contractInfo, null, 2));
  console.log("✅ contract_info.json сохранён!");
}

main().catch((e) => { console.error(e); process.exit(1); });