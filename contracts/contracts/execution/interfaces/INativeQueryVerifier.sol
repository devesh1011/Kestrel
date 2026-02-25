// SPDX-License-Identifier: MIT
// @chain: creditcoin-usc
pragma solidity ^0.8.20;

// ─── Proof Structs ────────────────────────────────────────────────────────────

/// @notice Single entry in a Merkle branch.
struct MerkleProofEntry {
    bytes32 hash;
    bool isLeft; // true → this hash goes on the LEFT side of the pair
}

/// @notice Continuity proof connecting a block back to a known USC checkpoint.
struct ContinuityProof {
    bytes32[] blockDigests; // sequential block headers between tx block and checkpoint
    uint256 checkpointHeight; // height of the attested USC checkpoint
}

// ─── Interface ────────────────────────────────────────────────────────────────

/// @title INativeQueryVerifier
/// @notice Interface for the Native Query Verifier precompile at 0x0FD2 on
///         Creditcoin USC Testnet v2.  Verifies that a given transaction
///         (txData) occurred on an attested source chain by checking the
///         provided Merkle and continuity proofs synchronously within the
///         calling transaction.
interface INativeQueryVerifier {
    /// @notice Verify a source-chain transaction synchronously.
    ///         The source chain is identified by the continuity proof's checkpoint —
    ///         no explicit chain ID parameter is needed by the precompile.
    /// @param txData          RLP-encoded raw transaction bytes from the source chain.
    /// @param merkleProof     Merkle branch proving the tx is in a block's tx root.
    /// @param continuityProof Continuity chain from the tx block to a USC checkpoint.
    /// @return                True if the proof is valid; reverts on invalid proof.
    function verify(
        bytes calldata txData,
        MerkleProofEntry[] calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);
}
