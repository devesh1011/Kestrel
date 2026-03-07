"use client";

import { useState, useEffect } from "react";
import { Search, Sun, Moon, RotateCcw, Bell, LayoutGrid } from "lucide-react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

export function DashboardTopBar() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to dark theme
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Save to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px]">
        <span className="text-muted-foreground">Dashboards</span>
        <span className="text-muted-foreground/60">/</span>
        <span className="font-medium text-foreground">Default</span>
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
        <ConnectWalletButton />
      </div>
    </header>
  );
}
