"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { metaMask } from "wagmi/connectors";
import { Cpu, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const USC_TESTNET_ID = 102036;

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/lend", label: "Lend" },
  { href: "/borrow", label: "Borrow" },
];

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function Navbar() {
  const pathname = usePathname();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== USC_TESTNET_ID;

  return (
    <>
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-white"
        >
          <Cpu className="h-5 w-5 text-emerald-400" />
          <span className="text-lg tracking-tight">Kestrel</span>
        </Link>

        {/* Nav links */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isConnected && address ? (
            <>
              {wrongNetwork ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => switchChain({ chainId: USC_TESTNET_ID })}
                  className="text-xs"
                >
                  Switch Network
                </Button>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-700 bg-emerald-950/50 text-emerald-400 text-xs"
                >
                  Creditcoin USC
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => disconnect()}
                className="border-zinc-700 bg-zinc-900 font-mono text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                {truncateAddress(address)}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => connect({ connector: metaMask() })}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </nav>

      {wrongNetwork && (
        <div className="flex items-center justify-center gap-2 bg-amber-950/80 px-4 py-2 text-amber-400 text-sm border-b border-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Wrong network detected. Please switch to{" "}
            <button
              className="font-semibold underline underline-offset-2 hover:text-amber-300"
              onClick={() => switchChain({ chainId: USC_TESTNET_ID })}
            >
              Creditcoin USC Testnet v2
            </button>{" "}
            to interact with the protocol.
          </span>
        </div>
      )}
    </>
  );
}
