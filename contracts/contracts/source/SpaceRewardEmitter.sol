// SPDX-License-Identifier: MIT
// @chain: cc3-or-sepolia
// Deploy on Creditcoin cc3 (102031) in production.
// If getLatestAttestedHeightAndHash(102031) returns 0 on USC Testnet v2, deploy on Sepolia (11155111) instead.
// Contract code is identical — only the --network flag changes.
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title SpaceRewardEmitter
/// @notice Spacecoin reward distribution contract.
///         Deployed on Creditcoin cc3 (production) or Sepolia (testnet fallback).
///         Node operators call claimReward() — the emitted RewardClaimed event
///         is what the USC off-chain worker proves to the execution chain.
contract SpaceRewardEmitter is Ownable {
    // ─── Constants ────────────────────────────────────────────────────────────
    /// @notice Minimum blocks between consecutive claims from the same wallet.
    /// @dev Set to 0 for demo purposes to allow frequent testing.
    uint256 public constant MIN_CLAIM_INTERVAL = 0;

    // ─── State ────────────────────────────────────────────────────────────────
    /// @notice Lifetime earnings per node wallet.
    mapping(address => uint256) public totalEarned;
    /// @notice Last block at which a wallet successfully claimed.
    mapping(address => uint256) public lastClaimBlock;
    /// @notice Mock SPACE ERC-20 token address. If address(0), no token transfer occurs (ETH-simple mode).
    address public rewardToken;

    // ─── Events ───────────────────────────────────────────────────────────────
    /// @notice Emitted on every successful reward claim.
    /// @dev USC off-chain worker listens for this event and generates proofs.
    event RewardClaimed(
        address indexed nodeWallet,
        uint256 amount,
        uint256 timestamp
    );

    // ─── Constructor ──────────────────────────────────────────────────────────
    /// @param _rewardToken Address of the mock SPACE ERC-20 token.
    ///                     Pass address(0) to skip token transfers (event-only mode for USC demo).
    constructor(address _rewardToken) Ownable(msg.sender) {
        rewardToken = _rewardToken;
    }

    // ─── External Functions ───────────────────────────────────────────────────

    /// @notice Node operator claims a periodic reward of `amount`.
    ///         This is the transaction USC will prove on the execution chain.
    /// @param amount Reward amount (in wei, representing SPACE tokens).
    function claimReward(uint256 amount) external {
        require(amount > 0, "SpaceRewardEmitter: amount must be > 0");
        require(
            block.number > lastClaimBlock[msg.sender] + MIN_CLAIM_INTERVAL,
            "SpaceRewardEmitter: claim too soon"
        );

        lastClaimBlock[msg.sender] = block.number;
        totalEarned[msg.sender] += amount;

        // Transfer reward token to caller if a token is configured.
        // In event-only mode (rewardToken == address(0)) just emit — the event is what USC proves.
        if (rewardToken != address(0)) {
            IERC20(rewardToken).transfer(msg.sender, amount);
        }

        emit RewardClaimed(msg.sender, amount, block.timestamp);
    }

    /// @notice Owner: set or update the reward token address.
    function setRewardToken(address _token) external onlyOwner {
        rewardToken = _token;
    }

    /// @notice Owner helper — simulate batch rewards for multiple test wallets in one tx.
    ///         Used for judge demos to seed reward history quickly.
    /// @param nodes  Array of node wallet addresses.
    /// @param amounts Corresponding reward amounts.
    function simulateBatchRewards(
        address[] calldata nodes,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(
            nodes.length == amounts.length,
            "SpaceRewardEmitter: length mismatch"
        );
        for (uint256 i = 0; i < nodes.length; i++) {
            require(amounts[i] > 0, "SpaceRewardEmitter: amount must be > 0");
            totalEarned[nodes[i]] += amounts[i];
            // Bypass MIN_CLAIM_INTERVAL for batch demo seeding.
            lastClaimBlock[nodes[i]] = block.number;
            if (rewardToken != address(0)) {
                IERC20(rewardToken).transfer(nodes[i], amounts[i]);
            }
            emit RewardClaimed(nodes[i], amounts[i], block.timestamp);
        }
    }
}
