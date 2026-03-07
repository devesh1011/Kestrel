/**
 * Script: 02_deploy_execution.ts
 * Chain:  Creditcoin USC Testnet v2 (execution chain, chainId 102036)
 * Run:    npx hardhat run scripts/02_deploy_execution.ts --network ctc_usc_testnet
 *
 * Deploys execution-chain contracts in order:
 *   1. WCTC                  (no deps)
 *   2. KestrelCore     (deployer address as temp placeholders → wired in script 03)
 *   3. LenderVault           (WCTC + KestrelCore)
 *   4. RevenueEscrow         (KestrelCore + LenderVault + WCTC)
 *   5. RevenueUSC            (KestrelCore + deployer as oracle worker)
 *
 * Writes deployed addresses to deployments/execution.json
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

console.log(
  "─── Deploying execution-chain contracts to Creditcoin USC Testnet v2 ───",
);
console.log("Deployer:", deployerAddr);
console.log(
  "Balance  :",
  (await publicClient.getBalance({ address: deployerAddr })) / 10n ** 18n,
  "CTC",
);

// ── 1. WCTC ────────────────────────────────────────────────────────────────
console.log("\n[1/5] Deploying WCTC...");
const wctc = await viem.deployContract("WCTC", [], {
  client: { public: publicClient, wallet: deployer },
});
console.log("WCTC deployed →", wctc.address);

// ── 2. KestrelCore (temp placeholders — wired in 03) ────────────────
// All three dependencies are circular: deploy with deployer address as placeholder
// then set the real addresses via setters in 03_wire_contracts.ts
console.log("\n[2/5] Deploying KestrelCore (with temp placeholders)...");
const core = await viem.deployContract(
  "KestrelCore",
  [
    deployerAddr, // uscContract   — replaced in 03
    deployerAddr, // lenderVault   — replaced in 03
    deployerAddr, // revenueEscrow — replaced in 03
  ],
  { client: { public: publicClient, wallet: deployer } },
);
console.log("KestrelCore deployed →", core.address);

// ── 3. LenderVault ────────────────────────────────────────────────────────
console.log("\n[3/5] Deploying LenderVault...");
const vault = await viem.deployContract(
  "LenderVault",
  [wctc.address, core.address],
  { client: { public: publicClient, wallet: deployer } },
);
console.log("LenderVault deployed →", vault.address);

// ── 4. RevenueEscrow ──────────────────────────────────────────────────────
console.log("\n[4/5] Deploying RevenueEscrow...");
const escrow = await viem.deployContract(
  "RevenueEscrow",
  [core.address, vault.address, wctc.address],
  { client: { public: publicClient, wallet: deployer } },
);
console.log("RevenueEscrow deployed →", escrow.address);

// ── 5. RevenueUSC ─────────────────────────────────────────────────────────
console.log("\n[5/5] Deploying RevenueUSC...");
const uscContract = await viem.deployContract(
  "RevenueUSC",
  [
    core.address,
    deployerAddr, // oracleWorker = deployer for now; replace with real worker EOA
  ],
  { client: { public: publicClient, wallet: deployer } },
);
console.log("RevenueUSC deployed →", uscContract.address);

// ── Persist ───────────────────────────────────────────────────────────────
const deploymentsDir = path.resolve("deployments");
if (!fs.existsSync(deploymentsDir))
  fs.mkdirSync(deploymentsDir, { recursive: true });

const output = {
  network: "ctc_usc_testnet",
  chainId: 102036,
  WCTC: wctc.address,
  KestrelCore: core.address,
  LenderVault: vault.address,
  RevenueEscrow: escrow.address,
  RevenueUSC: uscContract.address,
  oracleWorker: deployerAddr,
  deployedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(deploymentsDir, "execution.json"),
  JSON.stringify(output, null, 2),
);
console.log("\nAddresses saved to deployments/execution.json");
console.log(JSON.stringify(output, null, 2));
console.log(
  "\nNext step: npx hardhat run scripts/03_wire_contracts.ts --network ctc_usc_testnet",
);
