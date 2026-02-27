// SPDX-License-Identifier: MIT
// @chain: creditcoin-usc
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ─── Downstream Interfaces ────────────────────────────────────────────────────

interface ILenderVault {
    function disburseLoan(address borrower, uint256 amount) external;
    function receiveFunds(uint256 principal, uint256 interest) external;
    function availableLiquidity() external view returns (uint256);
}

interface IRevenueEscrow {
    function createEscrow(
        address borrower,
        uint256 loanPrincipal,
        uint256 commitBps
    ) external returns (uint256 escrowId);

    function redirectReward(
        uint256 escrowId,
        uint256 rewardAmount
    ) external returns (uint256 redirected, uint256 toNode);

    function liquidateEscrow(uint256 escrowId) external;

    function releaseEscrow(uint256 escrowId) external;
}

/// @title HardwareYieldCore
/// @notice Core lending state machine on Creditcoin USC Testnet v2.
///         Tracks USC-verified reward history, computes credit scores,
///         and manages the full loan lifecycle (apply → active → repaid / liquidated).
contract HardwareYieldCore is Ownable, ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────

    struct RewardRecord {
        uint256 amount;
        uint256 timestamp;
    }

    enum LoanStatus {
        Active,
        Repaid,
        Liquidated
    }

    struct Loan {
        address borrower;
        uint256 principal;
        uint256 interestRateBps; // annualized APR, e.g. 1200 = 12%
        uint256 startTime;
        uint256 dueTime;
        uint256 repaid; // cumulative repayments
        uint256 escrowId; // linked RevenueEscrow escrow ID
        uint256 scoreAtOrigination; // avgDailyRevenue at loan creation (for liquidation check)
        LoanStatus status;
    }

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant SCORE_WINDOW = 90 days;
    uint256 public constant MAX_LTV_BPS = 5000; // 50 % of 90-day avg revenue
    uint256 public constant LOAN_DURATION = 90 days;
    uint256 public constant BASE_RATE_BPS = 1200; // 12 % APR
    uint256 public constant LIQUIDATION_FLOOR_BPS = 2000; // liquidate if revenue < 20 % of origination score
    uint256 public constant MIN_REWARD_RECORDS = 3; // minimum verified events to qualify

    // ─── State ────────────────────────────────────────────────────────────────
    /// @notice USC-verified reward records per node wallet.
    mapping(address => RewardRecord[]) public rewardHistory;

    /// @notice All loans indexed by ID (1-based).
    mapping(uint256 => Loan) public loans;

    /// @notice Active loan ID per wallet. 0 = no active loan.
    mapping(address => uint256) public activeLoanId;

    uint256 public nextLoanId = 1;

    /// @notice Only RevenueUSC may call recordVerifiedReward.
    address public uscContract;
    address public lenderVault;
    address public revenueEscrow;

    // ─── Events ───────────────────────────────────────────────────────────────
    event RewardRecorded(
        address indexed nodeWallet,
        uint256 amount,
        uint256 timestamp
    );
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 principal,
        uint256 totalOwed,
        uint256 dueTime
    );
    event Repayment(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 remainingOwed
    );
    event LoanRepaidInFull(uint256 indexed loanId, address indexed borrower);
    event LoanLiquidated(uint256 indexed loanId, address indexed triggeredBy);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _uscContract,
        address _lenderVault,
        address _revenueEscrow
    ) Ownable(msg.sender) {
        require(_uscContract != address(0), "HYC: zero address");
        require(_lenderVault != address(0), "HYC: zero address");
        require(_revenueEscrow != address(0), "HYC: zero address");
        uscContract = _uscContract;
        lenderVault = _lenderVault;
        revenueEscrow = _revenueEscrow;
    }

    // ─── USC-Gated ────────────────────────────────────────────────────────────

    /// @notice Record a USC-verified reward event for a node wallet.
    ///         Called exclusively by RevenueUSC after proof verification.
    /// @param nodeWallet Beneficiary node operator.
    /// @param amount     Reward amount (18-decimal WCTC equivalent).
    /// @param timestamp  Source-chain event timestamp.
    function recordVerifiedReward(
        address nodeWallet,
        uint256 amount,
        uint256 timestamp
    ) external {
        require(msg.sender == uscContract, "HYC: caller is not USC contract");
        require(nodeWallet != address(0), "HYC: zero wallet");
        require(amount > 0, "HYC: zero amount");

        // Prune records older than SCORE_WINDOW before appending
        _pruneOldRecords(nodeWallet);
        rewardHistory[nodeWallet].push(RewardRecord(amount, timestamp));

        // If this wallet has an active loan, redirect escrow share
        uint256 loanId = activeLoanId[nodeWallet];
        if (loanId != 0) {
            _applyEscrowRedirect(loanId, amount);
        }

        emit RewardRecorded(nodeWallet, amount, timestamp);
    }

    // ─── Credit Score ─────────────────────────────────────────────────────────

    /// @notice Compute 90-day average daily revenue and maximum borrowable amount.
    /// @param nodeWallet Address to score.
    /// @return avgDailyRevenue    Average daily reward (sum / 90).
    /// @return maxLoanAmount      50 % of projected 90-day revenue.
    function getScore(
        address nodeWallet
    ) public view returns (uint256 avgDailyRevenue, uint256 maxLoanAmount) {
        RewardRecord[] storage records = rewardHistory[nodeWallet];
        uint256 windowStart = block.timestamp - SCORE_WINDOW;
        uint256 total = 0;
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].timestamp >= windowStart) {
                total += records[i].amount;
            }
        }
        avgDailyRevenue = total / 90; // simple 90-day average
        maxLoanAmount = (total * MAX_LTV_BPS) / 10000;
    }

    // ─── Loan Lifecycle ───────────────────────────────────────────────────────

    /// @notice Apply for a CTC loan backed by revenue history.
    /// @param requestedAmount  Amount of WCTC to borrow (must be ≤ maxLoanAmount).
    /// @param escrowCommitBps  Percentage of future rewards committed to auto-repay (in BPS).
    function applyForLoan(
        uint256 requestedAmount,
        uint256 escrowCommitBps
    ) external nonReentrant {
        require(activeLoanId[msg.sender] == 0, "HYC: existing active loan");
        require(requestedAmount > 0, "HYC: zero amount requested");
        require(
            escrowCommitBps > 0 && escrowCommitBps <= 10000,
            "HYC: invalid escrow BPS"
        );

        // Ensure minimum reward history
        _pruneOldRecords(msg.sender);
        require(
            rewardHistory[msg.sender].length >= MIN_REWARD_RECORDS,
            "HYC: insufficient reward history"
        );

        (uint256 avgDailyRevenue, uint256 maxLoan) = getScore(msg.sender);
        require(avgDailyRevenue > 0, "HYC: no revenue score");
        require(requestedAmount <= maxLoan, "HYC: exceeds max loan amount");

        // Check vault liquidity
        require(
            ILenderVault(lenderVault).availableLiquidity() >= requestedAmount,
            "HYC: insufficient vault liquidity"
        );

        // Build loan record
        uint256 loanId = nextLoanId++;
        uint256 dueTime = block.timestamp + LOAN_DURATION;

        // Create revenue escrow — pass loanPrincipal (requestedAmount) per spec
        uint256 escrowId = IRevenueEscrow(revenueEscrow).createEscrow(
            msg.sender,
            requestedAmount,
            escrowCommitBps
        );

        loans[loanId] = Loan({
            borrower: msg.sender,
            principal: requestedAmount,
            interestRateBps: BASE_RATE_BPS,
            startTime: block.timestamp,
            dueTime: dueTime,
            repaid: 0,
            escrowId: escrowId,
            scoreAtOrigination: avgDailyRevenue,
            status: LoanStatus.Active
        });
        activeLoanId[msg.sender] = loanId;

        // Disburse funds from vault
        ILenderVault(lenderVault).disburseLoan(msg.sender, requestedAmount);

        uint256 projectedOwed = requestedAmount +
            _computeInterest(requestedAmount, LOAN_DURATION);
        emit LoanCreated(
            loanId,
            msg.sender,
            requestedAmount,
            projectedOwed,
            dueTime
        );
    }

    /// @notice Borrower manually repays `amount` toward their loan.
    ///         Caller must have approved this contract for `amount` WCTC first.
    /// @param loanId  Loan to repay against.
    /// @param amount  WCTC amount to repay.
    function repay(uint256 loanId, uint256 amount) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.borrower == msg.sender, "HYC: not your loan");
        require(loan.status == LoanStatus.Active, "HYC: loan not active");
        require(amount > 0, "HYC: zero repayment");

        // Compute total owed dynamically (principal + interest accrued so far)
        uint256 totalOwed = loan.principal + accruedInterest(loanId);
        uint256 remaining = totalOwed > loan.repaid
            ? totalOwed - loan.repaid
            : 0;
        uint256 actual = amount > remaining ? remaining : amount;

        loan.repaid += actual;

        // Split actual repayment into principal and interest portions for vault accounting
        uint256 principalDebt = loan.principal > (loan.repaid - actual)
            ? loan.principal - (loan.repaid - actual)
            : 0;
        uint256 principalPortion = actual > principalDebt
            ? principalDebt
            : actual;
        uint256 interestPortion = actual - principalPortion;

        ILenderVault(lenderVault).receiveFunds(
            principalPortion,
            interestPortion
        );

        uint256 stillOwed = totalOwed > loan.repaid
            ? totalOwed - loan.repaid
            : 0;
        emit Repayment(loanId, msg.sender, actual, stillOwed);

        if (stillOwed == 0) {
            _closeLoan(loanId, LoanStatus.Repaid);
        }
    }

    /// @notice Liquidate a loan that is overdue or whose revenue has collapsed.
    ///         Callable by anyone (keeper bots in production; manual for demo).
    /// @param loanId  Loan to liquidate.
    function triggerLiquidation(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Active, "HYC: loan not active");

        bool overdue = block.timestamp > loan.dueTime;
        bool revenueCollapsed = _isRevenueCollapsed(loan);

        require(overdue || revenueCollapsed, "HYC: loan not liquidatable");

        IRevenueEscrow(revenueEscrow).liquidateEscrow(loan.escrowId);
        _closeLoan(loanId, LoanStatus.Liquidated);

        emit LoanLiquidated(loanId, msg.sender);
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

    /// @notice Compute accrued interest on a loan up to now.
    /// @param loanId Loan to query.
    /// @return Accrued interest in WCTC (18 decimals).
    function accruedInterest(uint256 loanId) public view returns (uint256) {
        Loan storage loan = loans[loanId];
        if (loan.status != LoanStatus.Active) return 0;
        uint256 elapsed = block.timestamp - loan.startTime;
        return _computeInterest(loan.principal, elapsed);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setUscContract(address _usc) external onlyOwner {
        require(_usc != address(0), "HYC: zero address");
        uscContract = _usc;
    }

    function setLenderVault(address _vault) external onlyOwner {
        require(_vault != address(0), "HYC: zero address");
        lenderVault = _vault;
    }

    function setRevenueEscrow(address _escrow) external onlyOwner {
        require(_escrow != address(0), "HYC: zero address");
        revenueEscrow = _escrow;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Simple pro-rata interest: principal * BASE_RATE_BPS * elapsed / (10000 * 365 days)
    function _computeInterest(
        uint256 principal,
        uint256 elapsed
    ) internal pure returns (uint256) {
        return (principal * BASE_RATE_BPS * elapsed) / (10000 * 365 days);
    }

    /// @dev Remove reward records older than SCORE_WINDOW.
    function _pruneOldRecords(address wallet) internal {
        RewardRecord[] storage records = rewardHistory[wallet];
        uint256 windowStart = block.timestamp - SCORE_WINDOW;
        uint256 keep = 0;
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].timestamp >= windowStart) {
                records[keep++] = records[i];
            }
        }
        // Trim the array
        while (records.length > keep) {
            records.pop();
        }
    }

    /// @dev Check if the borrower's recent revenue has dropped to LIQUIDATION_FLOOR.
    function _isRevenueCollapsed(
        Loan storage loan
    ) internal view returns (bool) {
        (uint256 currentAvg, ) = getScore(loan.borrower);
        uint256 floor = (loan.scoreAtOrigination * LIQUIDATION_FLOOR_BPS) /
            10000;
        return currentAvg < floor;
    }

    /// @dev Process escrow redirect when a new reward arrives for a borrower.
    function _applyEscrowRedirect(
        uint256 loanId,
        uint256 rewardAmount
    ) internal {
        Loan storage loan = loans[loanId];
        if (loan.status != LoanStatus.Active) return;

        (uint256 redirected, ) = IRevenueEscrow(revenueEscrow).redirectReward(
            loan.escrowId,
            rewardAmount
        );

        if (redirected > 0) {
            loan.repaid += redirected;
            uint256 totalOwed = loan.principal + accruedInterest(loanId);
            uint256 stillOwed = totalOwed > loan.repaid
                ? totalOwed - loan.repaid
                : 0;
            emit Repayment(loanId, loan.borrower, redirected, stillOwed);

            if (stillOwed == 0) {
                _closeLoan(loanId, LoanStatus.Repaid);
            }
        }
    }

    /// @dev Finalize a loan and release the active-loan slot.
    function _closeLoan(uint256 loanId, LoanStatus status) internal {
        Loan storage loan = loans[loanId];
        loan.status = status;
        activeLoanId[loan.borrower] = 0;

        if (status == LoanStatus.Repaid) {
            IRevenueEscrow(revenueEscrow).releaseEscrow(loan.escrowId);
            emit LoanRepaidInFull(loanId, loan.borrower);
        }
    }
}
