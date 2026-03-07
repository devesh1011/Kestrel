"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  TrendingUp,
  Landmark,
  ChevronRight,
} from "lucide-react";

const FAVORITES = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/lend", label: "Lend", icon: Landmark },
  { href: "/dashboard/borrow", label: "Borrow", icon: TrendingUp },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
          <Image src="/logo.png" alt="Kestrel" width={16} height={16} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Kestrel
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Favorites */}
        <div className="space-y-0.5">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                />
                {label}
                {active && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
