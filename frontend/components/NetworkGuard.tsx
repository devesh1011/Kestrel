"use client";

import { useChainId } from "wagmi";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSwitchChain } from "wagmi";

const USC_TESTNET_ID = 102036;

interface NetworkGuardProps {
  children: React.ReactNode;
}

export function NetworkGuard({ children }: NetworkGuardProps) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (chainId !== USC_TESTNET_ID) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-amber-800 bg-amber-950/20 p-10 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <h2 className="text-xl font-semibold text-white">Wrong Network</h2>
        <p className="max-w-sm text-sm text-zinc-400">
          Connect to{" "}
          <span className="font-medium text-white">
            Creditcoin USC Testnet v2
          </span>{" "}
          (Chain ID 102036) to use this feature.
        </p>
        <Button
          onClick={() => switchChain({ chainId: USC_TESTNET_ID })}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          Switch to Creditcoin USC
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
