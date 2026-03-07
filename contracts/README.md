# Kestrel Contracts

**Kestrel** is a DePIN-native micro-lending protocol on Creditcoin that turns verifiable on-chain reward history into creditworthiness. Node operators borrow CTC against their proven rewards without posting collateral. Lenders earn yield from loan interest in an ERC-4626 vault.

This folder contains the Solidity smart contracts, deployment scripts, and configuration for Kestrel.

## Architecture

Kestrel spans two Creditcoin networks:

- **Source Chain**: Creditcoin Testnet cc3 (Chain ID 102031) — where Spacecoin reward events originate
- **Execution Chain**: Creditcoin USC Testnet v2 (Chain ID 102036) — where lending contracts live and USC precompile verifies cross-chain proofs

```
Source Chain (cc3)                    Execution Chain (USC v2)
┌────────────────────┐                    ┌─────────────────────┐
│ SpaceRewardEmitter │ ── RewardClaimed ──► │ RevenueUSC        │
│ (0x372...)         │                    │ (0x111...)          │
└────────────────────┘                    └─────────────────────┘
                                              │
                                              ▼
                                       ┌─────────────────────┐
                                       │ HardwareYieldCore   │
                                       │ (0x7daf...)         │
                                       └─────────────────────┘
                                              │
                                              ▼
                                       ┌─────────────────────┐
                                       │ LenderVault         │
                                       │ (0x6d88...)         │
                                       └─────────────────────┘
                                              │
                                              ▼
                                       ┌─────────────────────┐
                                       │ RevenueEscrow       │
                                       │ (0x39e8...)         │
                                       └─────────────────────┘
```

## Contracts

### Source Chain Contracts

#### SpaceRewardEmitter.sol

- **Chain**: Creditcoin Testnet cc3 (102031)
- **Address**: `0x372bd93f70dfd866e17a17aba51e47eebeb4859e`
- **Purpose**: Emits `RewardClaimed(address indexed nodeWallet, uint256 amount, uint256 timestamp)` events when node operators claim Spacecoin rewards
- **Role**: Source of verifiable reward history for credit underwriting

### Execution Chain Contracts

#### WCTC.sol

- **Chain**: Creditcoin USC Testnet v2 (102036)
- **Address**: `0x978524ae39575aaf308330466d29419a2affeef6`
- **Purpose**: ERC-20 wrapper for native CTC token (1:1 peg)
- **Role**: Underlying asset for the ERC-4626 vault

#### HardwareYieldCore.sol

- **Chain**: Creditcoin USC Testnet v2 (102036)
- **Address**: `0x7daf425b9428ee97c1e52b094e2db42637265d73`
- **Purpose**: Core lending logic — credit scoring, loan origination, repayment tracking
- **Key Functions**:
  - `getScore(wallet)`: Returns max loan amount based on 90-day reward history
  - `applyForLoan(amount, escrowBps)`: Creates loan with auto-repayment commitment
  - `recordVerifiedReward(wallet, amount, timestamp)`: Updates credit history (called by RevenueUSC)

#### LenderVault.sol

- **Chain**: Creditcoin USC Testnet v2 (102036)
- **Address**: `0x6d8807ae9e75ca4307df6e9d0b40bacadb5f7fca`
- **Purpose**: ERC-4626 vault for lenders — deposit WCTC, earn yield from loan interest
- **Key Functions**:
  - `deposit(amount, lender)`: Mint hvWCTC shares
  - `withdraw(assets, receiver, owner)`: Burn shares for WCTC + yield
  - `disburseLoan(borrower, amount)`: Only callable by HardwareYieldCore

#### RevenueEscrow.sol

- **Chain**: Creditcoin USC Testnet v2 (102036)
- **Address**: `0x39e86627b3438d141ba581581ae79416495eac80`
- **Purpose**: Manages auto-repayment — redirects portion of future rewards to vault
- **Key Functions**:
  - `redirectReward(escrowId, amount)`: Splits reward (commitBps% to vault, rest to borrower)
  - `liquidateEscrow(escrowId)`: 100% redirect on default

#### RevenueUSC.sol

- **Chain**: Creditcoin USC Testnet v2 (102036)
- **Address**: `0x111ea01f8ffc0d9d2ba88578a45d762672db255a`
- **Purpose**: USC cross-chain proof verification and reward recording
- **Key Functions**:
  - `processRewardProof(txData, merkleProof, continuityProof)`: Verifies proof via 0x0FD2 precompile, calls HardwareYieldCore.recordVerifiedReward

## Deployment

All deployments use Bun as the package manager. Scripts are in TypeScript with Hardhat + ethers v6.

### Prerequisites

```bash
# Install dependencies
bun install

# Set environment variables in .env
DEPLOYER_PRIVATE_KEY=<your-private-key>
SEPOLIA_RPC_URL=<alchemy-or-infura-url>
CTC_TESTNET_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CTC_USC_RPC_URL=https://rpc.usc-testnet2.creditcoin.network
```

### Deploy Sequence

1. **Deploy Source Contract** (Sepolia or cc3):

   ```bash
   bunx hardhat run scripts/01_deploy_source.ts --network sepolia
   # or
   bunx hardhat run scripts/01_deploy_source.ts --network ctc_testnet
   ```

2. **Deploy Execution Contracts** (USC Testnet v2):

   ```bash
   bunx hardhat run scripts/02_deploy_execution.ts --network ctc_usc_testnet
   ```

3. **Wire Contracts** (set cross-contract addresses):
   ```bash
   bunx hardhat run scripts/03_wire_contracts.ts --network ctc_usc_testnet
   ```

### Network Configuration

Networks are defined in [hardhat.config.ts](hardhat.config.ts):

- `sepolia`: Sepolia testnet (source chain)
- `ctc_testnet`: Creditcoin Testnet cc3 (source chain, wallet funding)
- `ctc_usc_testnet`: Creditcoin USC Testnet v2 (execution chain)

## Testing

Run tests with:

```bash
bunx hardhat test
```

Tests use Foundry-compatible Solidity unit tests and Node.js native test runner with viem for integration tests.

## Development
