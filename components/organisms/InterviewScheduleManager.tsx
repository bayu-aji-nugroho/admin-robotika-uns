"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, CheckCircle2, Users } from "lucide-react";
import { AvailabilityCalendarEditor } from "@/components/organisms/AvailabilityCalendarEditor";
import { AvailabilitySummary } from "@/components/organisms/AvailabilitySummary";
import { InterviewPairPanel } from "@/components/organisms/InterviewPairPanel";
import { InterviewReadinessPanel } from "@/components/organisms/InterviewReadinessPanel";
import { ScheduledSessionRow } from "@/components/organisms/ScheduledSessionRow";
import { derivePairSlots } from "@/utils/derivePairSlots";
import { formatJakartaDate, jakartaDateKey } from "@/utils/jakartaTime";
import type {
  InterviewPair,
  MemberAvailabilitySlot,
  ScheduleAdmin,
  ScheduledInterview,
  ScheduleViewer,
} from "@/utils/interviewSchedule.types";

interface InterviewScheduleManagerProps {
  viewer: ScheduleViewer;
  admins: ScheduleAdmin[];
  pairs: InterviewPair[];
  memberAvailability: MemberAvailabilitySlot[];
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

export function InterviewScheduleManager({
  viewer,
  admins,
  pairs,
  memberAvailability,
  scheduled,
}: InterviewScheduleManagerProps) {
  const router = useRouter();
  // Default: pewawancara melihat sesinya sendiri; pengelola sesi melihat semua
  const [showMineOnly, setShowMineOnly] = useState(() => !viewer.canManageSessions);
  const [hideDone, setHideDone] = useState(false);
  const [nowMs] = useState(() => Date.now());

  // Lembar wawancara dibuka di tab baru: muat ulang data saat kembali ke tab ini
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);
  const [calendarTab, setCalendarTab] = useState<"mine" | "summary">("mine");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Slot pasangan (irisan kalender kedua anggota) dihitung dari kalender pribadi
  const availability = derivePairSlots(pairs, memberAvailability, scheduled);
  const nameOf = (id: string) => admins.find((a) => a.id === id)?.name || "-";

  const partnerOf = (adminId: string) => {
    const pair = pairs.find(
      (p) => p.status === "active" && (p.memberA === adminId || p.memberB === adminId)
    );
    if (!pair) return null;
    return pair.memberA === adminId ? pair.memberB : pair.memberA;
  };
  // Kalender pribadi yang bisa diedit: milik sendiri; superadmin bisa memilih admin lain yang berhak
  const editableAdmins = viewer.isSuperadmin
    ? admins.filter((a) => a.eligible || a.id === viewer.adminId)
    : viewer.canSchedule
    ? admins.filter((a) => a.id === viewer.adminId)
    : [];
  const [chosenAdminId, setChosenAdminId] = useState<string>("");
  const targetAdmin =
    editableAdmins.find((a) => a.id === chosenAdminId) ||
    editableAdmins.find((a) => a.id === viewer.adminId) ||
    editableAdmins[0];
  const targetPartnerId = targetAdmin ? partnerOf(targetAdmin.id) : null;

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

  const baseScheduled = showMineOnly ? scheduled.filter((s) => s.includesMe) : scheduled;
  const doneCount = baseScheduled.filter((s) => s.completedAt).length;
  const visibleScheduled = hideDone ? baseScheduled.filter((s) => !s.completedAt) : baseScheduled;

