const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  const GiftToken = await hre.ethers.getContractFactory("GiftToken");
  const contract = await GiftToken.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ Contract deployed to:", address);

  const artifact = await hre.artifacts.readArtifact("GiftToken");
  const contractInfo = { address, abi: artifact.abi };

  const outPath = process.env.DOCKER
    ? "/backend/contract_info.json"
    : path.resolve(__dirname, "../../backend/contract_info.json");

  fs.writeFileSync(outPath, JSON.stringify(contractInfo, null, 2));
  console.log("✅ contract_info.json saved!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});