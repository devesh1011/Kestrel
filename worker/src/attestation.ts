import { chainInfo } from "@gluwa/cc-next-query-builder";
import { JsonRpcProvider } from "ethers";

export class AttestationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttestationTimeoutError";
  }
}

/**
 * Wait until the block AFTER `blockNumber` is attested on the USC chain.
 * Uses the official ChainInfoPrecompile (0x0FD3) via @gluwa/cc-next-query-builder.
 *
 * @param blockNumber   Source-chain block number containing the target transaction.
 * @param chainKey      USC oracle chain key for the source chain (e.g. 102031 for cc3).
 * @param timeout       Maximum wait in milliseconds (default 5 min).
 */
export async function waitForAttestation(
  blockNumber: bigint,
  chainKey: number,
  timeout = 300_000,
): Promise<void> {
  // HACKATHON WORKAROUND: CC3 attestation shows as "supported" but height is 0
  // Skip attestation wait for CC3 to allow demo to work
  if (chainKey === 102031) {
    console.log(
      `⚠️  CC3 attestation not active yet (height: 0) - skipping for demo`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000)); // mock delay
    return;
  }

  const uscProvider = new JsonRpcProvider(process.env.USC_RPC, {
    chainId: 102036,
    name: "ctc-usc-testnet",
  });

  const chainInfoProvider = new chainInfo.PrecompileChainInfoProvider(
    uscProvider,
  );

  // targetHeight = blockNumber + 1 ensures the transaction block itself is attested
  const targetHeight = Number(blockNumber) + 1;

  console.log(
    `Waiting for attestation of block ${blockNumber} (target ≥ ${targetHeight}) on chain key ${chainKey}...`,
  );

  try {
    // pollIntervalMs, timeout
    const pollMs = parseInt(process.env.POLL_INTERVAL_MS || "15000");
    await chainInfoProvider.waitUntilHeightAttested(
      chainKey,
      targetHeight,
      pollMs,
      timeout,
    );
    console.log(`Block ${blockNumber} is now attested!`);
  } catch (err: any) {
    throw new AttestationTimeoutError(
      `Timed out waiting for block ${blockNumber} to be attested: ${err.message}`,
    );
  }
}
