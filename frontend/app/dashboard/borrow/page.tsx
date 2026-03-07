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
  const { address } = useAccount();

  function handleRewardDone() {
    // BorrowContent will refetch on its own via its own polling / refetch calls
    // Nothing to do here at the page level
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-blue-400" />
          <h1 className="text-[20px] font-semibold text-white">Borrow</h1>
        </div>
        <p className="text-[13px] text-zinc-400">
          Node operators borrow CTC against verified on-chain reward history.
        </p>
      </div>

      {/* SimulateRewardButton lives OUTSIDE NetworkGuard so it survives the cc3 network switch */}
      {process.env.NODE_ENV === "development" && address && (
        <SimulateRewardButton address={address} onDone={handleRewardDone} />
      )}

      <NetworkGuard>
        <BorrowContent />
      </NetworkGuard>
    </div>
  );
}

const LOAN_STATUS: Record<number, string> = {
  0: "Active",
  1: "Repaid",
  2: "Defaulted",
  3: "Liquidated",
};

function BorrowContent() {
  const { address } = useAccount();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      {(!mounted || !address) && (
        <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.04] px-6 py-10 text-center text-zinc-400">
          Connect your wallet to view your borrower profile.
        </div>
      )}

      {mounted && address && (
        <>
          <CreditScoreCard
            avgDailyRevenue={avgDailyRevenue}
            maxLoanAmount={maxLoanAmount}
            rewardCount={rewardHistory.length}
            loading={scoreLoading}
          />

          <RewardHistoryChart rewards={rewardHistory} />

          <Separator className="bg-white/[0.06]" />

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

          {/* SimulateRewardButton moved to page level outside NetworkGuard */}
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
    <Card className="border-white/[0.06] bg-white/[0.04]">
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
            <Skeleton className="h-6 w-24 bg-white/10" />
          ) : (
            <p className="text-lg font-bold text-white">
              {parseFloat(formatUnits(avgDailyRevenue, 18)).toFixed(4)} CTC
            </p>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Max Loan Amount</p>
          {loading ? (
            <Skeleton className="h-6 w-24 bg-white/10" />
          ) : (
            <p className="text-lg font-bold text-blue-400">
              {maxLoanAmount > 0n
                ? `${parseFloat(formatUnits(maxLoanAmount, 18)).toFixed(4)} CTC`
                : "0 CTC — insufficient history"}
            </p>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Reward Events</p>
          {loading ? (
            <Skeleton className="h-6 w-12 bg-white/10" />
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
    <Card className="border-white/[0.06] bg-white/[0.04]">
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
            No verified rewards yet. Run the oracle worker to submit rewards
            from cc3.
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
                tickFormatter={(v) => `${(v as number).toFixed(1)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
                formatter={(v: unknown) => [
                  `${((v as number) ?? 0).toFixed(6)} CTC`,
                  "Reward",
                ]}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {rewards.map((_, i) => (
                  <Cell key={i} fill="#7dbbff" />
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

  const [, principal, interestRateBps, , dueTime, , , , statusNum] = loan;
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
      className={`border-white/[0.06] bg-white/[0.04] ${isOverdue ? "!border-red-800/60" : ""}`}
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
            <span>Next auto-repayment: on next reward claim from cc3</span>
          </div>
          <Progress
            value={pctRepaid}
            className="h-2 bg-white/10 [&>div]:bg-sky-500"
          />
        </div>

        <Separator className="bg-white/[0.06]" />

        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Manual Repayment</p>
          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="Amount in WCTC"
              value={repayAmt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRepayAmt(e.target.value)
              }
              className="border-white/[0.10] bg-white/[0.05] text-white placeholder:text-zinc-500"
              min="0"
              step="0.0001"
            />
            <Button
              onClick={() => setRepayAmt(formatUnits(totalOwed, 18))}
              variant="outline"
              size="sm"
              className="shrink-0 border-white/[0.10] bg-white/[0.05] text-zinc-300 hover:text-white"
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
  address: `0x${string}`;
  maxLoanAmount: bigint;
  rewardCount: number;
  onApplied: () => void;
}) {
  const maxCTC = parseFloat(formatUnits(maxLoanAmount, 18));
  const [requestedPct, setRequestedPct] = useState(75);
  const [escrowBps, setEscrowBps] = useState(3000); // 30%

  const requestedAmount =
    maxLoanAmount > 0n ? (maxLoanAmount * BigInt(requestedPct)) / 100n : 0n;

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

  const { writeContract: approveTx, data: approveHash } = useWriteContract();
  const { writeContract: applyTx, data: applyHash } = useWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: applyConfirming, isSuccess: applyConfirmed } =
    useWaitForTransactionReceipt({ hash: applyHash });

  useEffect(() => {
    if (applyConfirmed) {
      toast.success("Loan created!");
      onApplied();
    }
    if (approveConfirmed) {
      toast.success("Approval confirmed!");
    }
  }, [applyConfirmed, approveConfirmed, onApplied]);

  const needsApproval = requestedAmount > 0n && allowance < requestedAmount;
  const canApply = rewardCount >= 3 && maxLoanAmount > 0n;

  function handleApply() {
    if (!canApply || requestedAmount === 0n) return;
    if (needsApproval) {
      approveTx({
        ...wctcContract,
        functionName: "approve",
        args: [HARDWARE_YIELD_CORE_ADDRESS, requestedAmount],
      });
    } else {
      applyTx({
        ...hardwareYieldCoreContract,
        functionName: "applyForLoan",
        args: [requestedAmount, BigInt(escrowBps)],
      });
    }
  }

  if (!canApply) {
    return (
      <Card className="border-white/[0.06] bg-white/[0.04]">
        <CardHeader>
          <CardTitle className="text-white">Apply for Loan</CardTitle>
          <CardDescription className="text-zinc-400">
            You need at least 3 verified reward events to apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {rewardCount === 0
                ? "No rewards found. Deploy the oracle worker and claim rewards on cc3."
                : `${rewardCount}/3 rewards verified. ${3 - rewardCount} more required.`}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/[0.06] bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="text-white">Apply for Loan</CardTitle>
        <CardDescription className="text-zinc-400">
          Borrow up to {maxCTC.toFixed(4)} CTC based on your reward history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Requested Amount</span>
            <span className="font-medium text-white">
              {parseFloat(formatUnits(requestedAmount, 18)).toFixed(4)} CTC (
              {requestedPct}%)
            </span>
          </div>
          <Slider
            min={10}
            max={100}
            step={5}
            value={[requestedPct]}
            onValueChange={([v]) => setRequestedPct(v)}
            className="[&>span:first-child]:bg-white/10 [&>span>span]:bg-blue-500"
          />
          <div className="flex justify-between text-xs text-zinc-600">
            <span>10%</span>
            <span>100% max ({maxCTC.toFixed(2)} CTC)</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Escrow Rate</span>
            <span className="font-medium text-white">
              {(escrowBps / 100).toFixed(0)}% of each future reward auto-repays
              loan
            </span>
          </div>
          <Slider
            min={1000}
            max={5000}
            step={500}
            value={[escrowBps]}
            onValueChange={([v]) => setEscrowBps(v)}
            className="[&>span:first-child]:bg-white/10 [&>span>span]:bg-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-600">
            <span>10%</span>
            <span>50%</span>
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-400 space-y-1">
          <p>
            <span className="text-white font-medium">Requested:</span>{" "}
            {parseFloat(formatUnits(requestedAmount, 18)).toFixed(4)} CTC
          </p>
          <p>
            <span className="text-white font-medium">Escrow:</span>{" "}
            {(escrowBps / 100).toFixed(0)}% of each reward auto-repays
          </p>
          <p>
            <span className="text-white font-medium">Repaid rewards:</span>{" "}
            {(100 - escrowBps / 100).toFixed(0)}% sent to your wallet
          </p>
        </div>

        <Button
          onClick={handleApply}
          disabled={
            requestedAmount === 0n || applyConfirming || approveConfirming
          }
          className="w-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
        >
          {approveConfirming
            ? "Approving…"
            : applyConfirming
              ? "Submitting…"
              : needsApproval
                ? "Approve WCTC"
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

// ─── Simulate Reward Button (dev only) ──────────────────────────────────────
function SimulateRewardButton({
  address,
  onDone,
}: {
  address: `0x${string}`;
  onDone: () => void;
}) {
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({
      hash,
      chainId: creditcoinTestnet.id, // Always check on cc3, not current chain
    });

  // pendingWrite: user clicked but we had to switch chain first — fire tx once we land on cc3
  const [pendingWrite, setPendingWrite] = useState(false);

  // Once chain switch completes and we land on cc3, fire the write
  useEffect(() => {
    if (pendingWrite && chainId === creditcoinTestnet.id) {
      setPendingWrite(false);
      writeContract({
        ...spaceRewardEmitterContract,
        functionName: "claimReward",
        args: [parseUnits("50", 18)],
      });
    }
  }, [chainId, pendingWrite, writeContract]);

  // After confirm, switch back to USC Testnet v2 and refresh data
  useEffect(() => {
    if (confirmed) {
      toast.success(
        "Reward claimed on cc3 — oracle worker will pick this up within ~30 seconds.",
      );
      onDone();
      switchChain({ chainId: USC_TESTNET_ID });
    }
  }, [confirmed, onDone, switchChain]);

  useEffect(() => {
    if (writeError) {
      toast.error(`tx failed: ${writeError.message.split("\n")[0]}`);
    }
  }, [writeError]);

  function handleSimulate() {
    if (chainId !== creditcoinTestnet.id) {
      setPendingWrite(true);
      switchChain({ chainId: creditcoinTestnet.id });
    } else {
      writeContract({
        ...spaceRewardEmitterContract,
        functionName: "claimReward",
        args: [parseUnits("50", 18)],
      });
    }
  }

  const busy = isSwitching || pendingWrite || isWritePending || confirming;

  function buttonLabel() {
    if (isSwitching || pendingWrite) return "Switching to cc3…";
    if (isWritePending) return "Confirm in MetaMask…";
    if (confirming) return "Confirming on cc3…";
    return "Claim 50 CTC Reward";
  }

  return (
    <Card className="border-dashed border-amber-800/40 bg-amber-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400 text-sm">
          <Zap className="h-4 w-4" />
          Dev Tool — Simulate Reward Claim
        </CardTitle>
        <CardDescription className="text-zinc-500 text-xs">
          Calls SpaceRewardEmitter.claimReward(50 CTC) on cc3. Auto-switches
          network. MIN_CLAIM_INTERVAL = 50 blocks (~10 min).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={handleSimulate}
          disabled={busy}
          variant="outline"
          className="border-amber-700 text-amber-400 hover:bg-amber-950/50 disabled:opacity-50"
        >
          {buttonLabel()}
        </Button>
        {hash && (
          <TxStatusBadge
            status={
              confirming ? "pending" : confirmed ? "confirmed" : "pending"
            }
            txHash={hash}
          />
        )}
      </CardContent>
    </Card>
  );
}
