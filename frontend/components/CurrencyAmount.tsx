"use client";

import { formatUnits } from "viem";

interface CurrencyAmountProps {
  value: bigint;
  decimals?: number;
  symbol?: string;
  decimalsToShow?: number;
  className?: string;
}

export function CurrencyAmount({
  value,
  decimals = 18,
  symbol = "CTC",
  decimalsToShow = 4,
  className,
}: CurrencyAmountProps) {
  const formatted = parseFloat(formatUnits(value, decimals)).toFixed(
    decimalsToShow,
  );
  return (
    <span className={className}>
      {formatted} {symbol}
    </span>
  );
}
