"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, ArrowRightLeft, Loader2, X } from "lucide-react";
import { transferBookingAction } from "@/app/actions/interviewSchedule";
import { formatJakartaDate, formatJakartaHourRange } from "@/utils/jakartaTime";
import { toWaNumber, type RescheduleNotice } from "@/components/organisms/BookingRescheduler";

/** Pasangan pewawancara lain yang jam sesi ini kosong di kalender kedua anggotanya */
export interface TransferPairOption {
  pairId: string;
  members: { name: string; whatsapp: string | null }[];
}

interface BookingTransferDialogProps {
  bookingId: string;
  applicantName: string;
  startAt: string;
  options: TransferPairOption[];
  onResult: (type: "success" | "error", message: string) => void;
  onTransferred: (info: RescheduleNotice) => void;
}

/**
 * Tombol "Alihkan ke Pewawancara Lain" + pop-up: pilih pasangan tujuan, konfirmasi ke mereka
 * lebih dulu (wajib dicentang), baru tombol "Alihkan ke Pewawancara" aktif.
 */
export function BookingTransferDialog({
  bookingId,
  applicantName,
  startAt,
  options,
  onResult,
  onTransferred,
}: BookingTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [pairId, setPairId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotLabel = `${formatJakartaDate(startAt)}, ${formatJakartaHourRange(startAt)}`;
  const chosen = options.find((o) => o.pairId === pairId) || null;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPairId(null);
    setConfirmed(false);
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setOpen(false);
        setPairId(null);
        setConfirmed(false);
        setError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const handleTransfer = async () => {
    if (!chosen || !confirmed) return;
    setBusy(true);
    setError(null);
    const res = await transferBookingAction(bookingId, chosen.pairId);
    setBusy(false);
    if (!res.success || !res.data) {
      setError(res.error || "Gagal mengalihkan sesi.");
      return;
    }
    const names = (res.data.interviewers || []).join(" & ");
    const wa = toWaNumber(res.data.applicant_whatsapp);
    const message = [
      `Halo ${res.data.applicant_name || applicantName}, kami dari panitia OPREC Robotika UNS.`,
      "",
      `Pewawancara untuk jadwal wawancara kamu (${slotLabel}) dialihkan ke ${names}. Jam wawancara tetap sama.`,
      "Kontak pewawancara terbaru sudah tampil di Dashboard Akun website. Terima kasih.",
    ].join("\n");
    setOpen(false);
    setPairId(null);
    setConfirmed(false);
    onTransferred({
      applicantName: res.data.applicant_name || applicantName,
      summary: `Sesi dialihkan ke ${names} (jam tetap).`,
      whatsappUrl: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}` : null,
    });
    onResult("success", `Sesi ${applicantName} dialihkan ke ${names}.`);
  };

  const confirmText = (m: { name: string }) =>
    [
      `Halo kak ${m.name}, saya mau minta tolong menggantikan wawancara OPREC Robotika UNS:`,
      `Calon: ${applicantName}`,
      `Jadwal: ${slotLabel}`,
      "Apakah kakak dan pasangan bisa? Terima kasih.",
    ].join("\n");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
        Alihkan ke Pewawancara Lain
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`transfer-title-${bookingId}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl text-left">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2
                id={`transfer-title-${bookingId}`}
                className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
                Alihkan ke Pewawancara Lain
              </h2>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                aria-label="Tutup"
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Sesi <strong className="text-[#18181b] dark:text-zinc-100">{applicantName}</strong> pada{" "}
                <strong className="text-[#18181b] dark:text-zinc-100">{slotLabel}</strong> akan dialihkan. Jam tetap
                sama; status konfirmasi, lokasi, dan catatan wawancara tidak berubah.
              </p>

              {options.length === 0 ? (
                <p className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Tidak ada pasangan lain yang jam ini kosong di kalender kedua anggotanya. Hubungi pewawancara yang
                  bersedia menggantikan, minta keduanya mengisi jam ini di Data &amp; Kalender Saya, lalu buka lagi
                  pop-up ini.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    Pasangan yang kosong di jam ini
                  </span>
                  {options.map((o) => {
                    const active = pairId === o.pairId;
                    return (
                      <div
                        key={o.pairId}
                        className={`p-3 rounded-lg border transition-colors ${
                          active
                            ? "border-[#B22234] bg-[#FCF2F3] dark:bg-rose-950/30"
                            : "border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`transfer-${bookingId}`}
                            checked={active}
                            onChange={() => {
                              setPairId(o.pairId);
                              setConfirmed(false);
                            }}
                            disabled={busy}
                            className="accent-[#B22234]"
                          />
                          <span className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100">
                            {o.members.map((m) => m.name).join(" & ")}
                          </span>
                        </label>
                        {active && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pl-6">
                            {o.members.map((m) => {
                              const wa = toWaNumber(m.whatsapp);
                              return wa ? (
                                <a
                                  key={m.name}
                                  href={`https://wa.me/${wa}?text=${encodeURIComponent(confirmText(m))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#25D366] hover:bg-[#1faa4f] text-white text-[11px] font-semibold"
                                >
                                  Tanya {m.name} via WhatsApp
                                </a>
                              ) : (
                                <span key={m.name} className="text-[11px] text-zinc-500">
                                  {m.name}: No. WhatsApp belum diisi
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {chosen && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
                  <p className="flex items-start gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                    Konfirmasi ke pewawancara tujuan terlebih dahulu!
                  </p>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    Pastikan {chosen.members.map((m) => m.name).join(" & ")} sudah menyatakan bersedia mewawancarai
                    di jam ini. Jam kosong di kalender belum tentu berarti mereka sudah tahu sesi ini dialihkan.
                  </p>
                  <label className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      disabled={busy}
                      className="mt-0.5 accent-[#B22234]"
                    />
                    Saya sudah mengonfirmasi dan kedua pewawancara tujuan bersedia.
                  </label>
                </div>
              )}

              {error && (
                <p role="alert" className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-300">
                  {error}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 rounded-b-2xl">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTransfer}
                disabled={!chosen || !confirmed || busy}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#B22234] hover:bg-[#8B0000] text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                {busy ? "Mengalihkan..." : "Alihkan ke Pewawancara"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
