import { network } from "hardhat";
import { parseEther } from "viem";

async function main() {
  const client = await network.connect();
  const [deployer] = await client.viem.getWalletClients();
  const deployerAddress = deployer.account.address;

  console.log("Deploying with account:", deployerAddress);

  const token = await client.viem.deployContract("MoonToken", [deployerAddress]);

  console.log("MoonToken deployed to:", token.address);

  await token.write.mint([deployerAddress, parseEther("1000000")]);
  console.log("Minted 1,000,000 tokens to:", deployerAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});