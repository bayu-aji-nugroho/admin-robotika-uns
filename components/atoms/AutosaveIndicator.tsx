"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { AutosaveStatus } from "@/utils/useInterviewAutosave";

function formatTime(d: Date) {
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

/** Keterangan kecil status simpan otomatis catatan wawancara */
export function AutosaveIndicator({
  status,
  savedAt,
  error,
}: {
  status: AutosaveStatus;
  savedAt: Date | null;
  error: string | null;
}) {
  const base = "inline-flex items-center gap-1 text-[11px] font-medium";
  if (status === "saving" || status === "pending") {
    return (
      <span role="status" className={`${base} text-zinc-500 dark:text-zinc-400`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        {status === "saving" ? "Menyimpan..." : "Belum tersimpan"}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span role="alert" className={`${base} text-rose-600 dark:text-rose-400`} title={error || undefined}>
        <AlertCircle className="w-3 h-3" />
        Gagal menyimpan, mencoba lagi...
      </span>
    );
  }
  return (
    <span role="status" className={`${base} text-emerald-700 dark:text-emerald-400`}>
      <CheckCircle2 className="w-3 h-3" />
      {savedAt ? `Tersimpan otomatis ${formatTime(savedAt)}` : "Simpan otomatis aktif"}
    </span>
  );
}
