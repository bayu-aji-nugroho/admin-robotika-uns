import React from "react";
import { NavSectionHeader } from "@/components/atoms/NavSectionHeader";

interface NavSectionProps {
  title: string;
  children?: React.ReactNode;
  emptyText?: string;
  className?: string;
}

export function NavSection({
  title,
  children,
  emptyText,
  className = "",
}: NavSectionProps) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className={`space-y-1 ${className}`}>
      <NavSectionHeader title={title} />
      <div className="space-y-1">
        {hasChildren ? (
          children
        ) : (
          <div className="px-3 py-2 text-xs text-[#71717a] dark:text-zinc-400 italic rounded-lg bg-zinc-50/70 dark:bg-zinc-800/40 border border-dashed border-[#E4E4E7] dark:border-zinc-800 flex items-center justify-between">
            <span>{emptyText || "Tidak ada menu"}</span>
            <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">[kosong]</span>
          </div>
        )}
      </div>
    </div>
  );
}
