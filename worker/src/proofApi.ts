import { proofGenerator } from "@gluwa/cc-next-query-builder";

export type ProofData = proofGenerator.ContinuityResponse;

export class ProofNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProofNotReadyError";
  }
}

/**
 * Fetch an inclusion proof for `txHash` from the USC Proof Generation API.
 * Uses @gluwa/cc-next-query-builder's ProverAPIProofGenerator, which targets
 * the correct endpoint format and returns typed ContinuityResponse proof data.
 *
 * @param txHash   Transaction hash on the source chain.
 * @param chainKey USC oracle chain key for the source chain.
 */
export async function fetchProof(
  txHash: string,
  chainKey: number,
): Promise<ProofData> {
  // HACKATHON WORKAROUND: CC3 attestation not active, so proof generation will fail
  // Return mock proof data for demo purposes
  if (chainKey === 102031) {
    console.log(
      `⚠️  CC3 proof generation not available yet - using mock proof for demo`,
    );
    return {
      chainKey: 102031,
      headerNumber: 4388483, // Use the block number from the reward
      txBytes: "0x" + "00".repeat(200), // Mock transaction bytes
      merkleProof: {
        root: "0x" + "11".repeat(32),
        siblings: [
          { hash: "0x" + "22".repeat(32), isLeft: true },
          { hash: "0x" + "33".repeat(32), isLeft: false },
        ],
      },
      continuityProof: {
        lowerEndpointDigest: "0x" + "44".repeat(32),
        roots: ["0x" + "55".repeat(32), "0x" + "66".repeat(32)],
      },
    } as ProofData;
  }

  const apiUrl = process.env.USC_PROOF_API_URL;

  if (!apiUrl) {
    throw new Error("USC_PROOF_API_URL not set in environment");
  }

  const gen = new proofGenerator.api.ProverAPIProofGenerator(chainKey, apiUrl);

  try {
    const result = await gen.generateProof(txHash);

    if (!result.success || !result.data) {
      // Treat "not ready" responses as retriable errors
      const msg = result.error ?? "Proof generation failed";
      if (
        msg.toLowerCase().includes("not ready") ||
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("block not ready")
      ) {
        throw new ProofNotReadyError(msg);
      }
      throw new Error(msg);
    }

    return result.data;
  } catch (err: any) {
    if (err instanceof ProofNotReadyError) throw err;
    // Rethrow with context
    throw new Error(`fetchProof failed for ${txHash}: ${err.message}`);
  }
}
