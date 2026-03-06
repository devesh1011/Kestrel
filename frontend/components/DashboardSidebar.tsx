"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { metaMask } from "wagmi/connectors";
import {
  Cpu,
  LayoutDashboard,
  TrendingUp,
  Landmark,
  ChevronRight,
  Wallet,
  LogOut,
} from "lucide-react";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const FAVORITES = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/lend", label: "Lend", icon: Landmark },
  { href: "/dashboard/borrow", label: "Borrow", icon: TrendingUp },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#171821]">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
          <Cpu className="h-4 w-4 text-emerald-400" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          Kestrel
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Favorites */}
        <div className="space-y-0.5">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Favorites
          </p>
          {FAVORITES.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`}
                />
                {label}
                {active && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Wallet footer */}
      <div className="border-t border-white/[0.06] p-3">
        {mounted && isConnected && address ? (
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white truncate">
                {truncate(address)}
              </p>
              <p className="text-[11px] text-zinc-500">Connected</p>
            </div>
            <button
              onClick={() => disconnect()}
              className="rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Disconnect"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect({ connector: metaMask() })}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Wallet className="h-4 w-4 text-zinc-500" />
            Connect Wallet
          </button>
        )}
      </div>
    </aside>
  );
}
