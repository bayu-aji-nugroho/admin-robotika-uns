"use client";

import React, { useState } from "react";
import { DashboardSidebar } from "@/components/organisms/DashboardSidebar";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocalStorageValue } from "@/utils/useLocalStorageValue";

interface DashboardTemplateProps {
  children: React.ReactNode;
  currentPath?: string;
}

export function DashboardTemplate({
  children,
  currentPath,
}: DashboardTemplateProps) {
  const pathname = usePathname();
  const activePath = currentPath || pathname || "/dashboard";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Status collapse sidebar tersimpan di localStorage
  const [savedCollapsed, setSavedCollapsed] = useLocalStorageValue("sidebar_collapsed");
  const isCollapsed = savedCollapsed === "true";

  const toggleCollapsed = () => {
    setSavedCollapsed(String(!isCollapsed));
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-[#09090b] text-[#18181b] dark:text-zinc-100 flex flex-col md:flex-row relative">
      {/* Mobile Topbar (Hanya muncul di layar hp/mobile < 768px, tersembunyi total di desktop) */}
      <header className="hidden max-md:flex md:!hidden items-center justify-between px-4 py-3 bg-white dark:bg-[#09090b] border-b border-[#E4E4E7] dark:border-zinc-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm tracking-wider text-[#18181b] dark:text-zinc-100">
            ROBOTIKA UNS
          </span>
          <span className="text-[10px] font-mono bg-[#FCF2F3] dark:bg-rose-950/40 text-[#B22234] dark:text-rose-400 px-1.5 py-0.5 rounded border border-[#F8D7DA] dark:border-rose-900/50">
            ADMIN
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[#52525b] dark:text-zinc-400 hover:text-[#18181b] dark:hover:text-zinc-100 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: Responsive Drawer on Mobile, Sticky on Desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <DashboardSidebar
          currentPath={activePath}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>

      {/* Main Content Area */}
      {/* overflow-x-clip (bukan overflow-auto) agar elemen sticky di halaman ikut menempel saat window di-scroll */}
      <main className="flex-1 min-w-0 flex flex-col overflow-x-clip min-h-screen">
        {/* Desktop Top Header Bar (Menyatu dalam page flow, tidak tumpang tindih) */}
        <header className="hidden md:flex items-center justify-end px-4 sm:px-8 pt-4 pb-0 shrink-0">
          <div className="max-w-6xl w-full mx-auto flex items-center justify-end">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-lg shadow-2xs">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 select-none">
                Tema
              </span>
              <ThemeToggle className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
