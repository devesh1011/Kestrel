"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export function TrafficByDeviceChart() {
  const devices = [
    { name: "Linux", value: 6200, fill: "#a0bce8" },
    { name: "Mac", value: 5100, fill: "#6be6d3" },
    { name: "iOS", value: 4800, fill: "#000000" },
    { name: "Windows", value: 7400, fill: "#7dbbff" },
    { name: "Android", value: 3200, fill: "#b899eb" },
    { name: "Other", value: 1800, fill: "#71dd8c" },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={devices} barSize={24}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1e2028",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {devices.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
