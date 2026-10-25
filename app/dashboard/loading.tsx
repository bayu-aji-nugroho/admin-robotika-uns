import React from "react";

export default function DashboardLoading() {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors relative">
      {/* Subtle top indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#B22234] to-transparent animate-pulse" />

      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header / Filter Toolbar Skeleton */}
        <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="h-9 w-full sm:w-72 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-9 w-28 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content Cards Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 animate-pulse"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 w-40 sm:w-56 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-28 sm:w-36 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:block h-6 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
                <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                <div className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
