// SPDX-License-Identifier: MIT
// @chain: creditcoin-usc
pragma solidity ^0.8.20;

// ─── Interface ────────────────────────────────────────────────────────────────

/// @title INativeQueryVerifier
/// @notice Interface for the BlockProver precompile at 0x0FD2 on
///         Creditcoin USC Testnet v2.  Verifies that a given transaction
///         occurred on an attested source chain by checking Merkle and
///         continuity proofs synchronously within the calling transaction.
///
/// @dev Struct names and function signatures match the precompile's actual ABI
///      as documented at https://docs.creditcoin.org/usc and implemented in
///      the official Gluwa cc-next-query-builder SDK.
interface INativeQueryVerifier {
    // ─── Structs ─────────────────────────────────────────────────────────────

    /// @notice Single entry in a Merkle branch.
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft; // true → sibling is on the LEFT side of the pair
    }

    /// @notice Merkle proof wrapper: root + ordered siblings.
    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    /// @notice Continuity proof linking the tx block to a USC checkpoint.
    struct ContinuityProof {
        bytes32 lowerEndpointDigest; // digest of the starting block in the continuity chain
        bytes32[] roots; // block digest roots from tx block up to checkpoint
    }

    // ─── Functions ───────────────────────────────────────────────────────────

    /// @notice Verify a source-chain transaction (view — no event emitted).
    /// @param chainKey          USC oracle chain key identifying the source chain.
    /// @param height            Block height of the transaction on the source chain.
    /// @param encodedTransaction RLP-encoded raw transaction bytes.
    /// @param merkleProof       Merkle proof proving tx inclusion in the block.
    /// @param continuityProof   Continuity chain from the block to a checkpoint.
    /// @return                  True if valid; reverts on invalid proof.
    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    /// @notice Verify a source-chain transaction and emit TransactionVerified.
    /// @param chainKey          USC oracle chain key identifying the source chain.
    /// @param height            Block height of the transaction on the source chain.
    /// @param encodedTransaction RLP-encoded raw transaction bytes.
    /// @param merkleProof       Merkle proof proving tx inclusion in the block.
    /// @param continuityProof   Continuity chain from the block to a checkpoint.
    /// @return                  True if valid; reverts on invalid proof.
    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}
