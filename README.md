[Kestrel Whitepaper](https://docs.google.com/document/d/1TAmbt-S9jq73q0T8HjvtkdbUEtXkb8w1XIk1hA2GUaY/edit?usp=share_link) <br>
[Kestrel Demo & Pitch](https://youtu.be/YG4YD8keyj8)
# Kestrel — DePIN Revenue-Backed Micro-Lending on Creditcoin

**Kestrel** is a micro-lending protocol that turns verifiable DePIN hardware rewards into on-chain creditworthiness. Node operators borrow CTC against their proven reward history without posting collateral. Lenders earn yield from loan interest in an ERC-4626 vault.

## How It Works

1. **Node operators claim rewards** on Creditcoin cc3 → `RewardClaimed` event emitted
2. **Oracle worker detects event** → fetches cryptographic proof from USC Proof API
3. **Proof submitted to USC Testnet v2** → precompile verifies Merkle + continuity proof
4. **Credit score updated** → borrower can access loans up to 50% of 90-day average rewards
5. **Auto-repayment** → future rewards redirect committed percentage to lenders

## Architecture

Kestrel spans two Creditcoin networks:

```
Source Chain (cc3)                    Execution Chain (USC v2)
┌─────────────────┐                         ┌─────────────────────┐
│ SpaceRewardEmitter │ ── RewardClaimed ──► │ RevenueUSC          │
│ (0x372...)       │                        │ (0x111...)          │
└─────────────────┘                         └─────────────────────┘
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

### Deployed Contracts (Live on Testnet)

| Contract           | Chain           | Address                                      |
| ------------------ | --------------- | -------------------------------------------- |
| SpaceRewardEmitter | cc3 (102031)    | `0x372bd93f70dfd866e17a17aba51e47eebeb4859e` |
| WCTC               | USC v2 (102036) | `0x8e167dca9b9268ba65967b26cdb8b14edf6a26d7` |
| HardwareYieldCore  | USC v2 (102036) | `0xe355455aa417541931b982089e5e0601fad5b8a3` |
| LenderVault        | USC v2 (102036) | `0x565bc1511e39f55c4f328fe3ea1b920291b8001d` |
| RevenueEscrow      | USC v2 (102036) | `0xdaac409c8b353cae8959f7940a000d1037a1778b` |
| RevenueUSC         | USC v2 (102036) | `0x8617c980e8febd13c40fd2c2a7d7514dd2116afa` |

## Project Structure

```
/
├── contracts/          # Solidity smart contracts & deployment scripts
│   ├── source/         # cc3 contracts (SpaceRewardEmitter)
│   ├── execution/      # USC v2 contracts (lending protocol)
│   ├── scripts/        # Hardhat deployment scripts
│   └── README.md       # Contract development guide
├── worker/             # Oracle worker (TypeScript, Bun)
│   ├── src/            # Worker source files
│   └── README.md       # Worker operation guide
├── frontend/           # Next.js lending dashboard
│   ├── app/            # App Router pages (/lend, /borrow)
│   └── README.md       # Frontend development guide
├── scripts/            # Cross-folder deployment orchestration
├── .env                # Environment variables
├── hardhat.config.ts   # Hardhat configuration
└── README.md           # This file
```

## Quick Start

### Prerequisites

- **Bun** (package manager/runtime)
- **Node.js 18+**
- **Git**

### Installation

```bash
# Clone the repository
git clone git@github.com:devesh1011/Kestrel.git
cd Kestrel

# Install dependencies for all components
bun install
cd contracts && bun install
cd ../worker && bun install
cd ../frontend && bun install
cd ..
```

### Environment Setup

Create `.env` file with required variables:

```bash
# Private keys
DEPLOYER_PRIVATE_KEY=<your-deployer-private-key-hex>

# RPC URLs
CTC_TESTNET_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CTC_USC_RPC_URL=https://rpc.usc-testnet2.creditcoin.network

# Contract addresses (already deployed)
SPACE_REWARD_EMITTER_ADDRESS=0x372bd93f70dfd866e17a17aba51e47eebeb4859e
REVENUE_USC_ADDRESS=0x111ea01f8ffc0d9d2ba88578a45d762672db255a
HARDWARE_YIELD_CORE_ADDRESS=0x7daf425b9428ee97c1e52b094e2db42637265d73
LENDER_VAULT_ADDRESS=0x6d8807ae9e75ca4307df6e9d0b40bacadb5f7fca
REVENUE_ESCROW_ADDRESS=0x39e86627b3438d141ba581581ae79416495eac80

# Oracle worker
USC_PROOF_API_URL=<usc-proof-api-endpoint>
USC_PROOF_API_KEY=<api-key-if-required>

# Frontend
NEXT_PUBLIC_CTC_USC_CHAIN_ID=102036
NEXT_PUBLIC_CTC_USC_RPC=https://rpc.usc-testnet2.creditcoin.network
NEXT_PUBLIC_CTC_TESTNET_CHAIN_ID=102031
NEXT_PUBLIC_CTC_TESTNET_EXPLORER=https://creditcoin-testnet.blockscout.com
NEXT_PUBLIC_SEPOLIA_CHAIN_ID=11155111
```

### Running the System

1. **Start Oracle Worker** (listens for rewards, submits proofs):

   ```bash
   cd worker
   bun run src/index.ts
   ```

2. **Start Frontend** (lending dashboard):

   ```bash
   cd frontend
   bun dev
   ```

3. **Deploy/Interact with Contracts** (if needed):
   ```bash
   cd contracts
   bunx hardhat run scripts/01_deploy_source.ts --network ctc_testnet
   bunx hardhat run scripts/02_deploy_execution.ts --network ctc_usc_testnet
   bunx hardhat run scripts/03_wire_contracts.ts --network ctc_usc_testnet
   ```

## Development

### Tech Stack

- **Smart Contracts**: Solidity ^0.8.20, Hardhat, OpenZeppelin v5, ethers v6
- **Oracle Worker**: TypeScript, Bun, WebSocket listeners, exponential backoff
- **Frontend**: Next.js 16 App Router, wagmi v2, viem, Tailwind CSS, shadcn/ui
- **Package Manager**: Bun
- **Networks**: Creditcoin cc3 (102031), USC Testnet v2 (102036)

### Component READMEs

- [contracts/README.md](contracts/README.md) — Contract architecture, deployment, development
- [worker/README.md](worker/README.md) — Oracle worker operation, error handling, configuration
- [frontend/README.md](frontend/README.md) — Dashboard features, wagmi integration, UI components

## Testing

```bash
# Run all contract tests
cd contracts && bunx hardhat test

# Run worker tests (if implemented)
cd worker && bun test

# Run frontend tests (if implemented)
cd frontend && bun test
```

## Links

- **Live Demo**: [kestrel.finance](https://kestrel.finance) (testnet)
- **Contracts**: [Blockscout Explorer](https://creditcoin-testnet.blockscout.com)
- **Documentation**: See component READMEs
- **Creditcoin**: [creditcoin.org](https://creditcoin.org)
