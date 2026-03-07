/**
 * Script: 03_wire_contracts.ts
 * Chain:  Creditcoin USC Testnet v2 (execution chain, chainId 102036)
 * Run:    npx hardhat run scripts/03_wire_contracts.ts --network ctc_usc_testnet
 *
 * Reads deployments/execution.json and wires the contracts together:
 *   - KestrelCore.setUscContract(RevenueUSC)
 *   - KestrelCore.setLenderVault(LenderVault)
 *   - KestrelCore.setRevenueEscrow(RevenueEscrow)
 *
 * Run AFTER 02_deploy_execution.ts
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

console.log("Deployer:", deployerAddr);
console.log(
  "Balance  :",
  (await publicClient.getBalance({ address: deployerAddr })) / 10n ** 18n,
  "T2CTC",
);

// ── Load deployed addresses ────────────────────────────────────────────────
const deploymentsDir = path.resolve("deployments");
const executionPath = path.join(deploymentsDir, "execution.json");
if (!fs.existsSync(executionPath)) {
  throw new Error(
    "deployments/execution.json not found — run 02_deploy_execution.ts first",
  );
}
const addrs = JSON.parse(fs.readFileSync(executionPath, "utf-8"));

console.log("\nUsing addresses:");
console.log("  KestrelCore:", addrs.KestrelCore);
console.log("  LenderVault      :", addrs.LenderVault);
console.log("  RevenueEscrow    :", addrs.RevenueEscrow);
console.log("  RevenueUSC       :", addrs.RevenueUSC);

// ── Attach to KestrelCore ────────────────────────────────────────────
const core = await viem.getContractAt("KestrelCore", addrs.KestrelCore, {
  client: { public: publicClient, wallet: deployer },
});

// ── Wire 1: set USC contract ────────────────────────────────────────────────
console.log("\n[1/3] setUscContract →", addrs.RevenueUSC);
const tx1 = await core.write.setUscContract([addrs.RevenueUSC]);
console.log("  ✓ tx:", tx1);

// ── Wire 2: set LenderVault ────────────────────────────────────────────────
console.log("\n[2/3] setLenderVault →", addrs.LenderVault);
const tx2 = await core.write.setLenderVault([addrs.LenderVault]);
console.log("  ✓ tx:", tx2);

// ── Wire 3: set RevenueEscrow ──────────────────────────────────────────────
console.log("\n[3/3] setRevenueEscrow →", addrs.RevenueEscrow);
const tx3 = await core.write.setRevenueEscrow([addrs.RevenueEscrow]);
console.log("  ✓ tx:", tx3);

// ── Waiting for transactions ──────────────────────────────────────────────
console.log("\nWaiting for confirmations...");
await Promise.all([
  publicClient.waitForTransactionReceipt({ hash: tx1 }),
  publicClient.waitForTransactionReceipt({ hash: tx2 }),
  publicClient.waitForTransactionReceipt({ hash: tx3 }),
]);

// ── Verify final state ───────────────────────────────────────────────────
const [uscSet, vaultSet, escrowSet] = await Promise.all([
  core.read.uscContract(),
  core.read.lenderVault(),
  core.read.revenueEscrow(),
]);
console.log("\n─── Final KestrelCore state ───");
console.log("  uscContract  :", uscSet);
console.log("  lenderVault  :", vaultSet);
console.log("  revenueEscrow:", escrowSet);

const allWired =
  uscSet.toLowerCase() === addrs.RevenueUSC.toLowerCase() &&
  vaultSet.toLowerCase() === addrs.LenderVault.toLowerCase() &&
  escrowSet.toLowerCase() === addrs.RevenueEscrow.toLowerCase();

if (!allWired) {
  throw new Error("❌ Wiring verification failed — check addresses");
}
console.log("\n✅ All contracts wired successfully!\n");

// ── Print .env snippet ─────────────────────────────────────────────────────
console.log("Add to your .env:");
console.log(`SPACE_REWARD_EMITTER_ADDRESS=<from deployments/source.json>`);
console.log(`CTC_USC_RPC_URL=https://rpc.usc-testnet2.creditcoin.network`);
console.log(`REVENUE_USC_ADDRESS=${addrs.RevenueUSC}`);
console.log(`HARDWARE_YIELD_CORE_ADDRESS=${addrs.KestrelCore}`);
console.log(`LENDER_VAULT_ADDRESS=${addrs.LenderVault}`);
console.log(`REVENUE_ESCROW_ADDRESS=${addrs.RevenueEscrow}`);
console.log(`WCTC_ADDRESS=${addrs.WCTC}`);
console.log(`NEXT_PUBLIC_CTC_USC_CHAIN_ID=102036`);
console.log(
  `NEXT_PUBLIC_CTC_USC_RPC=https://rpc.usc-testnet2.creditcoin.network`,
);
console.log(`NEXT_PUBLIC_HARDWARE_YIELD_CORE=${addrs.KestrelCore}`);
console.log(`NEXT_PUBLIC_LENDER_VAULT=${addrs.LenderVault}`);
console.log(`NEXT_PUBLIC_WCTC=${addrs.WCTC}`);
console.log(`NEXT_PUBLIC_CTC_TESTNET_CHAIN_ID=102031`);
console.log(
  `NEXT_PUBLIC_CTC_TESTNET_EXPLORER=https://creditcoin-testnet.blockscout.com`,
);
console.log(`NEXT_PUBLIC_SEPOLIA_CHAIN_ID=11155111`);
