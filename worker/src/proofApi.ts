import axios from "axios";
import type { UscProofResponse } from "./types.js";

export class ProofNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProofNotReadyError";
  }
}

export async function fetchProof(
  txHash: string,
  sourceChainId: number,
): Promise<UscProofResponse> {
  const apiUrl = process.env.USC_PROOF_API_URL;

  if (!apiUrl) {
    throw new Error("USC_PROOF_API_URL not set in environment");
  }

  try {
    // Note: Request format based on USC Tutorial 4 conventions
    // Endpoint is typically /api/proof or /proof
    const response = await axios.get(`${apiUrl}/api/proof`, {
      params: {
        hash: txHash,
        chainId: sourceChainId,
      },
    });

    if (
      response.status === 202 ||
      (response.data && response.data.status === "pending")
    ) {
      throw new ProofNotReadyError(
        "Proof is still being generated or block not yet attested",
      );
    }

    if (response.status !== 200 || !response.data) {
      throw new Error(`Failed to fetch proof: ${response.statusText}`);
    }

    // Map API response to our Solidity-compatible types
    // Based on MerkleProofEntry { hash, isLeft } and ContinuityProof { blockDigests, checkpointHeight }
    const { txData, merkleProof, continuityProof } = response.data;

    return {
      txData: {
        chainId: txData.chainId,
        blockNumber: txData.blockNumber,
        txIndex: txData.txIndex,
        txData: txData.txData,
      },
      merkleProof: merkleProof.map((p: any) => ({
        hash: p.hash,
        isLeft: p.isLeft,
      })),
      continuityProof: {
        blockDigests: continuityProof.blockDigests,
        checkpointHeight: continuityProof.checkpointHeight,
      },
    };
  } catch (error: any) {
    if (error instanceof ProofNotReadyError) {
      throw error;
    }
    if (
      error.response &&
      (error.response.status === 404 || error.response.status === 202)
    ) {
      throw new ProofNotReadyError("Proof not found or not ready yet");
    }
    throw new Error(`Error fetching proof from API: ${error.message}`);
  }
}
