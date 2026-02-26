// SPDX-License-Identifier: MIT
// @chain: creditcoin-usc
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title LenderVault
/// @notice ERC-4626 vault where lenders deposit WCTC and earn yield from
///         loan interest.  Only HardwareYieldCore may disburse or receive funds.
///
/// @dev Underlying asset is WCTC (wrapped native CTC) — see WCTC.sol.
///      Shares are minted 1:1 on first deposit and appreciate as interest accrues.
contract LenderVault is ERC4626, Ownable {
    // ─── State ────────────────────────────────────────────────────────────────
    /// @notice Only HardwareYieldCore may call disburseLoan / receiveFunds.
    address public hardwareYieldCore;
    /// @notice Outstanding principal currently loaned out.
    uint256 public totalLoaned;
    /// @notice Lifetime interest collected (informational).
    uint256 public totalInterestEarned;

    // ─── Events ───────────────────────────────────────────────────────────────
    event LoanDisbursed(address indexed borrower, uint256 amount);
    event FundsReceived(uint256 amount);
    event HardwareYieldCoreUpdated(address indexed newCore);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyCore() {
        require(
            msg.sender == hardwareYieldCore,
            "LenderVault: not HardwareYieldCore"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    /// @param wctc              Address of the WCTC ERC-20 token.
    /// @param _hardwareYieldCore Address of HardwareYieldCore.
    constructor(
        address wctc,
        address _hardwareYieldCore
    )
        ERC4626(IERC20(wctc))
        ERC20("HardwareYield Vault", "hvWCTC")
        Ownable(msg.sender)
    {
        require(wctc != address(0), "LenderVault: zero WCTC address");
        require(
            _hardwareYieldCore != address(0),
            "LenderVault: zero core address"
        );
        hardwareYieldCore = _hardwareYieldCore;
    }

    // ─── Core-Gated ───────────────────────────────────────────────────────────

    /// @notice Transfer `amount` WCTC to `borrower`.  Only HardwareYieldCore.
    /// @param borrower Loan recipient.
    /// @param amount   Principal in WCTC (18 decimals).
    function disburseLoan(address borrower, uint256 amount) external onlyCore {
        require(
            amount <= availableLiquidity(),
            "LenderVault: insufficient liquidity"
        );
        totalLoaned += amount;
        IERC20(asset()).transfer(borrower, amount);
        emit LoanDisbursed(borrower, amount);
    }

    /// @notice Accept a repayment split into principal and interest from HardwareYieldCore.
    ///         Interest increases total assets (and thus share value) for all lenders.
    /// @param principal Amount reducing outstanding principal.
    /// @param interest  Amount of interest earned on top of principal.
    function receiveFunds(
        uint256 principal,
        uint256 interest
    ) external onlyCore {
        if (totalLoaned >= principal) {
            totalLoaned -= principal;
        } else {
            totalLoaned = 0;
        }
        totalInterestEarned += interest;
        emit FundsReceived(principal + interest);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    /// @notice WCTC available to disburse to new borrowers.
    function availableLiquidity() public view returns (uint256) {
        uint256 bal = IERC20(asset()).balanceOf(address(this));
        return bal > totalLoaned ? bal - totalLoaned : 0;
    }

    /// @inheritdoc ERC4626
    /// @dev Override so `totalAssets` includes loaned-out principal (it is still owed back).
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + totalLoaned;
    }

    /// @inheritdoc ERC4626
    /// @dev Guard: lenders cannot withdraw capital that is currently loaned out.
    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) public override returns (uint256 shares) {
        require(
            assets <= availableLiquidity(),
            "LenderVault: assets exceed available liquidity"
        );
        return super.withdraw(assets, receiver, owner_);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setHardwareYieldCore(address _core) external onlyOwner {
        require(_core != address(0), "LenderVault: zero address");
        hardwareYieldCore = _core;
        emit HardwareYieldCoreUpdated(_core);
    }
}
