"use client";

import React, { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === "class") {
        callback();
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  className = "",
  showLabel = false,
}: ThemeToggleProps) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const nextDark = !isDark;
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
      title={isDark ? "Mode Terang" : "Mode Gelap"}
      className={`
        inline-flex items-center gap-1.5 p-1.5 rounded-lg text-xs font-semibold
        text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100
        hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer
        focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:outline-hidden
        ${className}
      `}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-zinc-600 shrink-0" />
      )}
      {showLabel && <span>{isDark ? "Terang" : "Gelap"}</span>}
    </button>
  );
}
