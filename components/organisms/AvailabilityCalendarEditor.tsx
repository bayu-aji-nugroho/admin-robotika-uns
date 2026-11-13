"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Save } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { saveMyDayAction } from "@/app/actions/interviewSchedule";
import {
  INTERVIEW_SLOT_MINUTES,
  SCHEDULE_START_HOURS,
  formatJakartaDate,
  formatMinuteOfDay,
  jakartaDateKey,
  jakartaMinuteOfDay,
  toJakartaIso,
  toJakartaIsoFromMinutes,
  todayInJakarta,
} from "@/utils/jakartaTime";
import type { MemberAvailabilitySlot } from "@/utils/interviewSchedule.types";

interface AvailabilityCalendarEditorProps {
  /** Pemilik kalender pribadi yang sedang diedit */
  adminId: string;
  /** true bila kalender milik admin yang sedang login */
  isSelf: boolean;
  /** Slot kalender pribadi pemilik */
  slots: MemberAvailabilitySlot[];
  /** Pasangan pemilik (bila ada), untuk menandai slot yang cocok */
  partner?: { name: string; slots: MemberAvailabilitySlot[] } | null;
  /** Slot yang sudah dipesan calon anggota dengan pemilik sebagai pewawancara: startAt(ms) -> nama */
  bookedByTime: Map<number, string>;
  onResult: (type: "success" | "error", message: string) => void;
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const slotLabel = (m: number) => `${formatMinuteOfDay(m)}–${formatMinuteOfDay(m + INTERVIEW_SLOT_MINUTES)}`;

/** Batas kalender: sama dengan rentang data RPC get_schedule_dashboard (60 hari ke depan) */
export const SCHEDULE_DAYS_AHEAD = 59;

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return toDateStr(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
}

function parseDateStr(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m: m - 1, d };
}

/**
 * Kalender bulanan (Senin di awal). Tanggal lampau dinonaktifkan; tanggal yang punya
 * angka di `countsByDate` diberi penanda (titik, atau badge angka bila `showCount`).
 */
