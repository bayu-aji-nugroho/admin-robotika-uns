import React from "react";
import { NavSectionHeader } from "@/components/atoms/NavSectionHeader";

interface NavSectionProps {
  title: string;
  children?: React.ReactNode;
  emptyText?: string;
  className?: string;
  isCollapsed?: boolean;
}

export function NavSection({
  title,
  children,
  emptyText,
  className = "",
  isCollapsed = false,
}: NavSectionProps) {
  const hasChildren = React.Children.count(children) > 0;

  if (isCollapsed) {
    if (!hasChildren) return null;
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
        <div className="space-y-1.5 flex flex-col items-center">{children}</div>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <NavSectionHeader title={title} />
      <div className="space-y-1">
        {hasChildren ? (
          children
        ) : (
          <div className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 flex items-center justify-between select-none rounded-lg bg-zinc-50/60 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-800/50">
            <span>{emptyText || "Masih dalam development"}</span>
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">segera</span>
          </div>
        )}
      </div>
    </div>
  );
}
