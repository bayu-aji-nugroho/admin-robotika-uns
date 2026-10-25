"use client";

import { User, LogOut, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarHeaderProps {
  name?: string;
  oprecRole?: string;
  divisionRole?: string;
  avatarUrl?: string;
  className?: string;
  isCollapsed?: boolean;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarHeader({
  name = "Pengurus Robotika",
  oprecRole = "admin",
  divisionRole = "pengurus",
  avatarUrl,
  className = "",
  isCollapsed = false,
  onLogout,
  isLoggingOut = false,
  onToggleCollapse,
}: SidebarHeaderProps) {
  if (isCollapsed) {
    return (
      <div
        className={`pt-3.5 pb-2.5 px-2 border-b border-[#E4E4E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center select-none ${className}`}
      >
        {/* 1. Avatar Profil */}
        <div
          title={`${name} (${oprecRole} • ${divisionRole})`}
          className="relative shrink-0 cursor-default"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="w-10 h-10 rounded-full object-cover border border-[#E4E4E7] dark:border-zinc-700 shadow-2xs"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#FCF2F3] dark:bg-rose-950/40 border border-[#F8D7DA] dark:border-rose-900/50 flex items-center justify-center text-[#B22234] dark:text-rose-400 shadow-2xs">
              <User className="w-5 h-5 text-[#B22234] dark:text-rose-400" strokeWidth={2} />
            </div>
          )}
        </div>

        {/* Pemisah halus agar tombol kontrol tidak menyatu dengan gambar avatar */}
        <div className="w-7 h-px bg-zinc-200 dark:bg-zinc-800 my-2.5" />

        {/* 2. Tombol Buka/Perlebar Sidebar (Simbol Minimalis) */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Perlebar sidebar"
            aria-label="Perlebar sidebar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-150 cursor-pointer group shadow-2xs"
          >
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-3.5 border-b border-[#E4E4E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-2.5 select-none ${className}`}
    >
      {/* 1. Left: Avatar & Info Akun */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="w-10 h-10 rounded-full object-cover border border-[#E4E4E7] dark:border-zinc-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#FCF2F3] dark:bg-rose-950/40 border border-[#F8D7DA] dark:border-rose-900/50 flex items-center justify-center text-[#B22234] dark:text-rose-400 shadow-2xs">
              <User className="w-5 h-5 text-[#B22234] dark:text-rose-400" strokeWidth={2} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#18181b] dark:text-zinc-100 truncate leading-tight tracking-tight">
            {name}
          </h3>
          
          {/* Role Metadata (Bersih, Presisi, Non-Slop) */}
          <div className="flex items-center gap-1.5 mt-1 text-xs min-w-0">
            <span
              title={`Role OPREC: ${oprecRole}`}
              className="font-semibold text-[#B22234] dark:text-rose-400 capitalize truncate shrink-0"
            >
              {oprecRole}
            </span>
            <span className="text-zinc-300 dark:text-zinc-600 font-bold shrink-0">•</span>
            <span
              title={`Divisi: ${divisionRole}`}
              className="text-zinc-500 dark:text-zinc-400 capitalize truncate"
            >
              {divisionRole}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Right: Action Icons (Logout Icon & Collapse Icon) */}
      <div className="flex items-center gap-1 shrink-0">
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            title="Keluar ke Halaman Masuk"
            aria-label="Keluar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-[#B22234] dark:hover:text-rose-400 hover:bg-[#FCF2F3] dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 text-[#B22234] dark:text-rose-400 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        )}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Kecilkan sidebar"
            aria-label="Kecilkan sidebar"
            className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
