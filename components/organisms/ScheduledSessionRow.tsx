"use client";

import React, { useState } from "react";
import { Check, ClipboardList, ExternalLink, Lock } from "lucide-react";
import { BookingLocationEditor } from "@/components/organisms/BookingLocationEditor";
import { setInterviewCompletedAction } from "@/app/actions/interviewSchedule";
import { formatJakartaDateTime, formatJakartaHourRange } from "@/utils/jakartaTime";
import type { ScheduledInterview, ScheduleViewer } from "@/utils/interviewSchedule.types";

interface ScheduledSessionRowProps {
  session: ScheduledInterview;
  viewer: ScheduleViewer;
  /** Jumlah sesi lain pasangan yang sama di tanggal yang sama (untuk "terapkan ke semua") */
  sameDayOthers: number;
  /** Waktu render (ms), untuk cek sesi sudah dimulai */
  nowMs: number;
  onResult: (type: "success" | "error", message: string) => void;
}

function StatusBadge({ status }: { status: "pending" | "accepted" }) {
  return status === "accepted" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
      <Lock className="w-3 h-3" /> Dikonfirmasi
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
      Menunggu konfirmasi
    </span>
  );
}

export function ScheduledSessionRow({
  session: s,
  viewer,
  sameDayOthers,
  nowMs,
  onResult,
}: ScheduledSessionRowProps) {
  const [busy, setBusy] = useState(false);

  // Pewawancara hanya mengubah sesinya sendiri; sesi pasangan lain hanya-baca
  // kecuali punya izin "Kelola semua sesi wawancara" (atau superadmin)
  const canEdit = s.includesMe || viewer.canManageSessions;
  const canOpenSheet = s.includesMe || viewer.canManageSessions || viewer.canViewApplicants;
  const isDone = Boolean(s.completedAt);
  const hasStarted = new Date(s.startAt).getTime() <= nowMs;

  const setDone = async (done: boolean) => {
    if (
      done &&
      !hasStarted &&
      !window.confirm(`Jam sesi (${formatJakartaHourRange(s.startAt)}) belum tiba. Tandai wawancara ${s.applicantName} selesai sekarang?`)
    ) {
      return false;
    }
    setBusy(true);
    const res = await setInterviewCompletedAction(s.id, done);
    setBusy(false);
    if (!res.success) {
      onResult("error", res.error || "Gagal memperbarui status sesi.");
      return false;
    }
    onResult("success", done ? `Wawancara ${s.applicantName} ditandai selesai.` : "Tanda selesai dibatalkan.");
    return true;
  };

  return (
    <div
      className={`p-3 space-y-2.5 ${
        isDone ? "bg-emerald-50/40 dark:bg-emerald-950/10" : s.includesMe ? "bg-[#FCF2F3]/60 dark:bg-rose-950/10" : ""
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Tanda selesai */}
          <button
            type="button"
            onClick={() => setDone(!isDone)}
            disabled={!canEdit || busy}
            aria-pressed={isDone}
            aria-label={isDone ? "Batalkan tanda selesai" : "Tandai wawancara selesai"}
            title={
              !canEdit
                ? isDone
                  ? "Sudah selesai"
                  : "Belum selesai"
                : isDone
                ? "Klik untuk membatalkan tanda selesai"
                : !hasStarted
                ? "Jam sesi belum tiba, tetap bisa ditandai selesai"
                : "Tandai wawancara selesai"
            }
            className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed ${
              isDone
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-600 text-transparent hover:border-emerald-500 disabled:opacity-50 disabled:hover:border-zinc-300"
            }`}
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </button>

          <div className="min-w-0 space-y-0.5">
            <p className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100">
              <span className="font-mono">{formatJakartaHourRange(s.startAt)}</span>
              <span className="mx-1.5 text-zinc-300">·</span>
              {s.applicantName}
              {s.applicantNim && (
                <span className="ml-1.5 text-[11px] font-mono font-normal text-zinc-400">{s.applicantNim}</span>
              )}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Pewawancara: {s.interviewers.join(" & ") || "-"}
              {isDone && s.completedAt && (
                <span className="text-emerald-700 dark:text-emerald-400">
                  {" "}
                  · Selesai {formatJakartaDateTime(s.completedAt)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="self-start sm:self-center shrink-0 flex flex-wrap items-center gap-1.5 pl-7 sm:pl-0">
          {isDone ? (
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-600 text-white">
              Selesai
            </span>
          ) : (
            <>
              {!s.location && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">
                  Lokasi belum diisi
                </span>
              )}
              <StatusBadge status={s.status} />
            </>
          )}
        </div>
      </div>

      <div className="pl-7 space-y-2">
        {canEdit && !isDone ? (
          <BookingLocationEditor
            key={`${s.id}|${s.location || ""}`}
            bookingId={s.id}
            location={s.location}
            sameDayOthers={sameDayOthers}
            onResult={onResult}
          />
        ) : (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Lokasi: {s.location || "belum diisi"}</p>
        )}

        {canOpenSheet && (
          <a
            href={`/dashboard/jadwal/sesi/${s.id}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#B22234]/30 dark:border-rose-400/30 bg-[#FCF2F3] dark:bg-rose-950/20 text-xs font-semibold text-[#B22234] dark:text-rose-400 hover:bg-[#B22234] hover:text-white dark:hover:bg-rose-500 dark:hover:text-white transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Buka Lembar Wawancara
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
