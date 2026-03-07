import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import type { PendingReward } from "./types.js";
import type { ProofData } from "./proofApi.js";

// ABI matching the redeployed RevenueUSC.processRewardProof signature
const REVENUE_USC_ABI = [
  // (chainKey, blockHeight, encodedTransaction, merkleRoot, siblings[], lowerEndpointDigest, continuityRoots[], nodeWallet, amount, timestamp)
  "function processRewardProof(uint64 chainKey, uint64 blockHeight, bytes encodedTransaction, bytes32 merkleRoot, tuple(bytes32 hash, bool isLeft)[] siblings, bytes32 lowerEndpointDigest, bytes32[] continuityRoots, address nodeWallet, uint256 amount, uint256 timestamp) external",
  // Demo mode: (nodeWallet, amount, timestamp)
  "function recordRewardForDemo(address nodeWallet, uint256 amount, uint256 timestamp) external",
  "function processedQueries(bytes32 queryHash) external view returns (bool)",
];

export async function submitProof(
  reward: PendingReward,
  proof: ProofData,
): Promise<string> {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const uscRpc = process.env.USC_RPC;
  const revenueUscAddress = process.env.REVENUE_USC;

  if (!privateKey || !uscRpc || !revenueUscAddress) {
    throw new Error("Environment variables for USC submission not set");
  }

  const uscProvider = new JsonRpcProvider(uscRpc, {
    chainId: 102036,
    name: "ctc-usc-testnet",
  });
  const wallet = new Wallet(privateKey, uscProvider);
  const revenueUsc = new Contract(revenueUscAddress, REVENUE_USC_ABI, wallet);

  // HACKATHON WORKAROUND: CC3 proofs are mocked, so contract verification will fail
  // Use demo mode that skips verification and records the reward directly
  if (proof.chainKey === 102031) {
    console.log(
      `⚠️  CC3 proof verification not available yet - using demo mode to record reward of ${reward.amount} CTC`,
    );
    console.log(
      `   Calling RevenueUSC.recordRewardForDemo: wallet=${reward.nodeWallet}, amount=${reward.amount}, timestamp=${reward.timestamp}`,
    );

    const tx = await (revenueUsc as any).recordRewardForDemo(
      reward.nodeWallet,
      reward.amount,
      reward.timestamp,
    );

    console.log(`Demo transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();

    if (receipt.status === 0) {
      throw new Error("Demo transaction execution failed");
    }

    console.log(`Demo transaction confirmed in block ${receipt.blockNumber}`);
    return tx.hash;
  }

  // Replay protection: keccak256(encodedTransaction)
  const txBytesHex = ethers.hexlify(proof.txBytes);
  const queryHash = ethers.keccak256(txBytesHex);
  const alreadyProcessed = await (revenueUsc as any).processedQueries(
    queryHash,
  );

  if (alreadyProcessed) {
    console.log(
      `Query ${queryHash} already processed, skipping tx submission.`,
    );
    return "ALREADY_PROCESSED";
  }

  console.log(
    `Submitting proof to RevenueUSC for reward of ${reward.amount} CTC...`,
    `Chain key=${proof.chainKey}, height=${proof.headerNumber}`,
  );

  const tx = await (revenueUsc as any).processRewardProof(
    proof.chainKey, // uint64 chainKey
    proof.headerNumber, // uint64 blockHeight
    txBytesHex, // bytes encodedTransaction
    proof.merkleProof.root, // bytes32 merkleRoot
    proof.merkleProof.siblings, // tuple(bytes32,bool)[] siblings
    proof.continuityProof.lowerEndpointDigest, // bytes32 lowerEndpointDigest
    proof.continuityProof.roots, // bytes32[] continuityRoots
    reward.nodeWallet, // address nodeWallet
    reward.amount, // uint256 amount
    reward.timestamp, // uint256 timestamp
  );

  console.log(`Transaction submitted: ${tx.hash}`);
  const receipt = await tx.wait();

  if (receipt.status === 0) {
    throw new Error("Transaction execution failed");
  }

  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  return tx.hash;
}
