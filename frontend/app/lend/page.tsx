"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, parseAbi } from "viem";
import { toast } from "sonner";
import {
  TrendingUp,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  lenderVaultContract,
  wctcContract,
  LENDER_VAULT_ADDRESS,
  WCTC_ADDRESS,
} from "@/lib/contracts";
import { creditcoinUSC } from "@/lib/chains";

const FUNDS_RECEIVED_ABI = parseAbi(["event FundsReceived(uint256 amount)"]);

interface YieldDay {
  date: string;
  amount: number;
}

export default function LendPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h1 className="text-[20px] font-semibold text-white">Lend</h1>
        </div>
        <p className="text-[13px] text-zinc-400">
          Deposit WCTC into the ERC-4626 vault and earn interest from DePIN node
          loans.
        </p>
      </div>

      <NetworkGuard>
        <LendContent />
      </NetworkGuard>
    </div>
  );
}

function LendContent() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: creditcoinUSC.id });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [yieldHistory, setYieldHistory] = useState<YieldDay[]>([]);
  const [yieldLoading, setYieldLoading] = useState(true);

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...lenderVaultContract, functionName: "totalAssets" },
      { ...lenderVaultContract, functionName: "availableLiquidity" },
      { ...lenderVaultContract, functionName: "totalInterestEarned" },
      ...(address
        ? [
            {
              ...lenderVaultContract,
              functionName: "balanceOf",
              args: [address] as const,
            },
            {
              ...wctcContract,
              functionName: "balanceOf",
              args: [address] as const,
            },
            {
              ...wctcContract,
              functionName: "allowance",
              args: [address, LENDER_VAULT_ADDRESS] as const,
            },
          ]
        : []),
    ],
  });

  const totalAssets = (data?.[0]?.result ?? 0n) as bigint;
  const availableLiquidity = (data?.[1]?.result ?? 0n) as bigint;
  const totalInterestEarned = (data?.[2]?.result ?? 0n) as bigint;
  const shares = address ? ((data?.[3]?.result ?? 0n) as bigint) : 0n;
  const wctcBalance = address ? ((data?.[4]?.result ?? 0n) as bigint) : 0n;
  const allowance = address ? ((data?.[5]?.result ?? 0n) as bigint) : 0n;

  // Read position value (shares → assets)
  const { data: positionData } = useReadContracts({
    contracts:
      shares > 0n
        ? [
            {
              ...lenderVaultContract,
              functionName: "convertToAssets",
              args: [shares] as const,
            },
          ]
        : [],
  });
  const positionValue = (positionData?.[0]?.result ?? 0n) as bigint;

  // Write hooks
  const { writeContract: approveTx, data: approveHash } = useWriteContract();
  const { writeContract: depositTx, data: depositHash } = useWriteContract();
  const { writeContract: withdrawTx, data: withdrawHash } = useWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: depositConfirming, isSuccess: depositConfirmed } =
    useWaitForTransactionReceipt({ hash: depositHash });
  const { isLoading: withdrawConfirming, isSuccess: withdrawConfirmed } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  useEffect(() => {
    if (depositConfirmed || withdrawConfirmed || approveConfirmed) {
      refetch();
      if (depositConfirmed) toast.success("Deposit confirmed!");
      if (withdrawConfirmed) toast.success("Withdrawal confirmed!");
      if (approveConfirmed) toast.success("Approval confirmed! Now deposit.");
    }
  }, [depositConfirmed, withdrawConfirmed, approveConfirmed, refetch]);

  // Fetch FundsReceived events for yield history chart
  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    async function fetchYield() {
      if (!publicClient) return;
      try {
        const toBlock = await publicClient.getBlockNumber();
        const fromBlock = toBlock > 10000n ? toBlock - 10000n : 0n;

        const logs = await publicClient.getLogs({
          address: LENDER_VAULT_ADDRESS,
          event: FUNDS_RECEIVED_ABI[0],
          fromBlock,
          toBlock,
        });

        // Aggregate by UTC day
        const byDay = new Map<string, number>();
        for (const log of logs) {
          if (!log.args.amount) continue;
          const block = await publicClient.getBlock({
            blockNumber: log.blockNumber,
          });
          const date = new Date(Number(block.timestamp) * 1000)
            .toISOString()
            .slice(0, 10);
          byDay.set(
            date,
            (byDay.get(date) ?? 0) +
              parseFloat(formatUnits(log.args.amount, 18)),
          );
        }

        if (!cancelled) {
          setYieldHistory(
            Array.from(byDay.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-14)
              .map(([date, amount]) => ({ date, amount })),
          );
        }
      } catch {
        // Silently fail — chart just stays empty
      } finally {
        if (!cancelled) setYieldLoading(false);
      }
    }

    fetchYield();
    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  function handleDeposit() {
    if (!address || !depositAmt) return;
    const amount = parseUnits(depositAmt, 18);
    if (allowance < amount) {
      approveTx({
        ...wctcContract,
        functionName: "approve",
        args: [LENDER_VAULT_ADDRESS, amount],
      });
    } else {
      depositTx({
        ...lenderVaultContract,
        functionName: "deposit",
        args: [amount, address],
      });
    }
  }

  function handleWithdraw() {
    if (!address || !withdrawAmt) return;
    const amount = parseUnits(withdrawAmt, 18);
    withdrawTx({
      ...lenderVaultContract,
      functionName: "withdraw",
      args: [amount, address, address],
    });
  }

  const depositAmountParsed = depositAmt
    ? (() => {
        try {
          return parseUnits(depositAmt, 18);
        } catch {
          return 0n;
        }
      })()
    : 0n;
  const needsApproval =
    depositAmountParsed > 0n && allowance < depositAmountParsed;
  const depositDisabled =
    !depositAmt || !address || depositConfirming || approveConfirming;
  const withdrawAmountParsed = withdrawAmt
    ? (() => {
        try {
          return parseUnits(withdrawAmt, 18);
        } catch {
          return 0n;
        }
      })()
    : 0n;
  const withdrawDisabled =
    !withdrawAmt ||
    !address ||
    withdrawConfirming ||
    withdrawAmountParsed > availableLiquidity;

  return (
    <div className="space-y-6">
      {/* Position & vault stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-white/[0.06] bg-white/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Your Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted ? (
              <Skeleton className="h-7 w-28 bg-white/10" />
            ) : !address ? (
              <p className="text-sm text-zinc-500">Connect wallet</p>
            ) : isLoading ? (
              <Skeleton className="h-7 w-28 bg-white/10" />
            ) : (
              <>
                <p className="text-2xl font-bold text-white">
                  {parseFloat(formatUnits(positionValue, 18)).toFixed(4)} CTC
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {parseFloat(formatUnits(shares, 18)).toFixed(4)} vault shares
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-white/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Vault TVL
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28 bg-white/10" />
            ) : (
              <>
                <p className="text-2xl font-bold text-white">
                  {parseFloat(formatUnits(totalAssets, 18)).toFixed(2)} CTC
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {parseFloat(formatUnits(availableLiquidity, 18)).toFixed(2)}{" "}
                  CTC available
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-white/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              All-Time Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28 bg-white/10" />
            ) : (
              <p className="text-2xl font-bold text-emerald-400">
                {parseFloat(formatUnits(totalInterestEarned, 18)).toFixed(4)}{" "}
                CTC
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deposit / Withdraw */}
      <Card className="border-white/[0.06] bg-white/[0.04]">
        <CardHeader>
          <CardTitle className="text-white">Manage Position</CardTitle>
          <CardDescription className="text-zinc-400">
            Deposit or withdraw WCTC from the vault.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deposit">
            <TabsList className="mb-6 bg-white/[0.05]">
              <TabsTrigger value="deposit">
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw">
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                Withdraw
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deposit" className="space-y-4">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span>WCTC Balance</span>
                <span>
                  {address && !isLoading
                    ? `${parseFloat(formatUnits(wctcBalance, 18)).toFixed(4)} WCTC`
                    : "—"}
                </span>
              </div>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="Amount in WCTC"
                  value={depositAmt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDepositAmt(e.target.value)
                  }
                  className="border-white/[0.10] bg-white/[0.05] text-white placeholder:text-zinc-500"
                  min="0"
                  step="0.0001"
                />
                <Button
                  onClick={() =>
                    address && setDepositAmt(formatUnits(wctcBalance, 18))
                  }
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-white/[0.10] bg-white/[0.05] text-zinc-300 hover:text-white"
                >
                  Max
                </Button>
              </div>
              <Button
                onClick={handleDeposit}
                disabled={depositDisabled}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
              >
                {approveConfirming
                  ? "Approving…"
                  : depositConfirming
                    ? "Depositing…"
                    : needsApproval
                      ? "Approve WCTC"
                      : "Deposit"}
              </Button>
              <div className="flex gap-2 flex-wrap">
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
                {depositHash && (
                  <TxStatusBadge
                    status={
                      depositConfirming
                        ? "pending"
                        : depositConfirmed
                          ? "confirmed"
                          : "pending"
                    }
                    txHash={depositHash}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="withdraw" className="space-y-4">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span>Available Liquidity</span>
                <span>
                  {!isLoading
                    ? `${parseFloat(formatUnits(availableLiquidity, 18)).toFixed(4)} CTC`
                    : "—"}
                </span>
              </div>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="Amount in WCTC"
                  value={withdrawAmt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setWithdrawAmt(e.target.value)
                  }
                  className="border-white/[0.10] bg-white/[0.05] text-white placeholder:text-zinc-500"
                  min="0"
                  step="0.0001"
                />
                <Button
                  onClick={() =>
                    setWithdrawAmt(formatUnits(availableLiquidity, 18))
                  }
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-white/[0.10] bg-white/[0.05] text-zinc-300 hover:text-white"
                >
                  Max
                </Button>
              </div>
              {withdrawAmountParsed > availableLiquidity && withdrawAmt && (
                <p className="text-xs text-red-400">
                  Amount exceeds available vault liquidity (
                  {parseFloat(formatUnits(availableLiquidity, 18)).toFixed(4)}{" "}
                  CTC).
                </p>
              )}
              <Button
                onClick={handleWithdraw}
                disabled={withdrawDisabled}
                variant="outline"
                className="w-full border-emerald-700 text-emerald-400 hover:bg-emerald-950/50 disabled:opacity-50"
              >
                {withdrawConfirming ? "Withdrawing…" : "Withdraw"}
              </Button>
              {withdrawHash && (
                <TxStatusBadge
                  status={
                    withdrawConfirming
                      ? "pending"
                      : withdrawConfirmed
                        ? "confirmed"
                        : "pending"
                  }
                  txHash={withdrawHash}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Separator className="bg-white/[0.06]" />

      {/* Yield history chart */}
      <Card className="border-white/[0.06] bg-white/[0.04]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Yield History</CardTitle>
            <CardDescription className="text-zinc-400">
              Interest repaid to the vault (FundsReceived events · last 14 days)
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white"
            onClick={() => {
              setYieldLoading(true);
              setYieldHistory([]);
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {yieldLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Skeleton className="h-40 w-full bg-white/10" />
            </div>
          ) : yieldHistory.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-zinc-500 text-sm">
              No yield events found in the last 10,000 blocks.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={yieldHistory}
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
                  tickFormatter={(v) => `${v.toFixed(3)}`}
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
                    "Interest",
                  ]}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />
                <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                  {yieldHistory.map((_, i) => (
                    <Cell key={i} fill="#6be6d3" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* WCTC wrap helper */}
      <Card className="border-white/[0.06] bg-white/[0.04]">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-white">
            Wrap CTC → WCTC
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs">
            The vault uses WCTC (ERC-20 wrapped CTC). Send CTC to the WCTC
            contract to wrap it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WrapCTC wctcBalance={wctcBalance} onSuccess={refetch} />
        </CardContent>
      </Card>
    </div>
  );
}

function WrapCTC({
  wctcBalance,
  onSuccess,
}: {
  wctcBalance: bigint;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (confirmed) {
      toast.success("CTC wrapped to WCTC!");
      onSuccess();
    }
  }, [confirmed, onSuccess]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>Current WCTC balance</span>
        <span>{parseFloat(formatUnits(wctcBalance, 18)).toFixed(4)} WCTC</span>
      </div>
      <div className="flex gap-3">
        <Input
          type="number"
          placeholder="CTC to wrap"
          value={amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setAmount(e.target.value)
          }
          className="border-white/[0.10] bg-white/[0.05] text-white placeholder:text-zinc-500"
          min="0"
          step="0.0001"
        />
        <Button
          onClick={() => {
            if (!amount) return;
            writeContract({
              ...wctcContract,
              functionName: "deposit",
              value: parseUnits(amount, 18),
            });
          }}
          disabled={!amount || confirming}
          variant="outline"
          className="shrink-0 border-white/[0.10] bg-white/[0.05] text-zinc-300 hover:text-white"
        >
          {confirming ? "Wrapping…" : "Wrap"}
        </Button>
      </div>
      {hash && (
        <TxStatusBadge
          status={confirming ? "pending" : confirmed ? "confirmed" : "pending"}
          txHash={hash}
        />
      )}
    </div>
  );
}