export function MonthCalendar({
  selectedDate,
  today,
  countsByDate,
  onSelect,
  legend,
  showCount = false,
  maxDate,
}: {
  selectedDate: string;
  today: string;
  countsByDate: Map<string, number>;
  onSelect: (date: string) => void;
  legend?: string;
  showCount?: boolean;
  /** Tanggal terakhir yang bisa dipilih (YYYY-MM-DD) */
  maxDate?: string;
}) {
  const initial = parseDateStr(selectedDate);
  const [view, setView] = useState({ y: initial.y, m: initial.m });

  const firstWeekday = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7; // Senin = 0
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const monthLabel = new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const todayParts = parseDateStr(today);
  const canGoPrev = view.y > todayParts.y || (view.y === todayParts.y && view.m > todayParts.m);
  const maxParts = maxDate ? parseDateStr(maxDate) : null;
  const canGoNext = !maxParts || view.y < maxParts.y || (view.y === maxParts.y && view.m < maxParts.m);

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const next = new Date(Date.UTC(v.y, v.m + delta, 1));
      return { y: next.getUTCFullYear(), m: next.getUTCMonth() };
    });
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoPrev}
          aria-label="Bulan sebelumnya"
          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-[#18181b] dark:text-zinc-100 capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={!canGoNext}
          aria-label="Bulan berikutnya"
          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] font-semibold uppercase text-zinc-400 py-1">
            {w}
          </span>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <span key={`empty-${idx}`} />;
          const dateStr = toDateStr(view.y, view.m, day);
          const isPast = dateStr < today || (maxDate !== undefined && dateStr > maxDate);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const count = countsByDate.get(dateStr) || 0;
          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(dateStr)}
              className={`relative aspect-square rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${
                isSelected
                  ? "bg-[#B22234] text-white shadow-xs"
                  : isPast
                  ? "text-zinc-300 dark:text-zinc-700"
                  : count > 0 && showCount
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              } ${isToday && !isSelected ? "ring-1 ring-[#B22234]/50" : ""}`}
            >
              {day}
              {count > 0 &&
                (showCount ? (
                  <span
                    className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold leading-4 ${
                      isSelected ? "bg-white text-[#B22234]" : "bg-emerald-600 text-white"
                    }`}
                  >
                    {count}
                  </span>
                ) : (
                  <span
                    className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-[#B22234] dark:bg-rose-400"
                    }`}
                  />
                ))}
            </button>
          );
        })}
      </div>
      {legend && (
        <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${showCount ? "bg-emerald-600" : "bg-[#B22234] dark:bg-rose-400"}`}
          />{" "}
          {legend}
        </p>
      )}
    </div>
  );
}

function DaySlotsEditor({
  adminId,
  isSelf,
  date,
  savedSlots,
  partnerName,
  partnerMinutes,
  bookedByTime,
  onResult,
}: {
  adminId: string;
  isSelf: boolean;
  date: string;
  savedSlots: MemberAvailabilitySlot[];
  partnerName: string | null;
  partnerMinutes: Set<number>;
  bookedByTime: Map<number, string>;
  onResult: (type: "success" | "error", message: string) => void;
}) {
  const savedByMinute = new Map(savedSlots.map((s) => [jakartaMinuteOfDay(s.startAt), s]));
  const [selected, setSelected] = useState<Set<number>>(() => new Set(savedByMinute.keys()));
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  // Perbarui "sekarang" tiap 30 detik agar slot yang jamnya lewat saat halaman terbuka ikut terkunci
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const slotTime = (m: number) => new Date(toJakartaIsoFromMinutes(date, m)).getTime();
  const bookingOf = (m: number) => bookedByTime.get(slotTime(m));
  const isPast = (m: number) => slotTime(m) <= nowMs;
  const isLocked = (m: number) => Boolean(bookingOf(m));
  const matchCount = Array.from(selected).filter((m) => partnerMinutes.has(m)).length;
  const canToggle = (m: number) => !isPast(m) && !isLocked(m);
  const allSlots = SCHEDULE_START_HOURS.flatMap((h) => [h * 60, h * 60 + INTERVIEW_SLOT_MINUTES]);
  const selectableSlots = allSlots.filter(canToggle);

  const update = (minutes: number[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of minutes) {
        if (!canToggle(m)) continue;
        if (on) next.add(m);
        else next.delete(m);
      }
      return next;
    });
  };

  const toggle = (m: number) => update([m], !selected.has(m));

  // Klik label jam = pilih/batalkan kedua slot (:00 dan :30) di jam tersebut
  const toggleHour = (h: number) => {
    const pair = [h * 60, h * 60 + INTERVIEW_SLOT_MINUTES].filter(canToggle);
    if (pair.length === 0) return;
    update(pair, !pair.every((m) => selected.has(m)));
  };

  // Slot lampau tidak bisa diubah lagi, jadi tidak dihitung sebagai perubahan
  const futureKeys = (keys: Iterable<number>) =>
    Array.from(keys)
      .filter((m) => !isPast(m))
      .sort((a, b) => a - b)
      .join(",");
  const isDirty = futureKeys(savedByMinute.keys()) !== futureKeys(selected);

  const handleSave = async () => {
    // Server hanya menyimpan slot yang belum lewat; slot yang lewat saat halaman terbuka dibuang di sini
    const now = Date.now();
    setNowMs(now);
    const expired = Array.from(selected).filter((m) => slotTime(m) <= now && !savedByMinute.has(m));
    if (expired.length) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const m of expired) next.delete(m);
        return next;
      });
    }
    const slots = Array.from(selected).filter((m) => !expired.includes(m));

    setBusy(true);
    const res = await saveMyDayAction({
      adminId: isSelf ? null : adminId,
      date,
      slots,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      onResult("error", res.error || "Gagal menyimpan jadwal.");
      return;
    }
    const { added, removed, kept_booked: keptBooked } = res.data;
    const parts = [];
    if (added) parts.push(`${added} slot ditambahkan`);
    if (removed) parts.push(`${removed} slot dihapus`);
    if (keptBooked) parts.push(`${keptBooked} slot sudah dipesan sehingga tetap dipertahankan`);
    if (expired.length) {
      parts.push(`${expired.length} slot tidak disimpan karena jamnya sudah lewat (${expired.sort((a, b) => a - b).map(slotLabel).join(", ")})`);
    }
    onResult(
      expired.length && !added && !removed ? "error" : "success",
      parts.length ? `${parts.join(", ")}.` : "Tidak ada perubahan."
    );
  };

  const renderSlot = (m: number) => {
    const booking = bookingOf(m);
    const past = isPast(m);
    const on = selected.has(m);
    const partnerOn = partnerMinutes.has(m);
    const matched = on && partnerOn;
    const title = booking
      ? `Dipesan: ${booking}`
      : past
      ? "Sudah lewat"
      : matched
      ? `Cocok: Anda dan ${partnerName} sama-sama bisa, slot ini terbuka untuk calon anggota`
      : partnerOn
      ? `${partnerName} bisa di jam ini`
      : undefined;
    return (
      <button
        key={m}
        type="button"
        onClick={() => toggle(m)}
        disabled={busy || past || Boolean(booking)}
        title={title}
        className={`flex-1 min-w-0 px-2 py-1.5 rounded-md border text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
          booking
            ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
            : past
            ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-300 dark:text-zinc-600"
            : matched
            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
            : on
            ? "bg-[#B22234] border-[#B22234] text-white shadow-xs"
            : partnerOn
            ? "bg-white dark:bg-zinc-950 border-dashed border-emerald-400 dark:border-emerald-700 text-zinc-700 dark:text-zinc-300 hover:border-[#B22234]/60"
            : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-[#B22234]/60"
        }`}
      >
        <span className="block text-[11px] font-mono font-semibold">{slotLabel(m)}</span>
        <span className="flex items-center gap-1 text-[10px] font-medium opacity-90 truncate">
          {booking ? (
            <>
              <Lock className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{booking}</span>
            </>
          ) : past ? (
            "Lewat"
          ) : matched ? (
            "Cocok ✓"
          ) : on ? (
            partnerName ? "Bisa · pasangan belum" : "Bisa"
          ) : partnerOn ? (
            "Pasangan bisa"
          ) : (
            "Tidak bisa"
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#18181b] dark:text-zinc-100">{formatJakartaDate(toJakartaIso(date, 12))}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => update(selectableSlots, true)}
            disabled={busy || selectableSlots.length === 0}
            className="px-2 py-1 rounded-md text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-40"
          >
            Pilih semua
          </button>
          <button
            type="button"
            onClick={() => update(selectableSlots, false)}
            disabled={busy || selectableSlots.length === 0}
            className="px-2 py-1 rounded-md text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-40"
          >
            Kosongkan
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Satu sesi = <strong>30 menit</strong>. Klik slot saat {isSelf ? "Anda" : "admin ini"} <strong>bisa</strong>{" "}
        mewawancarai, atau klik label jam untuk memilih kedua slotnya sekaligus. Boleh tidak berurutan.
      </p>
      {partnerName ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Cocok dengan {partnerName} (terbuka untuk
            calon anggota)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#B22234]" /> Hanya {isSelf ? "Anda" : "admin ini"}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-emerald-500" /> Hanya {partnerName}
          </span>
        </div>
      ) : (
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
          Belum berpasangan: jadwal ini tersimpan, tetapi baru bisa dipesan calon anggota setelah ada pasangan yang
          juga kosong di jam yang sama.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-3 gap-y-1.5">
        {SCHEDULE_START_HOURS.map((h) => (
          <div key={h} className="flex items-stretch gap-1.5">
            <button
              type="button"
              onClick={() => toggleHour(h)}
              disabled={busy}
              title={`Pilih/batalkan jam ${pad(h)}.00–${pad(h + 1)}.00`}
              className="w-11 shrink-0 rounded-md text-[11px] font-mono font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed"
            >
              {pad(h)}
            </button>
            {renderSlot(h * 60)}
            {renderSlot(h * 60 + INTERVIEW_SLOT_MINUTES)}
          </div>
        ))}
      </div>


      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {selected.size} slot dipilih
          {partnerName ? ` · ${matchCount} cocok dengan ${partnerName}` : ""}
        </span>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleSave}
          isLoading={busy}
          disabled={busy || !isDirty}
          icon={<Save className="w-4 h-4" />}
        >
          Simpan Jadwal
        </Button>
      </div>
    </div>
  );
}

export function AvailabilityCalendarEditor({
  adminId,
  isSelf,
  slots,
  partner = null,
  bookedByTime,
  onResult,
}: AvailabilityCalendarEditorProps) {
  const [today] = useState(() => todayInJakarta());
  const [selectedDate, setSelectedDate] = useState(today);

  const countsByDate = new Map<string, number>();
  for (const slot of slots) {
    const key = jakartaDateKey(slot.startAt);
    countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
  }

  const savedSlots = slots.filter((s) => jakartaDateKey(s.startAt) === selectedDate);
  const partnerMinutes = new Set(
    (partner?.slots || [])
      .filter((s) => jakartaDateKey(s.startAt) === selectedDate)
      .map((s) => jakartaMinuteOfDay(s.startAt))
  );
  // Remount editor saat pemilik, tanggal, atau data tersimpan berubah, agar pilihan ter-reset
  const editorKey = `${adminId}|${selectedDate}|${savedSlots.map((s) => s.id).join(",")}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-5 pt-3 border-t border-[#E4E4E7] dark:border-zinc-800">
      <MonthCalendar
        selectedDate={selectedDate}
        today={today}
        countsByDate={countsByDate}
        onSelect={setSelectedDate}
        legend={isSelf ? "Tanggal yang sudah Anda isi" : "Tanggal yang sudah diisi admin ini"}
        maxDate={addDays(today, SCHEDULE_DAYS_AHEAD)}
      />
      <div className="lg:border-l lg:pl-5 border-[#E4E4E7] dark:border-zinc-800">
        <DaySlotsEditor
          key={editorKey}
          adminId={adminId}
          isSelf={isSelf}
          date={selectedDate}
          savedSlots={savedSlots}
          partnerName={partner?.name ?? null}
          partnerMinutes={partnerMinutes}
          bookedByTime={bookedByTime}
          onResult={onResult}
        />
      </div>
    </div>
  );
}
