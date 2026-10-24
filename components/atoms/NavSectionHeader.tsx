import React from "react";

interface NavSectionHeaderProps {
  title: string;
  className?: string;
}

export function NavSectionHeader({ title, className = "" }: NavSectionHeaderProps) {
  // Format title with '#' prefix if not already present
  const formattedTitle = title.startsWith("#") ? title : `# ${title}`;

  return (
    <div
      className={`px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-wider text-[#71717a] uppercase select-none ${className}`}
    >
      <span className="text-[#B22234] font-extrabold select-none">#</span>
      <span>{formattedTitle.replace(/^#\s*/, "")}</span>
    </div>
  );
}
