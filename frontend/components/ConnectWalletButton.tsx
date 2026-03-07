"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const USC_TESTNET_ID = 102036;

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isConnected || !address) {
    return (
      <Button
        onClick={() => connect({ connector: metaMask() })}
        size="sm"
        className="h-8 gap-1.5 bg-emerald-600 px-3 text-[12px] font-medium text-white hover:bg-emerald-500"
      >
        <Wallet className="h-3.5 w-3.5" />
        Connect Wallet
      </Button>
    );
  }

  const onWrongNetwork = chainId !== USC_TESTNET_ID;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`h-8 gap-1.5 px-3 text-[12px] font-medium ${
            onWrongNetwork
              ? "border-amber-700 text-amber-400 hover:bg-amber-950/50"
              : "border-white/[0.10] bg-white/[0.05] text-zinc-200 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              onWrongNetwork ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
          {truncate(address)}
          <ChevronDown className="h-3 w-3 text-zinc-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 border-white/[0.08] bg-[#1a1b23] text-zinc-200"
      >
        <div className="px-2 py-1.5">
          <p className="text-[11px] text-zinc-500">Connected wallet</p>
          <p className="text-[12px] font-medium text-white">{truncate(address)}</p>
          {onWrongNetwork && (
            <p className="mt-0.5 text-[11px] text-amber-400">Wrong network</p>
          )}
        </div>
        <DropdownMenuSeparator className="bg-white/[0.06]" />
        {onWrongNetwork && (
          <>
            <DropdownMenuItem
              onClick={() => switchChain({ chainId: USC_TESTNET_ID })}
              className="cursor-pointer gap-2 text-[12px] text-amber-400 focus:bg-white/[0.06] focus:text-amber-300"
            >
              Switch to USC Testnet v2
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
          </>
        )}
        <DropdownMenuItem
          onClick={() => disconnect()}
          className="cursor-pointer gap-2 text-[12px] text-zinc-400 focus:bg-white/[0.06] focus:text-zinc-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
