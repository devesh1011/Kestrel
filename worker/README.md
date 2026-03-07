# Kestrel Oracle Worker

The **Kestrel Oracle Worker** is an off-chain service that bridges DePIN reward events from Creditcoin cc3 to the lending protocol on USC Testnet v2. It listens for `RewardClaimed` events, fetches cryptographic proofs, and submits them to enable revenue-based credit scoring.

This worker enables Kestrel's core innovation: turning verifiable on-chain income into borrowable capital without collateral.

## Architecture

The worker operates as a relay between two chains:

```
Creditcoin cc3 (102031)              USC Proof API                                Creditcoin USC v2 (102036)
┌─────────────────────┐                      ┌─────────────┐                       ┌─────────────────────┐
│ SpaceRewardEmitter  │ ── RewardClaimed ──► │ Fetch Proof │ ── Proof Response ──► │ RevenueUSC          │
│ emits events        │                      │ /api/proof  │                       │ processRewardProof  │
└─────────────────────┘                      └─────────────┘                       └─────────────────────┘
                                                                                              │
                                                                                              ▼
                                                                                  ┌─────────────────────┐
                                                                                  │ HardwareYieldCore   │
                                                                                  │ recordVerifiedReward│
                                                                                  └─────────────────────┘
```

**Process Flow:**

1. **Listen**: WebSocket subscription to cc3 for `RewardClaimed` events
2. **Attest**: Poll USC Testnet v2 until the cc3 block is attested
3. **Fetch**: Request Merkle + continuity proof from USC Proof API
4. **Submit**: Call `RevenueUSC.processRewardProof()` on USC Testnet v2
5. **Verify**: USC precompile `0x0FD2` validates proof synchronously
6. **Record**: `HardwareYieldCore.recordVerifiedReward()` updates borrower's credit score

## Files

### types.ts

Defines TypeScript interfaces for proof data structures:

- `PendingReward`: Queue item with txHash, blockNumber, nodeWallet, amount, retries
- `MerkleProofEntry`: { hash: string, isLeft: boolean }
- `ContinuityProof`: { blockDigests: string[], checkpointHeight: number }
- `TxData`: { chainId, blockNumber, txIndex, txData: string }
- `UscProofResponse`: { txData: TxData, merkleProof: MerkleProofEntry[], continuityProof: ContinuityProof }

### proofApi.ts

Handles proof fetching from the USC Proof API:

- `fetchProof(txHash, sourceChainId)`: GET request to `${USC_PROOF_API_URL}/api/proof`
- Returns `UscProofResponse` or throws `ProofNotReadyError` (202/404)
- Exponential backoff retry logic (up to 3 attempts)

### attestation.ts

Manages cross-chain attestation polling:

- `waitForAttestation(blockNumber, sourceChainId, timeout)`: Polls `getLatestAttestedHeightAndHash(sourceChainId)` every 15 seconds
- Uses ethers.js JsonRpcProvider connected to USC Testnet v2
- Times out after 5 minutes if attestation doesn't complete

### uscCaller.ts

Handles proof submission to USC Testnet v2:

- `submitProof(reward, proof)`: Calls `RevenueUSC.processRewardProof()` with full proof data
- Pre-flight check: `processedQueries[keccak256(txData)]` to prevent replays
- Returns USC Testnet v2 transaction hash or `"ALREADY_PROCESSED"`
- Only callable by the oracle worker EOA (access control enforced on-chain)

### index.ts

Main orchestration loop:

- WebSocket listener for `RewardClaimed` events on cc3
- Queue-based processing with persistence to `.queue.json`
- Exponential backoff: 2^retries × 5 seconds (max 3 retries)
- Graceful shutdown: SIGINT/SIGTERM handlers save queue state
- Runs continuously with 15-second polling intervals

## Running

### Prerequisites

```bash
# Install dependencies
bun install

# Set environment variables in .env
DEPLOYER_PRIVATE_KEY=<oracle-worker-private-key-hex>
CTC_TESTNET_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CTC_USC_RPC_URL=https://rpc.usc-testnet2.creditcoin.network
USC_PROOF_API_URL=<usc-proof-api-endpoint>
USC_PROOF_API_KEY=<api-key-if-required>
REVENUE_USC_ADDRESS=0x111ea01f8ffc0d9d2ba88578a45d762672db255a
```

### Start the Worker

```bash
bun run src/index.ts
```

The worker will:

- Connect to cc3 WebSocket for event listening
- Load any pending rewards from `.queue.json` on startup
- Process rewards continuously
- Save queue state on shutdown

### Monitoring

- **Logs**: Structured output for each proof submission attempt
- **Queue**: `.queue.json` persists across restarts
- **Health**: Worker stays alive indefinitely; monitor for attestation timeouts or API failures
