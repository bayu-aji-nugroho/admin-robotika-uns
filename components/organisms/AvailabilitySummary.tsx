"use client";

import React, { useState } from "react";
import { CalendarCheck, Lock, Users } from "lucide-react";
import { MonthCalendar, SCHEDULE_DAYS_AHEAD, addDays } from "@/components/organisms/AvailabilityCalendarEditor";
import {
  INTERVIEW_SLOT_MINUTES,
  formatJakartaDate,
  formatMinuteOfDay,
  jakartaDateKey,
  jakartaMinuteOfDay,
  toJakartaIso,
  todayInJakarta,
} from "@/utils/jakartaTime";
import type {
  InterviewPair,
  MemberAvailabilitySlot,
  PairAvailabilitySlot,
  ScheduleAdmin,
} from "@/utils/interviewSchedule.types";

interface AvailabilitySummaryProps {
  pairs: InterviewPair[];
  admins: ScheduleAdmin[];
  /** Slot pasangan = irisan kalender kedua anggota (dari view interview_availability) */
  availability: PairAvailabilitySlot[];
  /** Kalender pribadi tiap pewawancara */
  memberAvailability: MemberAvailabilitySlot[];
}

interface SlotCell {
  free: InterviewPair[];
  booked: { pair: InterviewPair; applicantName: string }[];
}

/** Gabungkan slot berurutan menjadi rentang, mis. [480, 510, 540, 600] -> 08.00–09.30, 10.00–10.30 */
function toRanges(minutes: number[]): string[] {
  const sorted = [...minutes].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start: number | null = null;
  let prev: number | null = null;
  for (const m of sorted) {
    if (start === null) {
      start = m;
    } else if (prev !== null && m !== prev + INTERVIEW_SLOT_MINUTES) {
      ranges.push(`${formatMinuteOfDay(start)}–${formatMinuteOfDay(prev + INTERVIEW_SLOT_MINUTES)}`);
      start = m;
    }
    prev = m;
  }
  if (start !== null && prev !== null) {
    ranges.push(`${formatMinuteOfDay(start)}–${formatMinuteOfDay(prev + INTERVIEW_SLOT_MINUTES)}`);
  }
  return ranges;
}

