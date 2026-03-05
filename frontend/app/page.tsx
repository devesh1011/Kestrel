"use client";

import Link from "next/link";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { TrendingUp, Banknote, Activity, ArrowRight, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  lenderVaultContract,
  hardwareYieldCoreContract,
} from "@/lib/contracts";

export default function DashboardPage() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...lenderVaultContract, functionName: "totalAssets" },
      { ...lenderVaultContract, functionName: "totalLoaned" },
      { ...lenderVaultContract, functionName: "totalInterestEarned" },
      { ...lenderVaultContract, functionName: "availableLiquidity" },
      { ...hardwareYieldCoreContract, functionName: "nextLoanId" },
    ],
  });

  const totalAssets = (data?.[0]?.result ?? 0n) as bigint;
  const totalLoaned = (data?.[1]?.result ?? 0n) as bigint;
  const totalInterestEarned = (data?.[2]?.result ?? 0n) as bigint;
  const availableLiquidity = (data?.[3]?.result ?? 0n) as bigint;
  const nextLoanId = (data?.[4]?.result ?? 1n) as bigint;

  const totalLoanCount = Number(nextLoanId) - 1;

  const apyPercent =
    totalAssets > 0n
      ? (Number(formatUnits(totalInterestEarned, 18)) /
          Number(formatUnits(totalAssets, 18))) *
        100
      : 0;

  const utilizationPct =
    totalAssets > 0n
      ? Math.min(
          100,
          (Number(formatUnits(totalLoaned, 18)) /
            Number(formatUnits(totalAssets, 18))) *
            100,
        )
      : 0;

  function StatCard({
    title,
    icon: Icon,
    value,
    sub,
    iconColor = "text-emerald-400",
  }: {
    title: string;
    icon: React.ElementType;
    value: string;
    sub?: string;
    iconColor?: string;
  }) {
    return (
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-zinc-400">
            {title}
          </CardTitle>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-32 bg-zinc-800" />
          ) : (
            <>
              <p className="text-2xl font-bold text-white">{value}</p>
              {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Cpu className="h-6 w-6 text-emerald-400" />
          <h1 className="text-3xl font-bold text-white">Protocol Dashboard</h1>
        </div>
        <p className="text-zinc-400">
          DePIN micro-lending on Creditcoin — borrow CTC against verifiable node
          reward history.
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Value Locked"
          icon={Banknote}
          value={`${parseFloat(formatUnits(totalAssets, 18)).toFixed(2)} CTC`}
          sub="Lender deposits in vault"
        />
        <StatCard
          title="Total Loaned Out"
          icon={Activity}
          value={`${parseFloat(formatUnits(totalLoaned, 18)).toFixed(2)} CTC`}
          sub={`${totalLoanCount} loan${totalLoanCount !== 1 ? "s" : ""} originated`}
        />
        <StatCard
          title="All-Time Yield"
          icon={TrendingUp}
          value={`${apyPercent.toFixed(2)}%`}
          sub={`${parseFloat(formatUnits(totalInterestEarned, 18)).toFixed(4)} CTC earned`}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Available Liquidity"
          icon={Banknote}
          value={`${parseFloat(formatUnits(availableLiquidity, 18)).toFixed(2)} CTC`}
          sub="Ready to lend"
          iconColor="text-blue-400"
        />
      </div>

      {/* Utilization bar */}
      <Card className="mb-8 border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-zinc-400">
            <span>Vault Utilization</span>
            {isLoading ? (
              <Skeleton className="h-4 w-16 bg-zinc-800" />
            ) : (
              <span className="text-white">{utilizationPct.toFixed(1)}%</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {isLoading ? (
            <Skeleton className="h-3 w-full bg-zinc-800" />
          ) : (
            <Progress
              value={utilizationPct}
              className="h-3 bg-zinc-800 [&>div]:bg-emerald-500"
            />
          )}
          <p className="mt-2 text-xs text-zinc-500">
            {utilizationPct > 80
              ? "High utilization — vault is mostly deployed."
              : utilizationPct > 40
                ? "Healthy utilization — balanced lending activity."
                : "Low utilization — liquidity available for new loans."}
          </p>
        </CardContent>
      </Card>

      {/* CTA cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900 transition-colors hover:border-emerald-700/50 hover:bg-zinc-800/50">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-white">
                Earn Yield as a Lender
              </h3>
              <p className="text-sm text-zinc-400">
                Deposit WCTC into the ERC-4626 vault and earn interest from
                verified DePIN node loans.
              </p>
            </div>
            <Link href="/lend">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                Go to Lend
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900 transition-colors hover:border-blue-700/50 hover:bg-zinc-800/50">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950 text-blue-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-white">
                Borrow Against Node Rewards
              </h3>
              <p className="text-sm text-zinc-400">
                Node operators with verified on-chain reward history can take
                CTC loans secured by future rewards.
              </p>
            </div>
            <Link href="/borrow">
              <Button
                variant="outline"
                className="w-full border-blue-700 bg-blue-950/50 text-blue-300 hover:bg-blue-900/50 hover:text-white"
              >
                Go to Borrow
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
