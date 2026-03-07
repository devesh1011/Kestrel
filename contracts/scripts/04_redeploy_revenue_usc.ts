/**
 * Script: 04_redeploy_revenue_usc.ts
 * Chain:  Creditcoin USC Testnet v2 (execution chain, chainId 102036)
 * Run:    bunx hardhat run scripts/04_redeploy_revenue_usc.ts --network ctc_usc_testnet
 *
 * Redeploys RevenueUSC with the corrected processRewardProof ABI, then calls
 * KestrelCore.setUscContract(newRevenueUSC) to wire it in.
 *
 * Updates deployments/execution.json with the new RevenueUSC address.
 */

import { network } from "hardhat";
import { defineChain } from "viem";
import fs from "fs";
import path from "path";

const ctcUscTestnet = defineChain({
  id: 102036,
  name: "Creditcoin USC Testnet v2",
  nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.usc-testnet2.creditcoin.network"] },
  },
});

const connection = await network.connect();
const { viem } = connection;

const [deployer] = await viem.getWalletClients({ chain: ctcUscTestnet });
const publicClient = await viem.getPublicClient({ chain: ctcUscTestnet });
const deployerAddr = deployer.account.address;

console.log("─── Redeploying RevenueUSC (corrected ABI) ───");
console.log("Deployer:", deployerAddr);
console.log(
  "Balance  :",
  (await publicClient.getBalance({ address: deployerAddr })) / 10n ** 18n,
  "CTC",
);

// ── Load existing deployment addresses ────────────────────────────────────
const deploymentsDir = path.resolve("deployments");
const executionPath = path.join(deploymentsDir, "execution.json");
if (!fs.existsSync(executionPath)) {
  throw new Error(
    "deployments/execution.json not found — run 02_deploy_execution.ts first",
  );
}
const addrs = JSON.parse(fs.readFileSync(executionPath, "utf-8"));
const coreAddress = addrs.HardwareYieldCore as `0x${string}`;
const oracleWorker = (addrs.oracleWorker ?? deployerAddr) as `0x${string}`;

console.log("\nExisting KestrelCore  :", coreAddress);
console.log("Oracle worker EOA     :", oracleWorker);

// ── Deploy new RevenueUSC ─────────────────────────────────────────────────
console.log("\n[1/2] Deploying new RevenueUSC...");
const newUsc = await viem.deployContract(
  "RevenueUSC",
  [coreAddress, oracleWorker],
  { client: { public: publicClient, wallet: deployer } },
);
console.log("New RevenueUSC deployed →", newUsc.address);

// ── Wire: KestrelCore.setUscContract(newUsc) ──────────────────────────────
console.log("\n[2/2] Calling KestrelCore.setUscContract...");
const coreAbi = [
  {
    inputs: [
      { internalType: "address", name: "_uscContract", type: "address" },
    ],
    name: "setUscContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const coreContract = await viem.getContractAt(
  "HardwareYieldCore",
  coreAddress,
  {
    client: { public: publicClient, wallet: deployer },
  },
);
const tx = await coreContract.write.setUscContract([newUsc.address]);
console.log("setUscContract tx:", tx);

// Wait for confirmation
await publicClient.waitForTransactionReceipt({ hash: tx });
console.log("KestrelCore.uscContract updated ✓");

// ── Persist updated addresses ─────────────────────────────────────────────
addrs.RevenueUSC = newUsc.address;
addrs.deployedAt = new Date().toISOString();
fs.writeFileSync(executionPath, JSON.stringify(addrs, null, 2));
console.log(
  "\ndeployments/execution.json updated with new RevenueUSC address.",
);

console.log("\n════════════════════════════════════════════════════════════");
console.log(
  "IMPORTANT: Update these env vars with the new RevenueUSC address:",
);
console.log(`  worker/.env          →  REVENUE_USC=${newUsc.address}`);
console.log(
  `  frontend/.env.local  →  NEXT_PUBLIC_REVENUE_USC=${newUsc.address}`,
);
console.log("════════════════════════════════════════════════════════════\n");
