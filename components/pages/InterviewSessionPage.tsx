"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarClock, Check, CheckCircle2, MapPin, Users } from "lucide-react";
import { InterviewSheetPanel } from "@/components/organisms/InterviewSheetPanel";
import { setInterviewCompletedAction } from "@/app/actions/interviewSchedule";
import { formatJakartaDate, formatJakartaDateTime, formatJakartaHourRange } from "@/utils/jakartaTime";
import type { ScheduledInterview, ScheduleViewer, SheetQuestion } from "@/utils/interviewSchedule.types";

interface InterviewSessionPageProps {
  session: ScheduledInterview;
  questions: SheetQuestion[];
  viewer: ScheduleViewer;
}

const isLink = (value: string) => /^https?:\/\//i.test(value.trim());

/** Halaman penuh lembar wawancara satu sesi (dibuka di tab baru dari halaman Jadwal) */
export function InterviewSessionPage({ session: s, questions, viewer }: InterviewSessionPageProps) {
  const router = useRouter();
  const [nowMs] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const canEdit = s.includesMe || viewer.canManageSessions;
  const isDone = Boolean(s.completedAt);
  const hasStarted = new Date(s.startAt).getTime() <= nowMs;

  const handleResult = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert((curr) => (curr?.message === message ? null : curr)), 4000);
  };

  const setDone = async (done: boolean) => {
    setBusy(true);
    const res = await setInterviewCompletedAction(s.id, done);
    setBusy(false);
    if (!res.success) {
      handleResult("error", res.error || "Gagal memperbarui status sesi.");
      return false;
    }
    if (done) handleResult("success", "Sesi ditandai selesai.");
    else handleResult("success", "Tanda selesai dibatalkan.");
    router.refresh();
    return true;
  };

  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-5 sm:py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          href="/dashboard/jadwal"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-[#B22234] dark:hover:text-rose-400"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Jadwal Wawancara
        </Link>

        {/* Info sesi */}
        <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <p className="flex items-center gap-2">
              <CalendarClock className="w-3.5 h-3.5 shrink-0 text-[#B22234] dark:text-rose-400" />
              <span className="font-semibold text-[#18181b] dark:text-zinc-100">
                {formatJakartaDate(s.startAt)} · <span className="font-mono">{formatJakartaHourRange(s.startAt)}</span>
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 shrink-0" />
              Pewawancara: {s.interviewers.join(" & ") || "-"}
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {s.location ? (
                isLink(s.location) ? (
                  <a
                    href={s.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#B22234] dark:text-rose-400 hover:underline break-all"
                  >
                    {s.location}
                  </a>
                ) : (
                  <span>{s.location}</span>
                )
              ) : (
                <span className="text-amber-700 dark:text-amber-400">Lokasi belum diisi</span>
              )}
            </p>
          </div>

          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
            {isDone ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Sudah selesai{s.completedAt ? ` · ${formatJakartaDateTime(s.completedAt)}` : ""}
              </span>
            ) : (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {hasStarted ? "Belum ditandai selesai" : "Sesi belum dimulai"}
              </span>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setDone(!isDone)}
                disabled={busy || (!isDone && !hasStarted)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDone
                    ? "border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                {isDone ? "Batalkan selesai" : "Tandai selesai"}
              </button>
            )}
          </div>
        </div>

        {alert && (
          <div
            role="alert"
            className={`fixed top-3 inset-x-4 z-50 shadow-lg sm:static sm:shadow-none flex items-start gap-2.5 p-3 rounded-lg border text-xs sm:text-sm ${
              alert.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <p className="font-medium">{alert.message}</p>
          </div>
        )}

        <InterviewSheetPanel
          variant="page"
          applicantId={s.applicantId}
          questions={questions}
          canComplete={canEdit && !isDone && hasStarted}
          onComplete={() => setDone(true)}
          onResult={handleResult}
        />
      </div>
    </div>
  );
}
