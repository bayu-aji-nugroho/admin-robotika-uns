import React from "react";

interface NavSectionHeaderProps {
  title: string;
  className?: string;
}

export function NavSectionHeader({ title, className = "" }: NavSectionHeaderProps) {
  const cleanTitle = title.replace(/^#\s*/, "");

  return (
    <div
      className={`px-3 py-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase select-none ${className}`}
    >
      {cleanTitle}
    </div>
  );
}
