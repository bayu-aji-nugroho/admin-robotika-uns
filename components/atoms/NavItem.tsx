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
  isCollapsed?: boolean;
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
  isCollapsed = false,
  onClick,
  className = "",
}: NavItemProps) {
  const baseClasses = `
    group relative flex items-center rounded-lg text-xs font-medium
    transition-all duration-150 outline-hidden select-none cursor-pointer
    focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:ring-offset-1
    ${
      isCollapsed
        ? "justify-center w-10 h-10 mx-auto px-0 py-0"
        : "justify-between px-3 py-2.5 w-full"
    }
    ${
      disabled
        ? "opacity-50 pointer-events-none cursor-not-allowed"
        : isActive
        ? "bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs"
        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
    }
    ${className}
  `;

  const content = isCollapsed ? (
    <>
      {Icon && (
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            isActive
              ? "text-[#B22234] dark:text-rose-400"
              : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
          }`}
          strokeWidth={isActive ? 2 : 1.75}
        />
      )}

      {/* Collapsed Badge Dot */}
      {badge !== undefined && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B22234] ring-2 ring-white dark:ring-zinc-900" />
      )}
    </>
  ) : (
    <>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? "text-[#B22234] dark:text-rose-400"
                : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
            }`}
            strokeWidth={isActive ? 2 : 1.75}
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
      <Link
        href={href}
        onClick={onClick}
        prefetch={true}
        className={baseClasses}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
    >
      {content}
    </button>
  );
}
