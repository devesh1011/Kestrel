"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  delta: string;
  deltaUp?: boolean;
  variant?: "blue" | "purple";
}

export function StatCard({
  label,
  value,
  delta,
  deltaUp = true,
  variant = "blue",
}: StatCardProps) {
  return (
    <div
      className={`rounded-[20px] p-6 flex flex-col gap-3 ${
        variant === "blue" ? "bg-[#e6f1fd]" : "bg-[#edeefc]"
      }`}
    >
      <p className="text-[14px] font-normal text-black/70">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-[24px] font-semibold leading-8 text-black">
          {value}
        </span>
        <span
          className={`flex items-center gap-0.5 text-[12px] font-medium ${
            deltaUp ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {deltaUp ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          {delta}
        </span>
      </div>
    </div>
  );
}
