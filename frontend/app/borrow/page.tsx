"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { toast } from "sonner";
import {
  Cpu,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { NetworkGuard } from "@/components/NetworkGuard";
import { TxStatusBadge } from "@/components/TxStatusBadge";
import {
  hardwareYieldCoreContract,
  wctcContract,
  spaceRewardEmitterContract,
  HARDWARE_YIELD_CORE_ADDRESS,
} from "@/lib/contracts";
import { creditcoinTestnet } from "@/lib/chains";

const USC_TESTNET_ID = 102036;

export default function BorrowPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Cpu className="h-6 w-6 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Borrow</h1>
        </div>
        <p className="text-zinc-400">
          Node operators borrow CTC against verified on-chain reward history.
        </p>
      </div>

      <NetworkGuard>
        <BorrowContent />
      </NetworkGuard>
    </div>
  );
}

// ─── Loan status enum mapping ───────────────────────────────────────────────
const LOAN_STATUS: Record<number, string> = {
  0: "Active",
  1: "Repaid",
  2: "Defaulted",
  3: "Liquidated",
};

function BorrowContent() {
  const { address } = useAccount();

  // ── Step 1: Get active loan id & credit score ──────────────────────────
  const {
    data: activeLoanIdRaw,
    isLoading: scoreLoading,
    refetch: refetchScore,
  } = useReadContract({
    ...hardwareYieldCoreContract,
    functionName: "activeLoanId",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const activeLoanId = (activeLoanIdRaw ?? 0n) as bigint;
  const hasActiveLoan = activeLoanId > 0n;

  const { data: scoreData } = useReadContracts({
    contracts: address
      ? [
          {
            ...hardwareYieldCoreContract,
            functionName: "getScore",
            args: [address] as const,
          },
        ]
      : [],
  });

  const scoreResult = scoreData?.[0]?.result as unknown as
    | [bigint, bigint]
    | undefined;
  const avgDailyRevenue = scoreResult?.[0] ?? 0n;
  const maxLoanAmount = scoreResult?.[1] ?? 0n;

  // ── Step 2: Read active loan details ──────────────────────────────────
  const { data: loanData, refetch: refetchLoan } = useReadContracts({
    contracts: hasActiveLoan
      ? [
          {
            ...hardwareYieldCoreContract,
            functionName: "loans",
            args: [activeLoanId] as const,
          },
          {
            ...hardwareYieldCoreContract,
            functionName: "accruedInterest",
            args: [activeLoanId] as const,
          },
        ]
      : [],
  });

  const loan = loanData?.[0]?.result as
    | readonly [
        string,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        number,
      ]
    | undefined;
  const accruedInterest = (loanData?.[1]?.result ?? 0n) as bigint;

  // ── Step 3: Read reward history for chart (paginate up to 20) ──────────
  const { data: rewardPages } = useReadContracts({
    contracts: address
      ? Array.from({ length: 20 }, (_, i) => ({
          ...hardwareYieldCoreContract,
          functionName: "rewardHistory",
          args: [address, BigInt(i)] as const,
        }))
      : [],
  });

  const rewardHistory = (rewardPages ?? [])
    .map((r, i) => {
      if (!r?.result) return null;
      const [amount, timestamp] = r.result as unknown as [bigint, bigint];
      if (timestamp === 0n) return null;
      return {
        index: i,
        amount: parseFloat(formatUnits(amount, 18)),
        timestamp: Number(timestamp),
        date: new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    })
    .filter(Boolean) as Array<{
    index: number;
    amount: number;
    timestamp: number;
    date: string;
  }>;

  return (
    <div className="space-y-6">
      {!address && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-10 text-center text-zinc-400">
          Connect your wallet to view your borrower profile.
        </div>
      )}

      {address && (
        <>
          {/* Credit Score Card */}
          <CreditScoreCard
            avgDailyRevenue={avgDailyRevenue}
            maxLoanAmount={maxLoanAmount}
            rewardCount={rewardHistory.length}
            loading={scoreLoading}
          />

          {/* Reward History Chart */}
          <RewardHistoryChart rewards={rewardHistory} />

          <Separator className="bg-zinc-800" />

          {/* Active Loan or Application Form */}
          {hasActiveLoan && loan ? (
            <ActiveLoanCard
              loanId={activeLoanId}
              loan={loan}
              accruedInterest={accruedInterest}
              onRepaid={() => {
                refetchScore();
                refetchLoan();
              }}
            />
          ) : (
            <LoanApplicationForm
              address={address}
              maxLoanAmount={maxLoanAmount}
              rewardCount={rewardHistory.length}
              onApplied={() => {
                refetchScore();
                refetchLoan();
              }}
            />
          )}

          {/* Dev-only reward simulator */}
          {process.env.NODE_ENV === "development" && (
            <SimulateRewardButton
              address={address}
              onDone={() => refetchScore()}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Credit Score Card ───────────────────────────────────────────────────────
function CreditScoreCard({
  avgDailyRevenue,
  maxLoanAmount,
  rewardCount,
  loading,
}: {
  avgDailyRevenue: bigint;
  maxLoanAmount: bigint;
  rewardCount: number;
  loading: boolean;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          Credit Profile
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Derived from on-chain reward history submitted by the oracle worker.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-xs text-zinc-500">Avg Daily Revenue</p>
          {loading ? (
            <Skeleton className="h-6 w-24 bg-zinc-800" />
          ) : (
            <p className="text-lg font-bold text-white">
              {parseFloat(formatUnits(avgDailyRevenue, 18)).toFixed(4)} CTC
            </p>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Max Loan Amount</p>
          {loading ? (
            <Skeleton className="h-6 w-24 bg-zinc-800" />
          ) : (
            <p className="text-lg font-bold text-blue-400">
              {parseFloat(formatUnits(maxLoanAmount, 18)).toFixed(4)} CTC
            </p>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Reward Events</p>
          {loading ? (
            <Skeleton className="h-6 w-12 bg-zinc-800" />
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-white">{rewardCount}</p>
              {rewardCount >= 3 ? (
                <Badge
                  variant="outline"
                  className="border-emerald-700 bg-emerald-950/50 text-emerald-400 text-xs"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Eligible
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-700 bg-amber-950/50 text-amber-400 text-xs"
                >
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Need {3 - rewardCount} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Reward History Chart ────────────────────────────────────────────────────
function RewardHistoryChart({
  rewards,
}: {
  rewards: Array<{ amount: number; date: string }>;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-white">Reward History</CardTitle>
        <CardDescription className="text-zinc-400">
          On-chain verified rewards submitted by the oracle (up to 20 most
          recent)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rewards.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
            No verified rewards found. Run the oracle worker to submit rewards.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={rewards}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fill: "#71717a", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={55}
                tickFormatter={(v) => `${v.toFixed(1)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
                formatter={(v: number | undefined) => [
                  `${(v ?? 0).toFixed(6)} CTC`,
                  "Reward",
                ]}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {rewards.map((_, i) => (
                  <Cell key={i} fill="#3b82f6" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Active Loan Card ────────────────────────────────────────────────────────
function ActiveLoanCard({
  loanId,
  loan,
  accruedInterest,
  onRepaid,
}: {
  loanId: bigint;
  loan: readonly [
    string,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    number,
  ];
  accruedInterest: bigint;
  onRepaid: () => void;
}) {
  const [repayAmt, setRepayAmt] = useState("");
  const { address } = useAccount();

  const [, principal, interestRateBps, startTime, dueTime, , , , statusNum] =
    loan;
  const totalOwed = principal + accruedInterest;
  const dueDate = new Date(Number(dueTime) * 1000);
  const isOverdue = Date.now() > Number(dueTime) * 1000;
  const pctRepaid =
    totalOwed > 0n
      ? Math.min(
          100,
          (Number(formatUnits(accruedInterest, 18)) /
            Number(formatUnits(totalOwed, 18))) *
            100,
        )
      : 0;

  const { writeContract: approveTx, data: approveHash } = useWriteContract();
  const { writeContract: repayTx, data: repayHash } = useWriteContract();

  const { data: allowanceData } = useReadContract({
    ...wctcContract,
    functionName: "allowance",
    args:
      address && HARDWARE_YIELD_CORE_ADDRESS
        ? [address, HARDWARE_YIELD_CORE_ADDRESS]
        : undefined,
    query: { enabled: !!address },
  });
  const allowance = (allowanceData ?? 0n) as bigint;

  const { isLoading: approveConfirming, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: repayConfirming, isSuccess: repayConfirmed } =
    useWaitForTransactionReceipt({ hash: repayHash });

  useEffect(() => {
    if (repayConfirmed) {
      toast.success("Repayment confirmed!");
      onRepaid();
    }
    if (approveConfirmed) {
      toast.success("Approval confirmed! Now repay.");
    }
  }, [repayConfirmed, approveConfirmed, onRepaid]);

  const repayAmountParsed = repayAmt
    ? (() => {
        try {
          return parseUnits(repayAmt, 18);
        } catch {
          return 0n;
        }
      })()
    : 0n;
  const needsApproval = repayAmountParsed > 0n && allowance < repayAmountParsed;

  function handleRepay() {
    if (!repayAmt) return;
    if (needsApproval) {
      approveTx({
        ...wctcContract,
        functionName: "approve",
        args: [HARDWARE_YIELD_CORE_ADDRESS, repayAmountParsed],
      });
    } else {
      repayTx({
        ...hardwareYieldCoreContract,
        functionName: "repay",
        args: [loanId, repayAmountParsed],
      });
    }
  }

  return (
    <Card
      className={`border-zinc-800 bg-zinc-900 ${isOverdue ? "border-red-800/60" : ""}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock
              className={`h-5 w-5 ${isOverdue ? "text-red-400" : "text-blue-400"}`}
            />
            Active Loan #{loanId.toString()}
          </CardTitle>
          <Badge
            variant="outline"
            className={
              isOverdue
                ? "border-red-700 bg-red-950/50 text-red-400"
                : "border-blue-700 bg-blue-950/50 text-blue-400"
            }
          >
            {isOverdue ? "Overdue" : (LOAN_STATUS[statusNum] ?? "Active")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-zinc-500">Principal</p>
            <p className="font-semibold text-white">
              {parseFloat(formatUnits(principal, 18)).toFixed(4)} CTC
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Accrued Interest</p>
            <p className="font-semibold text-amber-400">
              {parseFloat(formatUnits(accruedInterest, 18)).toFixed(6)} CTC
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Total Owed</p>
            <p className="font-semibold text-white">
              {parseFloat(formatUnits(totalOwed, 18)).toFixed(4)} CTC
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Rate (BPS)</p>
            <p className="font-semibold text-white">
              {interestRateBps.toString()}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>Due {dueDate.toLocaleDateString()}</span>
            <span>{pctRepaid.toFixed(1)}% covered by interest</span>
          </div>
          <Progress
            value={pctRepaid}
            className="h-2 bg-zinc-800 [&>div]:bg-blue-500"
          />
        </div>

        <Separator className="bg-zinc-800" />

        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Repay Loan</p>
          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="Amount in WCTC"
              value={repayAmt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRepayAmt(e.target.value)
              }
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              min="0"
              step="0.0001"
            />
            <Button
              onClick={() => setRepayAmt(formatUnits(totalOwed, 18))}
              variant="outline"
              size="sm"
              className="shrink-0 border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
            >
              Full
            </Button>
          </div>
          <Button
            onClick={handleRepay}
            disabled={!repayAmt || repayConfirming || approveConfirming}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
          >
            {approveConfirming
              ? "Approving…"
              : repayConfirming
                ? "Repaying…"
                : needsApproval
                  ? "Approve WCTC"
                  : "Repay"}
          </Button>
          <div className="flex flex-wrap gap-2">
            {approveHash && (
              <TxStatusBadge
                status={
                  approveConfirming
                    ? "pending"
                    : approveConfirmed
                      ? "confirmed"
                      : "pending"
                }
                txHash={approveHash}
              />
            )}
            {repayHash && (
              <TxStatusBadge
                status={
                  repayConfirming
                    ? "pending"
                    : repayConfirmed
                      ? "confirmed"
                      : "pending"
                }
                txHash={repayHash}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loan Application Form ───────────────────────────────────────────────────
function LoanApplicationForm({
  address,
  maxLoanAmount,
  rewardCount,
  onApplied,
}: {
  address: string;
  maxLoanAmount: bigint;
  rewardCount: number;
  onApplied: () => void;
}) {
  const maxFloat = parseFloat(formatUnits(maxLoanAmount, 18));
  const [requestedAmt, setRequestedAmt] = useState("");
  const [escrowBps, setEscrowBps] = useState(2000);

  const { writeContract: approveTx, data: approveHash } = useWriteContract();
  const { writeContract: applyTx, data: applyHash } = useWriteContract();

  const requestedParsed = requestedAmt
    ? (() => {
        try {
          return parseUnits(requestedAmt, 18);
        } catch {
          return 0n;
        }
      })()
    : 0n;

  const { data: allowanceData } = useReadContract({
    ...wctcContract,
    functionName: "allowance",
    args: [address as `0x${string}`, HARDWARE_YIELD_CORE_ADDRESS],
    query: { enabled: !!address },
  });
  const allowance = (allowanceData ?? 0n) as bigint;
  const escrowAmount =
    requestedParsed > 0n ? (requestedParsed * BigInt(escrowBps)) / 10000n : 0n;
  const needsApproval = escrowAmount > 0n && allowance < escrowAmount;

  const { isLoading: approveConfirming, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: applyConfirming, isSuccess: applyConfirmed } =
    useWaitForTransactionReceipt({ hash: applyHash });

  useEffect(() => {
    if (applyConfirmed) {
      toast.success("Loan application submitted!");
      onApplied();
    }
    if (approveConfirmed) {
      toast.success("Approval confirmed! Now apply for loan.");
    }
  }, [applyConfirmed, approveConfirmed, onApplied]);

  function handleApply() {
    if (!requestedAmt) return;
    if (needsApproval) {
      approveTx({
        ...wctcContract,
        functionName: "approve",
        args: [HARDWARE_YIELD_CORE_ADDRESS, escrowAmount],
      });
    } else {
      applyTx({
        ...hardwareYieldCoreContract,
        functionName: "applyForLoan",
        args: [requestedParsed, BigInt(escrowBps)],
      });
    }
  }

  const eligible = rewardCount >= 3;
  const overLimit = requestedParsed > maxLoanAmount && maxLoanAmount > 0n;

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-white">Apply for a Loan</CardTitle>
        <CardDescription className="text-zinc-400">
          Borrow CTC against your verified reward history. An escrow commitment
          is required as collateral.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!eligible && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-800 bg-amber-950/20 p-3 text-sm text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            You need at least 3 verified rewards to be eligible. Have the oracle
            worker submit them first.
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Loan Amount (CTC)
          </label>
          <Input
            type="number"
            placeholder="0.0"
            value={requestedAmt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setRequestedAmt(e.target.value)
            }
            disabled={!eligible}
            className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 disabled:opacity-40"
            min="0"
            max={maxFloat}
            step="0.0001"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Max: {maxFloat.toFixed(4)} CTC</span>
            {overLimit && (
              <span className="text-red-400">Exceeds credit limit</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">
              Escrow Commitment
            </label>
            <span className="text-sm font-bold text-white">
              {escrowBps / 100}% ({(escrowBps / 100).toFixed(0)}% of loan)
            </span>
          </div>
          <Slider
            value={[escrowBps]}
            onValueChange={([v]: number[]) => setEscrowBps(v ?? 2000)}
            min={1000}
            max={5000}
            step={500}
            disabled={!eligible}
            className="[&>span]:bg-blue-500"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>10% (min)</span>
            <span>50% (max)</span>
          </div>
          <p className="text-xs text-zinc-500">
            Escrow hold:{" "}
            <span className="text-zinc-300">
              {requestedAmt
                ? `${parseFloat(formatUnits(escrowAmount, 18)).toFixed(4)} WCTC`
                : "—"}{" "}
            </span>
            locked from your future rewards.
          </p>
        </div>

        <Button
          onClick={handleApply}
          disabled={
            !eligible ||
            !requestedAmt ||
            overLimit ||
            applyConfirming ||
            approveConfirming
          }
          className="w-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
        >
          {approveConfirming
            ? "Approving escrow…"
            : applyConfirming
              ? "Submitting loan…"
              : needsApproval
                ? "Approve Escrow WCTC"
                : "Apply for Loan"}
        </Button>

        <div className="flex flex-wrap gap-2">
          {approveHash && (
            <TxStatusBadge
              status={
                approveConfirming
                  ? "pending"
                  : approveConfirmed
                    ? "confirmed"
                    : "pending"
              }
              txHash={approveHash}
            />
          )}
          {applyHash && (
            <TxStatusBadge
              status={
                applyConfirming
                  ? "pending"
                  : applyConfirmed
                    ? "confirmed"
                    : "pending"
              }
              txHash={applyHash}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dev-only Simulate Reward Button ────────────────────────────────────────
function SimulateRewardButton({
  address,
  onDone,
}: {
  address: string;
  onDone: () => void;
}) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (confirmed) {
      toast.success(
        "Simulated reward claimed on CC3! Oracle will pick it up shortly.",
      );
      // Switch back to USC testnet
      switchChain({ chainId: USC_TESTNET_ID });
      onDone();
    }
  }, [confirmed, switchChain, onDone]);

  async function handleSimulate() {
    if (chainId !== creditcoinTestnet.id) {
      await switchChain({ chainId: creditcoinTestnet.id });
      return;
    }
    writeContract({
      ...spaceRewardEmitterContract,
      functionName: "claimReward",
      args: [parseUnits("50", 18)],
      chainId: creditcoinTestnet.id,
    });
  }

  return (
    <Card className="border-dashed border-zinc-700 bg-zinc-900/50">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-medium text-zinc-300">
            <Zap className="mr-1.5 inline h-3.5 w-3.5 text-yellow-400" />
            Dev: Simulate Reward Claim
          </p>
          <p className="text-xs text-zinc-500">
            Emits RewardClaimed(50 CTC) on CC3 Testnet. Oracle will attest and
            submit to USC.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSimulate}
          disabled={confirming}
          className="border-yellow-700 text-yellow-400 hover:bg-yellow-950/50"
        >
          {chainId !== creditcoinTestnet.id
            ? "Switch to CC3 First"
            : confirming
              ? "Claiming…"
              : "Simulate"}
        </Button>
      </CardContent>
    </Card>
  );
}
