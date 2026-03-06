"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatUnits } from "viem";
import { hardwareYieldCoreContract } from "@/lib/contracts";

interface DayData {
  day: string;
  thisMonth: number;
  lastMonth: number;
}

export function RewardHistoryChart() {
  const publicClient = usePublicClient();
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicClient) return;

    async function fetchLogs() {
      try {
        const blockNumber = await publicClient!.getBlockNumber();
        const fromBlock = blockNumber > 10000n ? blockNumber - 10000n : 0n;

        const logs = await publicClient!.getLogs({
          address: hardwareYieldCoreContract.address,
          event: {
            type: "event",
            name: "RewardRecorded",
            inputs: [
              { type: "address", name: "nodeWallet", indexed: true },
              { type: "uint256", name: "amount", indexed: false },
              { type: "uint256", name: "timestamp", indexed: false },
            ],
          },
          fromBlock,
          toBlock: blockNumber,
        });

        // Initialize last 14 days
        const now = Date.now();
        const byDay: Record<string, number> = {};
        for (let i = 13; i >= 0; i--) {
          const key = new Date(now - i * 86_400_000).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" },
          );
          byDay[key] = 0;
        }

        for (const log of logs) {
          const args = log.args as { amount?: bigint; timestamp?: bigint };
          if (!args.amount || !args.timestamp) continue;
          const key = new Date(
            Number(args.timestamp) * 1000,
          ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (key in byDay) {
            byDay[key] += Number(formatUnits(args.amount, 18));
          }
        }

        setData(
          Object.entries(byDay).map(([day, rewards]) => ({
            day,
            thisMonth: Number(rewards.toFixed(4)),
            lastMonth: Number((rewards * 0.8).toFixed(4)), // Mock last period data
          })),
        );
      } catch {
        // Contract not yet deployed or RPC error — show empty shape
        const now = Date.now();
        setData(
          Array.from({ length: 14 }, (_, i) => ({
            day: new Date(now - (13 - i) * 86_400_000).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric" },
            ),
            thisMonth: 0,
            lastMonth: 0,
          })),
        );
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [publicClient]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="h-4 w-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="day"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v / 1000}K`}
        />
        <Tooltip
          contentStyle={{
            background: "#1e2028",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="thisMonth"
          name="This Period"
          stroke="#7dbbff"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="lastMonth"
          name="Last Period"
          stroke="rgba(125,187,255,0.35)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
