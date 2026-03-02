import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import type { PendingReward, UscProofResponse } from "./types.js";

const REVENUE_USC_ABI = [
  "function processRewardProof((uint256 chainId, uint256 blockNumber, uint256 txIndex, bytes txData) txData, address nodeWallet, uint256 amount, uint256 timestamp, (bytes32 hash, bool isLeft)[] merkleProof, (bytes32[] blockDigests, uint256 checkpointHeight) continuityProof) external",
  "function processedQueries(bytes32 queryHash) external view returns (bool)",
];

export async function submitProof(
  reward: PendingReward,
  proof: UscProofResponse,
): Promise<string> {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const uscRpc = process.env.USC_RPC;
  const revenueUscAddress = process.env.REVENUE_USC;

  if (!privateKey || !uscRpc || !revenueUscAddress) {
    throw new Error("Environment variables for USC submission not set");
  }

  const uscProvider = new JsonRpcProvider(uscRpc, 102036);
  const wallet = new Wallet(privateKey, uscProvider);
  const revenueUsc = new Contract(revenueUscAddress, REVENUE_USC_ABI, wallet);

  // Check if this query has already been processed to avoid replay
  const queryHash = ethers.keccak256(proof.txData.txData);
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
  );

  const tx = await (revenueUsc as any).processRewardProof(
    {
      chainId: proof.txData.chainId,
      blockNumber: proof.txData.blockNumber,
      txIndex: proof.txData.txIndex,
      txData: proof.txData.txData,
    },
    reward.nodeWallet,
    reward.amount,
    reward.timestamp,
    proof.merkleProof.map((p) => ({ hash: p.hash, isLeft: p.isLeft })),
    {
      blockDigests: proof.continuityProof.blockDigests,
      checkpointHeight: proof.continuityProof.checkpointHeight,
    },
  );

  console.log(`Transaction submitted: ${tx.hash}`);
  const receipt = await tx.wait();

  if (receipt.status === 0) {
    throw new Error("Transaction execution failed");
  }

  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  return tx.hash;
}
