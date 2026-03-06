"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CapitalAllocationChartProps {
  loaned: number;
  available: number;
  isLoading?: boolean;
}

const COLORS = ["#7dbbff", "#6be6d3"];
const PLACEHOLDER = [
  { name: "Loaned", value: 60 },
  { name: "Available", value: 40 },
];

export function CapitalAllocationChart({
  loaned,
  available,
  isLoading = false,
}: CapitalAllocationChartProps) {
  const total = loaned + available;

  if (isLoading) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={PLACEHOLDER}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            dataKey="value"
            stroke="none"
          >
            {PLACEHOLDER.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} fillOpacity={0.15} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (total === 0) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={PLACEHOLDER}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            dataKey="value"
            stroke="none"
          >
            {PLACEHOLDER.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} fillOpacity={0.25} />
            ))}
          </Pie>
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#52525b"
            fontSize={12}
          >
            No deposits yet
          </text>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const chartData = [
    { name: "Loaned", value: Number(loaned.toFixed(2)) },
    { name: "Available", value: Number(available.toFixed(2)) },
  ];

  return (
    <div className="flex flex-col h-full">
      <ResponsiveContainer width="100%" height="70%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e2028",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "13px",
            }}
            formatter={(v: number | undefined) => [
              `${(v ?? 0).toFixed(2)} CTC`,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex-1 flex flex-col justify-center space-y-2 px-4">
        {chartData.map((segment, i) => (
          <div key={segment.name} className="flex items-center gap-1.5">
            <div
              style={{ background: COLORS[i] }}
              className="h-2.5 w-2.5 rounded-sm"
            />
            <span className="text-[12px] text-zinc-300">{segment.name}</span>
            <span className="ml-auto text-[12px] font-medium text-white">
              {((segment.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
