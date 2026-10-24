"use client";

import React, { useState } from "react";
import { DashboardSidebar } from "@/components/organisms/DashboardSidebar";
import { Menu, X } from "lucide-react";

interface DashboardTemplateProps {
  children: React.ReactNode;
  currentPath?: string;
}

export function DashboardTemplate({
  children,
  currentPath = "/dashboard",
}: DashboardTemplateProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-[#09090b] text-[#18181b] dark:text-zinc-100 flex flex-col md:flex-row relative">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-[#E4E4E7] dark:border-zinc-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm tracking-wider text-[#18181b] dark:text-zinc-100">
            ROBOTIKA UNS
          </span>
          <span className="text-[10px] font-mono bg-[#FCF2F3] dark:bg-rose-950/40 text-[#B22234] dark:text-rose-400 px-1.5 py-0.5 rounded border border-[#F8D7DA] dark:border-rose-900/50">
            ADMIN
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[#52525b] dark:text-zinc-400 hover:text-[#18181b] dark:hover:text-zinc-100 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: Responsive Drawer on Mobile, Fixed/Sticky on Desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <DashboardSidebar currentPath={currentPath} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
