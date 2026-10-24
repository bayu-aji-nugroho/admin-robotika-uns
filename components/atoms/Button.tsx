import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  icon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
    md: "px-5 py-2.5 text-xs sm:text-sm rounded-md gap-2 shadow-xs",
    lg: "px-6 py-3 text-sm sm:text-base rounded-lg gap-2.5 shadow-sm",
  };

  const variantStyles = {
    // Primary: Crimson Red with Deep Maroon hover
    primary:
      "bg-[#B22234] text-white hover:bg-[#8B0000] active:scale-[0.99] border border-transparent",
    // Secondary / Outline: Pure White with subtle border and zinc hover
    secondary:
      "bg-white dark:bg-zinc-800 text-[#18181b] dark:text-zinc-100 border border-[#E4E4E7] dark:border-zinc-700 hover:bg-[#F4F4F5] dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 active:scale-[0.99]",
    outline:
      "bg-transparent text-[#18181b] dark:text-zinc-100 border border-[#E4E4E7] dark:border-zinc-700 hover:bg-[#FCF2F3] dark:hover:bg-rose-950/20 hover:text-[#B22234] dark:hover:text-rose-400 hover:border-[#F8D7DA] dark:hover:border-rose-900/40",
    ghost:
      "bg-transparent text-[#52525b] dark:text-zinc-400 hover:text-[#18181b] dark:hover:text-zinc-100 hover:bg-[#F4F4F5] dark:hover:bg-zinc-800",
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
}
