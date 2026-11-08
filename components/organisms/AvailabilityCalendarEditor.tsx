"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Save } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { savePairDayAction } from "@/app/actions/interviewSchedule";
import {
  SCHEDULE_START_HOURS,
  formatJakartaDate,
  jakartaDateKey,
  jakartaHour,
  toJakartaIso,
  todayInJakarta,
} from "@/utils/jakartaTime";
import type { PairAvailabilitySlot } from "@/utils/interviewSchedule.types";

interface AvailabilityCalendarEditorProps {
  pairId: string;
  /** Ketersediaan milik pasangan ini (kalender bersama) */
  slots: PairAvailabilitySlot[];
  onResult: (type: "success" | "error", message: string) => void;
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const hourLabel = (h: number) => `${pad(h)}.00–${pad(h + 1)}.00`;

function parseDateStr(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m: m - 1, d };
}

function MonthCalendar({
  selectedDate,
  today,
  countsByDate,
  onSelect,
}: {
  selectedDate: string;
  today: string;
  countsByDate: Map<string, number>;
  onSelect: (date: string) => void;
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
          aria-label="Bulan berikutnya"
          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
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
          const isPast = dateStr < today;
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
                  : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              } ${isToday && !isSelected ? "ring-1 ring-[#B22234]/50" : ""}`}
            >
              {day}
              {count > 0 && (
                <span
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-white" : "bg-[#B22234] dark:bg-rose-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B22234] dark:bg-rose-400" /> Tanggal yang sudah diisi pasangan
      </p>
    </div>
  );
}

function DayHoursEditor({
  pairId,
  date,
  savedSlots,
  onResult,
}: {
  pairId: string;
  date: string;
  savedSlots: PairAvailabilitySlot[];
  onResult: (type: "success" | "error", message: string) => void;
}) {
  const savedByHour = new Map(savedSlots.map((s) => [jakartaHour(s.startAt), s]));
  const [selected, setSelected] = useState<Set<number>>(() => new Set(savedByHour.keys()));
  const [location, setLocation] = useState(
    () => savedSlots.find((s) => s.location)?.location || ""
  );
  const [nowMs] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  const isPastHour = (h: number) => new Date(toJakartaIso(date, h)).getTime() <= nowMs;
  const isLockedHour = (h: number) => Boolean(savedByHour.get(h)?.booking);
  const selectableHours = SCHEDULE_START_HOURS.filter((h) => !isPastHour(h) && !isLockedHour(h));

  const toggle = (h: number) => {
    if (isPastHour(h) || isLockedHour(h)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  };

  const setAll = (on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const h of selectableHours) {
        if (on) next.add(h);
        else next.delete(h);
      }
      return next;
    });
  };

  const savedKeys = Array.from(savedByHour.keys()).sort((a, b) => a - b).join(",");
  const selectedKeys = Array.from(selected).sort((a, b) => a - b).join(",");
  const isDirty = savedKeys !== selectedKeys;

  const handleSave = async () => {
    setBusy(true);
    const res = await savePairDayAction({ pairId, date, hours: Array.from(selected), location });
    setBusy(false);
    if (!res.success || !res.data) {
      onResult("error", res.error || "Gagal menyimpan jadwal.");
      return;
    }
    const { added, removed, kept_booked: keptBooked } = res.data;
    const parts = [];
    if (added) parts.push(`${added} jam ditambahkan`);
    if (removed) parts.push(`${removed} jam dihapus`);
    if (keptBooked) parts.push(`${keptBooked} jam sudah dipesan sehingga tetap dipertahankan`);
    onResult("success", parts.length ? `${parts.join(", ")}.` : "Tidak ada perubahan.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#18181b] dark:text-zinc-100">{formatJakartaDate(toJakartaIso(date, 12))}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setAll(true)}
            disabled={busy || selectableHours.length === 0}
            className="px-2 py-1 rounded-md text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-40"
          >
            Pilih semua
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            disabled={busy || selectableHours.length === 0}
            className="px-2 py-1 rounded-md text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-40"
          >
            Kosongkan
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Klik jam saat Anda <strong>bisa</strong> mewawancarai. Boleh tidak berurutan, misalnya 08.00–10.00
        lalu lanjut 15.00–21.00.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1.5">
        {SCHEDULE_START_HOURS.map((h) => {
          const saved = savedByHour.get(h);
          const booking = saved?.booking;
          const past = isPastHour(h);
          const on = selected.has(h);
          const title = booking
            ? `Dipesan: ${booking.applicantName}`
            : past
            ? "Jam sudah lewat"
            : saved?.updatedByName
            ? `Diisi oleh ${saved.updatedByName}`
            : undefined;
          return (
            <button
              key={h}
              type="button"
              onClick={() => toggle(h)}
              disabled={busy || past || Boolean(booking)}
              title={title}
              className={`px-2 py-2 rounded-lg border text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                booking
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : past
                  ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-300 dark:text-zinc-600"
                  : on
                  ? "bg-[#B22234] border-[#B22234] text-white shadow-xs"
                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-[#B22234]/60"
              }`}
            >
              <span className="block text-xs font-mono font-semibold">{hourLabel(h)}</span>
              <span className="flex items-center gap-1 text-[10px] font-medium opacity-90 truncate">
                {booking ? (
                  <>
                    <Lock className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{booking.applicantName}</span>
                  </>
                ) : past ? (
                  "Lewat"
                ) : on ? (
                  saved?.updatedByName ? `Bisa · ${saved.updatedByName}` : "Bisa"
                ) : (
                  "Tidak bisa"
                )}
              </span>
            </button>
          );
        })}
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
          Lokasi / link wawancara untuk jam baru (opsional)
        </span>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={300}
          placeholder="Mis. Sekretariat Robotika UNS atau https://meet.google.com/..."
          disabled={busy}
          className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors"
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {selected.size} sesi × 60 menit
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

export function AvailabilityCalendarEditor({ pairId, slots, onResult }: AvailabilityCalendarEditorProps) {
  const [today] = useState(() => todayInJakarta());
  const [selectedDate, setSelectedDate] = useState(today);

  const countsByDate = new Map<string, number>();
  for (const slot of slots) {
    const key = jakartaDateKey(slot.startAt);
    countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
  }

  const savedSlots = slots.filter((s) => jakartaDateKey(s.startAt) === selectedDate);
  // Remount editor jam saat pasangan, tanggal, atau data tersimpan berubah,
  // agar pilihan ter-reset ke data terbaru (termasuk perubahan dari pasangan)
  const editorKey = `${pairId}|${selectedDate}|${savedSlots
    .map((s) => `${s.id}:${s.booking ? 1 : 0}`)
    .join(",")}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-5 pt-3 border-t border-[#E4E4E7] dark:border-zinc-800">
      <MonthCalendar
        selectedDate={selectedDate}
        today={today}
        countsByDate={countsByDate}
        onSelect={setSelectedDate}
      />
      <div className="lg:border-l lg:pl-5 border-[#E4E4E7] dark:border-zinc-800">
        <DayHoursEditor
          key={editorKey}
          pairId={pairId}
          date={selectedDate}
          savedSlots={savedSlots}
          onResult={onResult}
        />
      </div>
    </div>
  );
}
