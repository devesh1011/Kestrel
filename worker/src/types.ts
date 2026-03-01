export interface PendingReward {
  txHash: string;
  blockNumber: number;
  nodeWallet: string;
  amount: bigint;
  timestamp: number;
  retries: number;
  lastAttempt?: number;
}

export interface MerkleProofEntry {
  hash: string;
  isLeft: boolean;
}

export interface ContinuityProof {
  blockDigests: string[];
  checkpointHeight: number;
}

export interface TxData {
  chainId: number;
  blockNumber: number;
  txIndex: number;
  txData: string;
}

export interface UscProofResponse {
  txData: TxData;
  merkleProof: MerkleProofEntry[];
  continuityProof: ContinuityProof;
}
