import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MoonTokenModule = buildModule("MoonTokenModule", (m) => {
  const initialOwner = m.getAccount(0);

  const token = m.contract("MoonToken", [initialOwner]);

  return { token };
});

export default MoonTokenModule;