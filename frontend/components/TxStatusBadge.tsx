"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BLOCKSCOUT_BASE = process.env.NEXT_PUBLIC_CTC_TESTNET_EXPLORER;

interface TxStatusBadgeProps {
  status: "pending" | "confirmed" | "failed";
  txHash?: `0x${string}`;
}

const STATUS_STYLES = {
  pending: "border-amber-700 bg-amber-950/50 text-amber-400",
  confirmed: "border-emerald-700 bg-emerald-950/50 text-emerald-400",
  failed: "border-red-700 bg-red-950/50 text-red-400",
} as const;

export function TxStatusBadge({ status, txHash }: TxStatusBadgeProps) {
  const label = {
    pending: "Pending",
    confirmed: "Confirmed",
    failed: "Failed",
  }[status];

  const badge = (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {status === "pending" && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      )}
      {label}
      {txHash && <ExternalLink className="ml-1.5 h-3 w-3" />}
    </Badge>
  );

  if (txHash) {
    return (
      <a
        href={`${BLOCKSCOUT_BASE}/tx/${txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex"
      >
        {badge}
      </a>
    );
  }

  return badge;
}
