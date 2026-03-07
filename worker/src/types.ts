export interface PendingReward {
  txHash: string;
  blockNumber: bigint;
  nodeWallet: string;
  amount: bigint;
  timestamp: number;
  retries: number;
  lastAttempt?: number;
}