  return (
    <div className="space-y-6">
      {/* Header + Pasangan */}
      <div className={`${cardClass} space-y-4`}>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#18181b] dark:text-zinc-100">
            Jadwal Wawancara
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Wawancara dilakukan berpasangan: 1 sesi = 30 menit, 1 calon anggota, 2 pewawancara.
            Setiap pewawancara mengisi kalender pribadinya sendiri. Jam yang sama-sama kosong bagi kedua
            anggota pasangan otomatis menjadi slot yang bisa dipilih calon anggota. Lihat tab Ringkasan
            Gabungan untuk kesimpulan hari dan jam kosong semua pasangan.
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

      {/* Kalender: input per pasangan & ringkasan gabungan */}
      <div className={`${cardClass} space-y-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
              Persiapan Wawancara
            </h2>
          </div>
          <div className="inline-flex p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 gap-1 self-start sm:self-auto">
            {[
              { key: "mine" as const, label: "Data & Kalender Saya" },
              { key: "summary" as const, label: "Ringkasan Gabungan" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCalendarTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  calendarTab === tab.key
                    ? "bg-white dark:bg-zinc-950 text-[#B22234] dark:text-rose-400 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {calendarTab === "summary" ? (
          <AvailabilitySummary
            pairs={pairs}
            admins={admins}
            availability={availability}
            memberAvailability={memberAvailability}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {targetAdmin ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {targetAdmin.id === viewer.adminId ? "Kalender pribadi Anda" : "Kalender pribadi"}{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200">{targetAdmin.name}</strong>
                  {targetPartnerId ? (
                    <>
                      {" "}
                      · pasangan{" "}
                      <strong className="text-zinc-800 dark:text-zinc-200">{nameOf(targetPartnerId)}</strong>
                    </>
                  ) : (
                    " · belum berpasangan"
                  )}
                </p>
              ) : (
                <span />
              )}
              {viewer.isSuperadmin && editableAdmins.length > 1 && (
                <select
                  value={targetAdmin?.id || ""}
                  onChange={(e) => setChosenAdminId(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs text-[#18181b] dark:text-zinc-100 cursor-pointer"
                >
                  {editableAdmins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.id === viewer.adminId ? " (saya)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {targetAdmin && (
              <InterviewReadinessPanel
                key={`ready-${targetAdmin.id}`}
                owner={targetAdmin}
                isSelf={targetAdmin.id === viewer.adminId}
                partner={admins.find((a) => a.id === targetPartnerId) || null}
                memberAvailability={memberAvailability}
                scheduled={scheduled}
                onResult={handleResult}
              />
            )}

            {targetAdmin ? (
              <AvailabilityCalendarEditor
                key={targetAdmin.id}
                adminId={targetAdmin.id}
                isSelf={targetAdmin.id === viewer.adminId}
                slots={memberAvailability.filter((s) => s.adminId === targetAdmin.id)}
                partner={
                  targetPartnerId
                    ? {
                        name: nameOf(targetPartnerId),
                        slots: memberAvailability.filter((s) => s.adminId === targetPartnerId),
                      }
                    : null
                }
                bookedByTime={
                  new Map(
                    scheduled
                      .filter((s) => s.interviewerIds.includes(targetAdmin.id))
                      .map((s) => [new Date(s.startAt).getTime(), s.applicantName])
                  )
                }
                onResult={handleResult}
              />
            ) : (
              <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-500 dark:text-zinc-400">
                Role Anda tidak memiliki hak jadwal wawancara.
              </div>
            )}
          </>
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
            <span className="text-[11px] font-mono text-zinc-400">
              {doneCount}/{baseScheduled.length} selesai
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showMineOnly}
                onChange={(e) => setShowMineOnly(e.target.checked)}
                className="accent-[#B22234] cursor-pointer"
              />
              Hanya yang saya wawancarai
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => setHideDone(e.target.checked)}
                className="accent-[#B22234] cursor-pointer"
              />
              Sembunyikan yang selesai
            </label>
          </div>
        </div>
        {baseScheduled.length > 0 && (
          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden" aria-hidden>
            <div
              className="h-full bg-emerald-600 transition-all"
              style={{ width: `${Math.round((doneCount / baseScheduled.length) * 100)}%` }}
            />
          </div>
        )}

        {visibleScheduled.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400">
            {baseScheduled.length > 0
              ? "Semua sesi sudah selesai."
              : showMineOnly && scheduled.length > 0
              ? `Belum ada calon anggota yang memilih jadwal dengan Anda. Hapus centang "Hanya yang saya wawancarai" untuk melihat ${scheduled.length} sesi pasangan lain.`
              : "Belum ada calon anggota yang memilih jadwal."}
          </div>
        ) : (
          groupByDate(visibleScheduled).map(([dateKey, sessions]) => (
            <div key={dateKey} className="space-y-2">
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {formatJakartaDate(sessions[0].startAt)}
              </p>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                {sessions.map((s) => (
                  <ScheduledSessionRow
                    key={s.id}
                    session={s}
                    viewer={viewer}
                    sameDayOthers={
                      sessions.filter((o) => o.id !== s.id && o.pairId && o.pairId === s.pairId).length
                    }
                    nowMs={nowMs}
                    onResult={handleResult}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
