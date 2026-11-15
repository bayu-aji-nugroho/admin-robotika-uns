"use client";

import React, { useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { rescheduleBookingAction } from "@/app/actions/interviewSchedule";
import { formatJakartaDate, formatJakartaHourRange, jakartaDateKey } from "@/utils/jakartaTime";

interface BookingReschedulerProps {
  bookingId: string;
  applicantName: string;
  currentStartAt: string;
  /** Slot kosong mendatang di kalender kedua pewawancara sesi ini (ISO) */
  freeSlots: string[];
  onResult: (type: "success" | "error", message: string) => void;
  /** Dipanggil setelah berhasil, berisi tautan WhatsApp untuk memberi tahu calon anggota */
  onRescheduled: (info: RescheduleNotice) => void;
}

/** Pemberitahuan setelah jam/pewawancara sesi diubah (ditampilkan di pojok bawah halaman Jadwal) */
export interface RescheduleNotice {
  applicantName: string;
  /** Ringkasan perubahan, mis. "dipindah ke Senin, 16 November 2026, 16.00–16.30 WIB" */
  summary: string;
  /** null bila nomor WhatsApp calon tidak tersedia */
  whatsappUrl: string | null;
}

/** Normalisasi nomor ke format wa.me (62xxx) */
export function toWaNumber(phone: string | null | undefined): string | null {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

/** Pindahkan jam sesi ke slot kosong lain milik pasangan pewawancara yang sama */
export function BookingRescheduler({
  bookingId,
  applicantName,
  currentStartAt,
  freeSlots,
  onResult,
  onRescheduled,
}: BookingReschedulerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byDate = new Map<string, string[]>();
  for (const iso of [...freeSlots].sort()) {
    const key = jakartaDateKey(iso);
    byDate.set(key, [...(byDate.get(key) || []), iso]);
  }

  const handleSave = async () => {
    if (!selected) return;
    const label = `${formatJakartaDate(selected)}, ${formatJakartaHourRange(selected)}`;
    if (!window.confirm(`Pindahkan wawancara ${applicantName} ke ${label}?`)) return;
    setBusy(true);
    const res = await rescheduleBookingAction(bookingId, selected);
    setBusy(false);
    if (!res.success || !res.data) {
      onResult("error", res.error || "Gagal mengubah jam wawancara.");
      return;
    }
    const wa = toWaNumber(res.data.applicant_whatsapp);
    const message = [
      `Halo ${res.data.applicant_name || applicantName}, kami dari panitia OPREC Robotika UNS.`,
      "",
      `Jadwal wawancara kamu dipindah menjadi: ${label}.`,
      "Jadwal terbaru juga sudah tampil di Dashboard Akun website. Mohon konfirmasi bila bisa hadir, terima kasih.",
    ].join("\n");
    setOpen(false);
    setSelected(null);
    onRescheduled({
      applicantName: res.data.applicant_name || applicantName,
      summary: `Jam wawancara dipindah ke ${label}.`,
      whatsappUrl: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}` : null,
    });
    onResult("success", `Jam wawancara ${applicantName} dipindah ke ${label}. Beri tahu calon anggota.`);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <CalendarClock className="w-3.5 h-3.5" />
        Ubah Jam
      </button>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/60 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Pilih jam baru dari slot yang <strong>sama-sama kosong</strong> di kalender kedua pewawancara sesi ini. Jam
          sekarang: <strong>{formatJakartaHourRange(currentStartAt)}</strong>, {formatJakartaDate(currentStartAt)}.
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setSelected(null);
          }}
          disabled={busy}
          aria-label="Batal ubah jam"
          className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {byDate.size === 0 ? (
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
          Tidak ada slot kosong lain. Tambahkan jam baru di Data &amp; Kalender Saya (kedua pewawancara harus
          mengisi jam yang sama), lalu coba lagi.
        </p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {Array.from(byDate.entries()).map(([dateKey, slots]) => (
            <div key={dateKey} className="space-y-1">
              <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{formatJakartaDate(slots[0])}</p>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((iso) => {
                  const active = selected === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelected(iso)}
                      disabled={busy}
                      aria-pressed={active}
                      className={`px-2 py-1 rounded-md border text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        active
                          ? "bg-[#B22234] border-[#B22234] text-white"
                          : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-[#B22234]/60"
                      }`}
                    >
                      {formatJakartaHourRange(iso)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!selected || busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B22234] hover:bg-[#8B0000] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Menyimpan..." : "Simpan Jam Baru"}
        </button>
      </div>
    </div>
  );
}
