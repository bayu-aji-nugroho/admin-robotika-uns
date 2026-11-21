import React from "react";
import { Loader2 } from "lucide-react";

// Tampil langsung saat pindah antara daftar acara dan detail acara (scan & data tiket),
// agar halaman tidak terlihat macet selama data dimuat server
export default function AcaraLoading() {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 relative">
      <div className="max-w-6xl mx-auto space-y-4 animate-pulse" aria-hidden="true">
        <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-32 bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl" />
        <div className="h-64 bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl" />
      </div>

      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]">
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 px-5 py-4 bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl shadow-xl"
        >
          <Loader2 className="w-5 h-5 text-[#B22234] dark:text-rose-400 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Memuat data acara…</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
