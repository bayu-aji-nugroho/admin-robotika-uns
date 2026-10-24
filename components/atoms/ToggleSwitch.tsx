"use client";

import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  label?: string;
  ariaLabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  id,
  name,
  label,
  ariaLabel,
  size = "md",
  className = "",
}: ToggleSwitchProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const dimensions = {
    sm: {
      track: "w-8 h-4.5 p-0.5",
      thumb: "w-3.5 h-3.5",
      translate: "translate-x-3.5",
    },
    md: {
      track: "w-11 h-6 p-0.5",
      thumb: "w-5 h-5",
      translate: "translate-x-5",
    },
    lg: {
      track: "w-14 h-7.5 p-1",
      thumb: "w-5.5 h-5.5",
      translate: "translate-x-6.5",
    },
  };

  const currentSize = dimensions[size];

  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-3 cursor-pointer select-none ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
    >
      <button
        type="button"
        role="switch"
        id={id}
        name={name}
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-in-out cursor-pointer
          focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:ring-offset-2
          ${currentSize.track}
          ${checked ? "bg-[#B22234]" : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600"}
          ${disabled ? "cursor-not-allowed" : ""}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out
            ${currentSize.thumb}
            ${checked ? currentSize.translate : "translate-x-0"}
          `}
        />
      </button>

      {label && (
        <span className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100">
          {label}
        </span>
      )}
    </label>
  );
}
