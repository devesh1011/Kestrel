/**
 * Script: 01_deploy_source.ts
 * Chain:  Creditcoin cc3 Testnet (source chain, chainId 102031)
 *         If cc3 attestation on USC Testnet v2 is broken, use --network sepolia instead.
 * Run:    npx hardhat run scripts/01_deploy_source.ts --network ctc_testnet
 *
 * Deploys SpaceRewardEmitter and writes its address to deployments/source.json
 */

import { network } from "hardhat";
import { defineChain } from "viem";
import fs from "fs";
import path from "path";

const ctcTestnet = defineChain({
  id: 102031,
  name: "Creditcoin Testnet",
  nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] },
  },
});

const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.ankr.com/eth_sepolia"] },
  },
});

const connection = await network.connect();
const { viem } = connection;

const chain = network.name === "sepolia" ? sepolia : ctcTestnet;

const publicClient = await viem.getPublicClient({ chain });
const [deployer] = await viem.getWalletClients({ chain });

console.log(`─── Deploying SpaceRewardEmitter to ${chain.name} ───`);
console.log("Deployer:", deployer.account.address);
console.log(
  "Balance  :",
  (await publicClient.getBalance({ address: deployer.account.address })) /
    10n ** 18n,
  "CTC/ETH",
);

// Pass address(0) as rewardToken → event-only mode (no ERC-20 transfer).
// The emitted RewardClaimed event is all USC needs to generate a proof.
const emitter = await viem.deployContract(
  "SpaceRewardEmitter",
  ["0x0000000000000000000000000000000000000000"],
  { client: { public: publicClient, wallet: deployer } },
);
console.log("SpaceRewardEmitter deployed →", emitter.address);

// ── Persist deployment info ────────────────────────────────────────────────
const deploymentsDir = path.resolve("deployments");
if (!fs.existsSync(deploymentsDir))
  fs.mkdirSync(deploymentsDir, { recursive: true });

const output = {
  network: "ctc_testnet",
  chainId: 102031,
  SpaceRewardEmitter: emitter.address,
  deployedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(deploymentsDir, "source.json"),
  JSON.stringify(output, null, 2),
);
console.log("\nAddresses saved to deployments/source.json");
console.log(JSON.stringify(output, null, 2));
