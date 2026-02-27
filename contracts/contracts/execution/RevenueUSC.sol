// SPDX-License-Identifier: MIT
// @chain: creditcoin-usc
pragma solidity ^0.8.20;

import "./interfaces/INativeQueryVerifier.sol";

// ─── Downstream Interface ─────────────────────────────────────────────────────

interface IHardwareYieldCore {
    function recordVerifiedReward(
        address nodeWallet,
        uint256 amount,
        uint256 timestamp
    ) external;
}

/// @title RevenueUSC
/// @notice Universal Smart Contract on Creditcoin USC Testnet v2.
///         Receives proofs from the off-chain oracle worker, verifies them
///         synchronously via the 0x0FD2 Native Query Verifier Precompile, and
///         relays the decoded reward data to HardwareYieldCore.
///
/// @dev Security model:
///      - Only the authorized `oracleWorker` EOA may submit proofs.
///      - `processedQueries` prevents double-processing the same source tx.
///      - The USC precompile is the trust root — if `verify()` returns true, the
///        tx provably occurred on the attested source chain (cc3 or Sepolia fallback).
contract RevenueUSC {
    // ─── Constants ────────────────────────────────────────────────────────────
    // ─── Precompile ───────────────────────────────────────────────────────────
    /// @notice Native Query Verifier precompile at 0x0FD2 on Creditcoin USC.
    INativeQueryVerifier public immutable VERIFIER =
        INativeQueryVerifier(address(0x0FD2));

    // ─── State ────────────────────────────────────────────────────────────────
    address public owner;
    /// @notice Only this address may call processRewardProof.
    address public oracleWorker;
    /// @notice HardwareYieldCore contract to relay verified reward data into.
    address public hardwareYieldCore;
    /// @notice Replay protection: keccak256(txData) => processed.
    mapping(bytes32 => bool) public processedQueries;

    // ─── Events ───────────────────────────────────────────────────────────────
    event RewardVerified(
        address indexed nodeWallet,
        uint256 amount,
        uint256 timestamp,
        bytes32 indexed queryHash
    );
    event OracleWorkerUpdated(address indexed newWorker);
    event HardwareYieldCoreUpdated(address indexed newCore);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "RevenueUSC: not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleWorker, "RevenueUSC: not oracle worker");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    /// @param _hardwareYieldCore Address of the HardwareYieldCore contract.
    /// @param _oracleWorker      Address of the off-chain oracle worker EOA.
    constructor(address _hardwareYieldCore, address _oracleWorker) {
        require(_hardwareYieldCore != address(0), "RevenueUSC: zero address");
        require(_oracleWorker != address(0), "RevenueUSC: zero address");
        owner = msg.sender;
        hardwareYieldCore = _hardwareYieldCore;
        oracleWorker = _oracleWorker;
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /// @notice Submit a proof that a RewardClaimed event occurred on the source chain
    ///         (Creditcoin cc3 in production; Sepolia as testnet fallback).
    ///         The call will revert if the proof is invalid or already processed.
    ///
    /// @param txData          RLP-encoded raw transaction bytes from the source chain.
    /// @param nodeWallet      Reward claimant (decoded off-chain from the RewardClaimed event).
    /// @param amount          Reward amount from the RewardClaimed event.
    /// @param timestamp       block.timestamp of the source tx (from the event).
    /// @param merkleProof     Merkle branch proving inclusion in the block's tx root.
    /// @param continuityProof Continuity chain from the tx block to a USC checkpoint.
    function processRewardProof(
        bytes calldata txData,
        address nodeWallet,
        uint256 amount,
        uint256 timestamp,
        MerkleProofEntry[] calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external onlyOracle {
        require(nodeWallet != address(0), "RevenueUSC: zero node wallet");
        require(amount > 0, "RevenueUSC: amount must be > 0");

        // Replay protection
        bytes32 queryHash = keccak256(txData);
        require(!processedQueries[queryHash], "RevenueUSC: already processed");

        // Verify the transaction was included in an attested source-chain block
        bool valid = VERIFIER.verify(txData, merkleProof, continuityProof);
        require(valid, "RevenueUSC: proof verification failed");

        // Mark as processed before external call (CEI pattern)
        processedQueries[queryHash] = true;

        // Forward verified reward data to the lending core
        IHardwareYieldCore(hardwareYieldCore).recordVerifiedReward(
            nodeWallet,
            amount,
            timestamp
        );

        emit RewardVerified(nodeWallet, amount, timestamp, queryHash);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setOracleWorker(address _worker) external onlyOwner {
        require(_worker != address(0), "RevenueUSC: zero address");
        oracleWorker = _worker;
        emit OracleWorkerUpdated(_worker);
    }

    function setHardwareYieldCore(address _core) external onlyOwner {
        require(_core != address(0), "RevenueUSC: zero address");
        hardwareYieldCore = _core;
        emit HardwareYieldCoreUpdated(_core);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "RevenueUSC: zero address");
        owner = newOwner;
    }
}
