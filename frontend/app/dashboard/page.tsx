"use client";

import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { StatCard } from "@/components/StatCard";
import { RewardHistoryChart } from "@/components/charts/RewardHistoryChart";
import { CapitalAllocationChart } from "@/components/charts/CapitalAllocationChart";
import {
  lenderVaultContract,
  hardwareYieldCoreContract,
} from "@/lib/contracts";

export default function DashboardPage() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...lenderVaultContract, functionName: "totalAssets" }, // [0]
      { ...lenderVaultContract, functionName: "totalLoaned" }, // [1]
      { ...lenderVaultContract, functionName: "totalInterestEarned" }, // [2]
      { ...lenderVaultContract, functionName: "availableLiquidity" }, // [3]
      { ...hardwareYieldCoreContract, functionName: "nextLoanId" }, // [4]
    ],
  });

  const fmt = (raw: unknown) => {
    if (typeof raw !== "bigint") return "—";
    return Number(formatUnits(raw, 18)).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
  };

  const tvl = data?.[0]?.result;
  const totalLoaned = data?.[1]?.result;
  const interestEarned = data?.[2]?.result;
  const availableLiquidity = data?.[3]?.result;
  const activeLoanCount = data?.[4]?.result;

  const totalLoanCount =
    typeof activeLoanCount === "bigint" ? activeLoanCount.toString() : "0";

  const loanedNum =
    typeof totalLoaned === "bigint" ? Number(formatUnits(totalLoaned, 18)) : 0;
  const availableNum =
    typeof availableLiquidity === "bigint"
      ? Number(formatUnits(availableLiquidity, 18))
      : 0;

  return (
    <div className="space-y-6">
      {/* Page header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-white">Overview</h1>
        <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.10] px-3 py-1.5 text-[13px] text-zinc-300 hover:bg-white/5">
          Today
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 gap-7 lg:grid-cols-4">
        <StatCard
          label="Total Deposits"
          value={`${fmt(tvl)} CTC`}
          delta="+8%"
          variant="blue"
        />
        <StatCard
          label="Active Loans"
          value={totalLoanCount}
          delta="+2%"
          variant="purple"
        />
        <StatCard
          label="Total Borrowed"
          value={`${fmt(totalLoaned)} CTC`}
          delta="-1%"
          deltaUp={false}
          variant="blue"
        />
        <StatCard
          label="Avg. APR"
          value="12.4%"
          delta="0%"
          deltaUp
          variant="purple"
        />
      </div>

      {/* Row 2: Reward History — full width */}
      <div className="rounded-[20px] bg-white/[0.04] p-6">
        <h3 className="mb-4 text-[14px] font-semibold text-white">
          Reward History
        </h3>
        <div className="h-52">
          <RewardHistoryChart />
        </div>
      </div>

      {/* Row 3: Capital Allocation + Protocol Stats */}
      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-[20px] bg-white/[0.04] p-6">
          <h3 className="mb-4 text-[14px] font-semibold text-white">
            Capital Allocation
          </h3>
          <div className="h-52">
            <CapitalAllocationChart
              loaned={loanedNum}
              available={availableNum}
              isLoading={isLoading}
            />
          </div>
        </div>
        <div className="rounded-[20px] bg-white/[0.04] p-6 flex flex-col">
          <h3 className="mb-5 text-[14px] font-semibold text-white">
            Protocol Stats
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-[12px] text-zinc-500 mb-0.5">
                All-time Interest Earned
              </p>
              <p className="text-[22px] font-semibold text-[#6be6d3]">
                {fmt(interestEarned)} CTC
              </p>
            </div>
            <div>
              <p className="text-[12px] text-zinc-500 mb-0.5">
                Available Liquidity
              </p>
              <p className="text-[22px] font-semibold text-[#7dbbff]">
                {fmt(availableLiquidity)} CTC
              </p>
            </div>
            <div>
              <p className="text-[12px] text-zinc-500 mb-0.5">
                Utilization Rate
              </p>
              <p className="text-[22px] font-semibold text-white">
                {loanedNum + availableNum > 0
                  ? `${((loanedNum / (loanedNum + availableNum)) * 100).toFixed(1)}%`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
