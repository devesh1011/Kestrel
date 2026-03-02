import "dotenv/config";
import { WebSocketProvider, JsonRpcProvider, Contract, ethers } from "ethers";
import type { PendingReward } from "./types.js";
import { waitForAttestation } from "./attestation.js";
import { fetchProof, ProofNotReadyError } from "./proofApi.js";
import { submitProof } from "./uscCaller.js";
import fs from "fs";
import path from "path";

const QUEUE_FILE = path.join(process.cwd(), ".queue.json");

const REWARD_EMITTER_ABI = [
  "event RewardClaimed(address indexed nodeWallet, uint256 amount, uint256 timestamp)",
];

let rewardQueue: PendingReward[] = [];

// Persistence
function loadQueue() {
  if (fs.existsSync(QUEUE_FILE)) {
    try {
      rewardQueue = JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8"));
      console.log(`Loaded ${rewardQueue.length} items from queue file.`);
    } catch (e) {
      console.error("Failed to load queue file:", e);
    }
  }
}

function saveQueue() {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(rewardQueue, null, 2));
}

async function startWorker() {
  const cc3Wss = process.env.CC3_WSS_RPC;
  const cc3Https = process.env.CC3_HTTPS_RPC;
  const emitterAddress = process.env.SPACE_REWARD_EMITTER;
  const sourceChainId = parseInt(process.env.SOURCE_CHAIN_ID || "102031");

  if (!cc3Wss || !cc3Https || !emitterAddress) {
    throw new Error("Environment variables for CC3 not set");
  }

  loadQueue();

  const cc3Provider = new WebSocketProvider(cc3Wss);
  const cc3HttpsProvider = new JsonRpcProvider(cc3Https);
  const rewardEmitter = new Contract(
    emitterAddress,
    REWARD_EMITTER_ABI,
    cc3Provider,
  );

  console.log(
    `Worker listening for RewardClaimed events on CC3 @ ${emitterAddress}...`,
  );

  rewardEmitter.on(
    "RewardClaimed",
    async (nodeWallet, amount, timestamp, event) => {
      const txHash = event.log.transactionHash;
      const blockNumber = event.log.blockNumber;

      console.log(
        `Detected RewardClaimed for ${nodeWallet}: ${amount} CTC at block ${blockNumber}`,
      );

      const newReward: PendingReward = {
        txHash,
        blockNumber,
        nodeWallet,
        amount,
        timestamp: Number(timestamp),
        retries: 0,
      };

      rewardQueue.push(newReward);
      saveQueue();
      processQueue();
    },
  );

  // Main loop to periodically process the queue
  const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || "15000");
  setInterval(processQueue, pollInterval);
}

let isProcessing = false;
async function processQueue() {
  if (isProcessing || rewardQueue.length === 0) return;
  isProcessing = true;

  const sourceChainId = parseInt(process.env.SOURCE_CHAIN_ID || "102031");

  for (let i = 0; i < rewardQueue.length; i++) {
    const reward = rewardQueue[i];
    if (!reward) continue;

    // Simple manual retry backoff: 2^retries * 5s
    const backoff = Math.pow(2, reward.retries) * 5000;
    if (reward.lastAttempt && Date.now() - reward.lastAttempt < backoff) {
      continue;
    }

    try {
      console.log(`Processing reward: ${reward.txHash}...`);

      // Step 1: Wait for block attestation
      await waitForAttestation(reward.blockNumber, sourceChainId);

      // Step 2: Fetch proof from API
      const proof = await fetchProof(reward.txHash, sourceChainId);

      // Step 3: Submit proof to USC
      await submitProof(reward, proof);

      // Success: Remove from queue
      rewardQueue.splice(i, 1);
      i--;
      saveQueue();
      console.log(`Success! Reward ${reward.txHash} fully processed.`);
    } catch (error: any) {
      reward.retries++;
      reward.lastAttempt = Date.now();

      if (error instanceof ProofNotReadyError) {
        console.log(`Proof not ready for ${reward.txHash}, will retry...`);
      } else {
        console.error(
          `Error processing reward ${reward.txHash}: ${error.message}`,
        );
        if (reward.retries >= 3) {
          console.error(
            `Max retries (3) exceeded for ${reward.txHash}. Removing from queue.`,
          );
          rewardQueue.splice(i, 1);
          i--;
          saveQueue();
        }
      }
    }
  }

  isProcessing = false;
}

startWorker().catch(console.error);

// Clean shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  saveQueue();
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("Shutting down...");
  saveQueue();
  process.exit(0);
});
