import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "subtle" | "outline" | "code";
  className?: string;
  dot?: boolean;
}

export function Badge({
  children,
  variant = "subtle",
  className = "",
  dot = false,
}: BadgeProps) {
  const variantStyles = {
    // Soft Red Wash: bg #FCF2F3, border #F8D7DA, text #B22234
    subtle: "bg-[#FCF2F3] text-[#B22234] border border-[#F8D7DA]",
    // Primary Solid Red
    primary: "bg-[#B22234] text-white border border-[#B22234]",
    // White card style
    outline: "bg-white text-[#18181b] border border-[#E4E4E7]",
    // Technical metadata monospace
    code: "bg-[#FCF2F3] text-[#B22234] font-mono border border-[#F8D7DA] tracking-wide",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#B22234] animate-pulse" />
      )}
      {children}
    </span>
  );
}
