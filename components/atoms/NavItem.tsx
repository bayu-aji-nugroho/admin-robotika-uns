"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/atoms/Badge";
import { LucideIcon } from "lucide-react";

interface NavItemProps {
  label: string;
  href?: string;
  icon?: LucideIcon;
  isActive?: boolean;
  badge?: string | number;
  badgeVariant?: "primary" | "subtle" | "outline" | "code";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NavItem({
  label,
  href = "#",
  icon: Icon,
  isActive = false,
  badge,
  badgeVariant = "subtle",
  disabled = false,
  onClick,
  className = "",
}: NavItemProps) {
  const baseClasses = `
    group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold
    transition-all duration-150 outline-hidden select-none cursor-pointer
    focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:ring-offset-1
    ${
      disabled
        ? "opacity-50 pointer-events-none cursor-not-allowed"
        : isActive
        ? "bg-[#FCF2F3] dark:bg-rose-950/30 text-[#B22234] dark:text-rose-400 font-bold border border-[#F8D7DA] dark:border-rose-900/40 shadow-2xs"
        : "text-[#52525b] dark:text-zinc-400 hover:text-[#18181b] dark:hover:text-zinc-100 hover:bg-[#F4F4F5] dark:hover:bg-zinc-800/60 border border-transparent"
    }
    ${className}
  `;

  const content = (
    <>
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Left active indicator pill */}
        {isActive && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#B22234] rounded-r-md" />
        )}

        {Icon && (
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? "text-[#B22234] dark:text-rose-400"
                : "text-[#71717a] dark:text-zinc-400 group-hover:text-[#B22234] dark:group-hover:text-rose-400"
            }`}
            strokeWidth={1.75}
          />
        )}
        <span className="truncate">{label}</span>
      </div>

      {badge !== undefined && (
        <Badge
          variant={badgeVariant}
          className="text-[10px] px-1.5 py-0.5 ml-2 font-mono"
        >
          {badge}
        </Badge>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} onClick={onClick} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left ${baseClasses}`}
    >
      {content}
    </button>
  );
}
