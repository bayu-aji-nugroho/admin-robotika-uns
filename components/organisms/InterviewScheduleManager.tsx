"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, CheckCircle2, Lock, Users } from "lucide-react";
import { AvailabilityCalendarEditor } from "@/components/organisms/AvailabilityCalendarEditor";
import { InterviewPairPanel } from "@/components/organisms/InterviewPairPanel";
import { formatJakartaDate, formatJakartaHourRange, jakartaDateKey } from "@/utils/jakartaTime";
import type {
  InterviewPair,
  PairAvailabilitySlot,
  ScheduleAdmin,
  ScheduledInterview,
  ScheduleViewer,
} from "@/utils/interviewSchedule.types";

interface InterviewScheduleManagerProps {
  viewer: ScheduleViewer;
  admins: ScheduleAdmin[];
  pairs: InterviewPair[];
  availability: PairAvailabilitySlot[];
  scheduled: ScheduledInterview[];
}

const cardClass =
  "bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs";

function groupByDate<T extends { startAt: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = jakartaDateKey(item.startAt);
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  return Array.from(groups.entries());
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

export function InterviewScheduleManager({
  viewer,
  admins,
  pairs,
  availability,
  scheduled,
}: InterviewScheduleManagerProps) {
  const router = useRouter();
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const nameOf = (id: string) => admins.find((a) => a.id === id)?.name || "-";
  const pairLabel = (p: InterviewPair) => `${nameOf(p.memberA)} & ${nameOf(p.memberB)}`;

  const myActivePair = pairs.find(
    (p) => p.status === "active" && (p.memberA === viewer.adminId || p.memberB === viewer.adminId)
  );
  // Kalender yang bisa diedit: pasangan sendiri; superadmin bisa memilih semua pasangan aktif
  const editablePairs = viewer.isSuperadmin
    ? pairs.filter((p) => p.status === "active")
    : myActivePair && viewer.canSchedule
    ? [myActivePair]
    : [];
  const [chosenPairId, setChosenPairId] = useState<string>("");
  const targetPair =
    editablePairs.find((p) => p.id === chosenPairId) ||
    (myActivePair && editablePairs.includes(myActivePair) ? myActivePair : editablePairs[0]);

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const handleResult = (type: "success" | "error", message: string) => {
    showAlert(type, message);
    if (type === "success") router.refresh();
  };

  const visibleScheduled = showMineOnly ? scheduled.filter((s) => s.includesMe) : scheduled;

  return (
    <div className="space-y-6">
      {/* Header + Pasangan */}
      <div className={`${cardClass} space-y-4`}>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#18181b] dark:text-zinc-100">
            Jadwal Wawancara
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Wawancara dilakukan berpasangan: 1 sesi = 60 menit, 1 calon anggota, 2 pewawancara.
            Bentuk pasangan dulu, lalu isi kalender bersama. Perubahan oleh salah satu anggota langsung
            berlaku untuk pasangannya.
          </p>
        </div>

        {alert && (
          <div
            role="alert"
            className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs sm:text-sm ${
              alert.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <p className="font-medium">{alert.message}</p>
          </div>
        )}

        <InterviewPairPanel viewer={viewer} admins={admins} pairs={pairs} onResult={handleResult} />
      </div>

      {/* Kalender bersama */}
      <div className={`${cardClass} space-y-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
              Kalender Bersama
            </h2>
          </div>
          {viewer.isSuperadmin && editablePairs.length > 0 && (
            <select
              value={targetPair?.id || ""}
              onChange={(e) => setChosenPairId(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs text-[#18181b] dark:text-zinc-100 cursor-pointer"
            >
              {editablePairs.map((p) => (
                <option key={p.id} value={p.id}>
                  {pairLabel(p)}
                  {p.id === myActivePair?.id ? " (pasangan saya)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {targetPair ? (
          <>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Kalender pasangan <strong className="text-zinc-800 dark:text-zinc-200">{pairLabel(targetPair)}</strong>
            </p>
            <AvailabilityCalendarEditor
              pairId={targetPair.id}
              slots={availability.filter((s) => s.pairId === targetPair.id)}
              onResult={handleResult}
            />
          </>
        ) : (
          <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-500 dark:text-zinc-400">
            {viewer.isSuperadmin
              ? "Belum ada pasangan aktif. Bentuk pasangan terlebih dahulu."
              : "Kalender terkunci. Cari pasangan pewawancara dulu (kirim atau terima undangan di atas)."}
          </div>
        )}
      </div>

      {/* Jadwal calon anggota */}
      <div className={`${cardClass} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
              Jadwal Calon Anggota
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">{visibleScheduled.length} sesi</span>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showMineOnly}
              onChange={(e) => setShowMineOnly(e.target.checked)}
              className="accent-[#B22234] cursor-pointer"
            />
            Hanya yang saya wawancarai
          </label>
        </div>

        {visibleScheduled.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400">
            Belum ada calon anggota yang memilih jadwal.
          </div>
        ) : (
          groupByDate(visibleScheduled).map(([dateKey, sessions]) => (
            <div key={dateKey} className="space-y-2">
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {formatJakartaDate(sessions[0].startAt)}
              </p>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      s.includesMe ? "bg-[#FCF2F3]/60 dark:bg-rose-950/10" : ""
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100">
                        <span className="font-mono">{formatJakartaHourRange(s.startAt)}</span>
                        <span className="mx-1.5 text-zinc-300">·</span>
                        {s.applicantName}
                        {s.applicantNim && (
                          <span className="ml-1.5 text-[11px] font-mono font-normal text-zinc-400">
                            {s.applicantNim}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Pewawancara: {s.interviewers.join(" & ") || "-"}
                        {s.location ? ` · ${s.location}` : ""}
                      </p>
                    </div>
                    <div className="self-start sm:self-center shrink-0">
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
