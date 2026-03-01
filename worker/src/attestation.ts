import { ethers, JsonRpcProvider, Contract } from "ethers";

const VERIFIER_ADDRESS = "0x0000000000000000000000000000000000000FD2";
const VERIFIER_ABI = [
  "function getLatestAttestedHeightAndHash(uint256 chainId) external view returns (uint256, bytes32)",
];

export class AttestationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttestationTimeoutError";
  }
}

export async function waitForAttestation(
  blockNumber: number,
  sourceChainId: number,
  timeout = 300_000,
): Promise<void> {
  const uscProvider = new JsonRpcProvider(process.env.USC_RPC, {
    chainId: 102036,
    name: "ctc-usc-testnet",
  });

  const verifier = new Contract(VERIFIER_ADDRESS, VERIFIER_ABI, uscProvider);
  const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || "15000");
  const startTime = Date.now();

  console.log(
    `Waiting for attestation of block ${blockNumber} on chain ${sourceChainId}...`,
  );

  while (Date.now() - startTime < timeout) {
    try {
      const [attestedHeight, _] = await (
        verifier as any
      ).getLatestAttestedHeightAndHash(sourceChainId);

      console.log(`Latest attested height: ${attestedHeight}`);

      if (Number(attestedHeight) >= blockNumber) {
        console.log(`Block ${blockNumber} is now attested!`);
        return;
      }
    } catch (error: any) {
      console.warn(`Error checking attestation status: ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new AttestationTimeoutError(
    `Timed out waiting for block ${blockNumber} to be attested after ${timeout}ms`,
  );
}
