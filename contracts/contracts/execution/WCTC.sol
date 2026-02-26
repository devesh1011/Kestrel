// SPDX-License-Identifier: MIT
// @chain: creditcoin-usc
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title WCTC — Wrapped CTC
/// @notice Minimal ERC-20 wrapper around native CTC.  Lenders wrap CTC into
///         WCTC before depositing into LenderVault (ERC-4626 requires an
///         ERC-20 underlying asset, not a native coin).
/// @dev Deposit CTC → receive 1:1 WCTC.  Withdraw WCTC → receive 1:1 CTC.
contract WCTC is ERC20 {
    // ─── Events ───────────────────────────────────────────────────────────────
    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() ERC20("Wrapped CTC", "WCTC") {}

    // ─── External ─────────────────────────────────────────────────────────────

    /// @notice Wrap native CTC into WCTC. Caller sends CTC via msg.value.
    function deposit() external payable {
        require(msg.value > 0, "WCTC: must send CTC");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Unwrap `amount` WCTC back to native CTC.
    /// @param amount Amount of WCTC to burn (18 decimals).
    function withdraw(uint256 amount) external {
        require(amount > 0, "WCTC: amount must be > 0");
        _burn(msg.sender, amount);
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "WCTC: CTC transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    // ─── Receive ──────────────────────────────────────────────────────────────
    /// @notice Allow plain CTC transfers to wrap automatically.
    receive() external payable {
        require(msg.value > 0, "WCTC: must send CTC");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }
}
