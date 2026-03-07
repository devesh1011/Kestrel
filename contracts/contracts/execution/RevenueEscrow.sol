// SPDX-License-Identifier: MIT
// @chain: creditcoin-usc
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title RevenueEscrow
/// @notice Tracks revenue commitments (soft collateral) for each loan.
///         When a node's future rewards arrive via HardwareYieldCore,
///         `redirectReward` intercepts `escrowBps` percent and forwards it
///         to LenderVault as a loan repayment.
///
///         On liquidation, 100 % of future rewards are redirected until the
///         outstanding debt is covered.
contract RevenueEscrow is Ownable, ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────
    enum EscrowStatus {
        Active,
        Liquidated,
        Closed
    }

    struct Escrow {
        address nodeWallet;
        uint256 loanId;
        uint256 escrowBps; // % of future rewards committed (normal mode)
        uint256 totalRedirected; // cumulative WCTC sent to vault
        EscrowStatus status;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    /// @notice Only HardwareYieldCore may call state-changing functions.
    address public hardwareYieldCore;
    /// @notice Vault address — receives redirected WCTC.
    address public lenderVault;
    /// @notice WCTC token address.
    address public wctc;

    /// @notice Escrow records indexed by ID (1-based).
    mapping(uint256 => Escrow) public escrows;
    uint256 public nextEscrowId = 1;

    // ─── Events ───────────────────────────────────────────────────────────────
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed nodeWallet,
        uint256 loanId,
        uint256 escrowBps
    );
    event RewardRedirected(
        uint256 indexed escrowId,
        uint256 redirected,
        uint256 remaining
    );
    event EscrowLiquidated(uint256 indexed escrowId);
    event EscrowClosed(uint256 indexed escrowId);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyCore() {
        require(
            msg.sender == hardwareYieldCore,
            "RevenueEscrow: not HardwareYieldCore"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    /// @param _hardwareYieldCore HardwareYieldCore contract address.
    /// @param _lenderVault       LenderVault contract address.
    /// @param _wctc              WCTC token address.
    constructor(
        address _hardwareYieldCore,
        address _lenderVault,
        address _wctc
    ) Ownable(msg.sender) {
        require(_hardwareYieldCore != address(0), "RE: zero address");
        require(_lenderVault != address(0), "RE: zero address");
        require(_wctc != address(0), "RE: zero address");
        hardwareYieldCore = _hardwareYieldCore;
        lenderVault = _lenderVault;
        wctc = _wctc;
    }

    // ─── Core-Gated ───────────────────────────────────────────────────────────

    /// @notice Create a new revenue escrow when a loan is originated.
    /// @param nodeWallet  Borrower address.
    /// @param loanId      Matching loan ID in HardwareYieldCore.
    /// @param escrowBps   Percentage of future rewards to auto-redirect (in BPS).
    /// @return escrowId   New escrow ID.
    function createEscrow(
        address nodeWallet,
        uint256 loanId,
        uint256 escrowBps
    ) external onlyCore returns (uint256 escrowId) {
        require(nodeWallet != address(0), "RE: zero wallet");
        require(escrowBps > 0 && escrowBps <= 10000, "RE: invalid BPS");

        escrowId = nextEscrowId++;
        escrows[escrowId] = Escrow({
            nodeWallet: nodeWallet,
            loanId: loanId,
            escrowBps: escrowBps,
            totalRedirected: 0,
            status: EscrowStatus.Active
        });

        emit EscrowCreated(escrowId, nodeWallet, loanId, escrowBps);
    }

    /// @notice Called by HardwareYieldCore when a new reward arrives for a borrower.
    ///         Redirects the committed BPS share to LenderVault.
    ///
    /// @dev In Liquidated state, 100 % is redirected.
    ///      WCTC must already be held by this contract (transferred by Core before calling).
    ///
    /// @param escrowId     Escrow to draw from.
    /// @param rewardAmount Full reward amount arriving (in WCTC).
    /// @return redirected  Amount forwarded to LenderVault.
    /// @return remaining   Amount returned to the node operator.
    function redirectReward(
        uint256 escrowId,
        uint256 rewardAmount
    )
        external
        onlyCore
        nonReentrant
        returns (uint256 redirected, uint256 remaining)
    {
        Escrow storage esc = escrows[escrowId];
        require(
            esc.status == EscrowStatus.Active ||
                esc.status == EscrowStatus.Liquidated,
            "RE: escrow not active"
        );
        require(rewardAmount > 0, "RE: zero reward");

        uint256 bps = esc.status == EscrowStatus.Liquidated
            ? 10000
            : esc.escrowBps;
        redirected = (rewardAmount * bps) / 10000;
        remaining = rewardAmount - redirected;

        esc.totalRedirected += redirected;

        if (redirected > 0) {
            // HACKATHON DEMO: Skip WCTC transfer since token economics not implemented
            // TODO: Implement WCTC minting/transfer when rewards are recorded
            // IERC20(wctc).transfer(lenderVault, redirected);
        }

        emit RewardRedirected(escrowId, redirected, remaining);
    }

    /// @notice Mark escrow as liquidated — all future rewards will be 100 % redirected.
    /// @param escrowId Escrow to liquidate.
    function liquidateEscrow(uint256 escrowId) external onlyCore {
        Escrow storage esc = escrows[escrowId];
        require(esc.status == EscrowStatus.Active, "RE: escrow not active");
        esc.status = EscrowStatus.Liquidated;
        emit EscrowLiquidated(escrowId);
    }

    /// @notice Close an escrow after full repayment.
    /// @param escrowId Escrow to close.
    function releaseEscrow(uint256 escrowId) external onlyCore {
        Escrow storage esc = escrows[escrowId];
        require(
            esc.status == EscrowStatus.Active ||
                esc.status == EscrowStatus.Liquidated,
            "RE: already closed"
        );
        esc.status = EscrowStatus.Closed;
        emit EscrowClosed(escrowId);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setHardwareYieldCore(address _core) external onlyOwner {
        require(_core != address(0), "RE: zero address");
        hardwareYieldCore = _core;
    }

    function setLenderVault(address _vault) external onlyOwner {
        require(_vault != address(0), "RE: zero address");
        lenderVault = _vault;
    }
}
