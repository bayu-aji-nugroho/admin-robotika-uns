"use client";

import React from "react";
import { User } from "lucide-react";

interface SidebarHeaderProps {
  name?: string;
  oprecRole?: string;
  divisionRole?: string;
  avatarUrl?: string;
  className?: string;
}

export function SidebarHeader({
  name = "Pengurus Robotika",
  oprecRole = "admin",
  divisionRole = "pengurus",
  avatarUrl,
  className = "",
}: SidebarHeaderProps) {
  return (
    <div
      className={`p-4 border-b border-[#E4E4E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-3 select-none ${className}`}
    >
      {/* 1. Icon Gambar Akun (Avatar) */}
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

      {/* 2. Nama Akun & Dua Role (OPREC & Divisi) */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-[#18181b] dark:text-zinc-100 truncate leading-snug">
          {name}
        </h3>
        
        {/* Dua Role Badges */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {/* Role OPREC */}
          <span
            title="Role OPREC"
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FCF2F3] dark:bg-rose-950/40 text-[#B22234] dark:text-rose-300 border border-[#F8D7DA] dark:border-rose-900/50 leading-none"
          >
            {oprecRole}
          </span>

          {/* Role Divisi */}
          <span
            title="Role Divisi"
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-[#52525b] dark:text-zinc-300 border border-[#E4E4E7] dark:border-zinc-700 leading-none"
          >
            {divisionRole}
          </span>
        </div>
      </div>
    </div>
  );
}