export function AvailabilitySummary({ pairs, admins, availability, memberAvailability }: AvailabilitySummaryProps) {
  const [today] = useState(() => todayInJakarta());
  const [nowMs] = useState(() => Date.now());

  const nameOf = (id: string) => admins.find((a) => a.id === id)?.name || "-";
  const pairLabel = (p: InterviewPair) => `${nameOf(p.memberA)} & ${nameOf(p.memberB)}`;
  const activePairs = new Map(pairs.filter((p) => p.status === "active").map((p) => [p.id, p]));

  // Hanya slot mendatang milik pasangan aktif
  const upcoming = availability.filter(
    (s) => activePairs.has(s.pairId) && new Date(s.startAt).getTime() > nowMs
  );

  // Hitung sesi kosong (belum dipesan) per tanggal di seluruh pasangan
  const freeByDate = new Map<string, number>();
  for (const s of upcoming) {
    if (s.booking) continue;
    const key = jakartaDateKey(s.startAt);
    freeByDate.set(key, (freeByDate.get(key) || 0) + 1);
  }
  const totalFree = Array.from(freeByDate.values()).reduce((a, b) => a + b, 0);
  const totalBooked = upcoming.filter((s) => s.booking).length;

  const firstFreeDate = Array.from(freeByDate.keys()).sort()[0];
  const [selectedDate, setSelectedDate] = useState<string>(firstFreeDate || today);

  // Detail tanggal terpilih
  const daySlots = upcoming.filter((s) => jakartaDateKey(s.startAt) === selectedDate);
  const cells = new Map<number, SlotCell>();
  const freeMinutesByPair = new Map<string, number[]>();
  for (const s of daySlots) {
    const pair = activePairs.get(s.pairId)!;
    const minute = jakartaMinuteOfDay(s.startAt);
    const cell = cells.get(minute) || { free: [], booked: [] };
    if (s.booking) {
      cell.booked.push({ pair, applicantName: s.booking.applicantName });
    } else {
      cell.free.push(pair);
      freeMinutesByPair.set(pair.id, [...(freeMinutesByPair.get(pair.id) || []), minute]);
    }
    cells.set(minute, cell);
  }
  const sortedMinutes = Array.from(cells.keys()).sort((a, b) => a - b);

  // Kalender pribadi tiap admin di tanggal terpilih (slot mendatang)
  const memberMinutes = (adminId: string) =>
    memberAvailability
      .filter(
        (s) =>
          s.adminId === adminId &&
          jakartaDateKey(s.startAt) === selectedDate &&
          new Date(s.startAt).getTime() > nowMs
      )
      .map((s) => jakartaMinuteOfDay(s.startAt));
  const dayFree = Array.from(cells.values()).reduce((n, c) => n + c.free.length, 0);

  return (
    <div className="space-y-4 pt-3 border-t border-[#E4E4E7] dark:border-zinc-800">
      {/* Ringkasan angka */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Sesi kosong", value: totalFree },
          { label: "Hari tersedia", value: freeByDate.size },
          { label: "Sudah dipesan", value: totalBooked },
        ].map((item) => (
          <div
            key={item.label}
            className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40"
          >
            <p className="text-lg sm:text-xl font-bold font-mono text-[#18181b] dark:text-zinc-100">{item.value}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{item.label}</p>
          </div>
        ))}
      </div>

      {activePairs.size === 0 ? (
        <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-500 dark:text-zinc-400">
          Belum ada pasangan aktif.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-5">
          <MonthCalendar
            selectedDate={selectedDate}
            today={today}
            countsByDate={freeByDate}
            onSelect={setSelectedDate}
            legend="Angka = jumlah sesi kosong dari semua pasangan"
            maxDate={addDays(today, SCHEDULE_DAYS_AHEAD)}
            showCount
          />

          <div className="lg:border-l lg:pl-5 border-[#E4E4E7] dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
                {formatJakartaDate(toJakartaIso(selectedDate, 12))}
              </p>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                {dayFree} sesi kosong
              </span>
            </div>

            {/* Kesimpulan per pasangan: kalender A, kalender B, dan irisannya */}
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Kesimpulan per pasangan
              </p>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                {Array.from(activePairs.values()).map((p) => {
                  const matched = toRanges(freeMinutesByPair.get(p.id) || []);
                  const rows = [
                    { label: nameOf(p.memberA), ranges: toRanges(memberMinutes(p.memberA)) },
                    { label: nameOf(p.memberB), ranges: toRanges(memberMinutes(p.memberB)) },
                  ];
                  return (
                    <div key={p.id} className="p-2.5 space-y-1">
                      <p className="text-xs font-semibold text-[#18181b] dark:text-zinc-100">{pairLabel(p)}</p>
                      {rows.map((r) => (
                        <p key={r.label} className="flex gap-2 text-[11px]">
                          <span className="w-28 shrink-0 truncate text-zinc-500 dark:text-zinc-400">{r.label}</span>
                          <span className={`font-mono ${r.ranges.length ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}>
                            {r.ranges.length ? r.ranges.join(", ") : "Belum mengisi / tidak bisa"}
                          </span>
                        </p>
                      ))}
                      <p className="flex gap-2 text-[11px]">
                        <span className="w-28 shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">
                          Sama-sama bisa
                        </span>
                        <span
                          className={`font-mono font-semibold ${
                            matched.length ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-400"
                          }`}
                        >
                          {matched.length ? matched.join(", ") : "Tidak ada jam yang cocok"}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {sortedMinutes.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400">
                Tidak ada pasangan yang sama-sama kosong di tanggal ini.
              </div>
            ) : (
              <>

                {/* Detail per slot 30 menit */}
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <Users className="w-3.5 h-3.5 text-[#B22234] dark:text-rose-400" />
                    Detail per slot ({INTERVIEW_SLOT_MINUTES} menit)
                  </p>
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 max-h-[420px] overflow-y-auto">
                    {sortedMinutes.map((m) => {
                      const cell = cells.get(m)!;
                      return (
                        <div key={m} className="p-2.5 flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3">
                          <span className="w-24 shrink-0 text-[11px] font-mono font-semibold text-[#18181b] dark:text-zinc-100">
                            {formatMinuteOfDay(m)}–{formatMinuteOfDay(m + INTERVIEW_SLOT_MINUTES)}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {cell.free.map((p) => (
                              <span
                                key={p.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                              >
                                {pairLabel(p)}
                              </span>
                            ))}
                            {cell.booked.map((b) => (
                              <span
                                key={b.pair.id}
                                title={`Dipesan: ${b.applicantName}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                              >
                                <Lock className="w-2.5 h-2.5" />
                                {pairLabel(b.pair)} · {b.applicantName}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
