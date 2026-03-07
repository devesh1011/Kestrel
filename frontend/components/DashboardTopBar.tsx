"use client";

import {
  Search,
  Sun,
  RotateCcw,
  Bell,
  LayoutGrid,
} from "lucide-react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

export function DashboardTopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#171821] px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px]">
        <span className="text-zinc-500">Dashboards</span>
        <span className="text-zinc-600">/</span>
        <span className="font-medium text-white">Default</span>
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex h-8 w-48 items-center gap-2 rounded-lg bg-white/[0.05] px-3">
          <Search className="h-3.5 w-3.5 text-zinc-500" />
          <input
            placeholder="Search"
            className="bg-transparent text-[12px] text-zinc-400 outline-none placeholder:text-zinc-600 w-full"
          />
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05]">
          <Sun className="h-4 w-4" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05]">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05]">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-400" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05]">
          <LayoutGrid className="h-4 w-4" />
        </button>
        <ConnectWalletButton />
      </div>
    </header>
  );
}
