import React from "react";
import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-[#09090b] flex flex-col items-center justify-center p-4 transition-colors">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-200 dark:border-zinc-800 border-t-[#B22234] dark:border-t-[#B22234] animate-spin" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
            Memuat data...
          </span>
        </div>
      </div>
    </div>
  );
}
