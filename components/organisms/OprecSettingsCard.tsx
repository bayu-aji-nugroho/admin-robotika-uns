"use client";

import React, { useState } from "react";
import { ToggleSwitch } from "@/components/atoms/ToggleSwitch";
import { Button } from "@/components/atoms/Button";
import { CheckCircle2, AlertCircle, RotateCcw, Save, CalendarClock, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  formatJakartaDateTime,
  fromJakartaInputValue,
  toJakartaInputValue,
} from "@/utils/jakartaTime";

interface OprecSettingsCardProps {
  initialIsOprec: boolean;
  initialLabel: string;
  initialAnnouncementAt?: string | null;
  updatedAt?: string;
  canEdit?: boolean;
}

export function OprecSettingsCard({
  initialIsOprec,
  initialLabel,
  initialAnnouncementAt = null,
  updatedAt,
  canEdit = true,
}: OprecSettingsCardProps) {
  const [isOprec, setIsOprec] = useState<boolean>(initialIsOprec);
  const [label, setLabel] = useState<string>(initialLabel);
  // Nilai input datetime-local dalam WIB, "" = belum ditentukan
  const [announcement, setAnnouncement] = useState<string>(toJakartaInputValue(initialAnnouncementAt));

  const [savedIsOprec, setSavedIsOprec] = useState<boolean>(initialIsOprec);
  const [savedLabel, setSavedLabel] = useState<string>(initialLabel);
  const [savedAnnouncement, setSavedAnnouncement] = useState<string>(
    toJakartaInputValue(initialAnnouncementAt)
  );
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(updatedAt);

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const hasChanges =
    isOprec !== savedIsOprec || label !== savedLabel || announcement !== savedAnnouncement;

  const handleReset = () => {
    setIsOprec(savedIsOprec);
    setLabel(savedLabel);
    setAnnouncement(savedAnnouncement);
    setStatusMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !hasChanges || isSaving) return;

    try {
      setIsSaving(true);
      setStatusMessage(null);

      const trimmedLabel = label.trim();
      if (!trimmedLabel) {
        setStatusMessage({
          type: "error",
          text: "Label pengumuman tidak boleh kosong.",
        });
        setIsSaving(false);
        return;
      }

      const announcementAt = announcement ? fromJakartaInputValue(announcement) : null;
      if (announcement && !announcementAt) {
        setStatusMessage({ type: "error", text: "Format tanggal pengumuman tidak valid." });
        setIsSaving(false);
        return;
      }

      const supabase = createClient();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("admin_settings")
        .update({
          is_oprec: isOprec,
          label: trimmedLabel,
          announcement_at: announcementAt,
          updated_at: now,
        })
        .eq("id", 1);

      if (error) {
        throw new Error(error.message);
      }

      setSavedIsOprec(isOprec);
      setSavedLabel(trimmedLabel);
      setSavedAnnouncement(announcement);
      setLabel(trimmedLabel);
      setLastUpdated(now);
      setStatusMessage({
        type: "success",
        text: "Pengaturan berhasil disimpan.",
      });

      setTimeout(() => {
        setStatusMessage((current) =>
          current?.type === "success" ? null : current
        );
      }, 4000);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Gagal menyimpan pengaturan. Silakan coba kembali.";
      setStatusMessage({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Alert Feedback */}
      {statusMessage && (
        <div
          role="alert"
          className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs sm:text-sm ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <p className="font-medium">{statusMessage.text}</p>
        </div>
      )}

      {/* Card Utama */}
      <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Row 1: Switch On/Off */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isOprec
                  ? "bg-emerald-600 dark:bg-emerald-500"
                  : "bg-zinc-400 dark:bg-zinc-500"
              }`}
            />
            <span className="text-sm font-semibold text-[#18181b] dark:text-zinc-100">
              {isOprec ? "Pendaftaran Dibuka" : "Pendaftaran Ditutup"}
            </span>
          </div>

          <ToggleSwitch
            id="oprec-status-toggle"
            checked={isOprec}
            onChange={(checked) => setIsOprec(checked)}
            ariaLabel="Status Penerimaan OPREC"
            size="md"
            disabled={!canEdit}
          />
        </div>

        {/* Row 2: Input Label */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="oprec-label-input"
              className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-200"
            >
              Label Pengumuman
            </label>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {label.length}/120
            </span>
          </div>

          <input
            id="oprec-label-input"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Tulis pesan pengumuman..."
            required
            maxLength={120}
            disabled={!canEdit}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors"
          />
        </div>

        {/* Row 3: Tanggal Pengumuman Hasil Seleksi */}
        <div className="space-y-1.5">
          <label
            htmlFor="oprec-announcement-input"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-200"
          >
            <CalendarClock className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            Tanggal Pengumuman Hasil Seleksi
          </label>
          <div className="flex items-center gap-2">
            <input
              id="oprec-announcement-input"
              type="datetime-local"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              disabled={!canEdit}
              className="flex-1 px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors"
            />
            {announcement && canEdit && (
              <button
                type="button"
                onClick={() => setAnnouncement("")}
                title="Kosongkan tanggal pengumuman"
                className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {announcement && fromJakartaInputValue(announcement)
              ? `Calon anggota baru bisa melihat hasil seleksi mulai ${formatJakartaDateTime(
                  fromJakartaInputValue(announcement)!
                )}. Sebelum itu tampil info tanggal pengumuman.`
              : "Belum ditentukan: hasil seleksi disembunyikan dari calon anggota sampai tanggal diisi."}
          </p>
        </div>

        {/* Row 4: Action Buttons */}
        <div className="pt-4 border-t border-[#E4E4E7] dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {!canEdit ? (
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                Mode lihat: role Anda tidak memiliki akses Pengaturan OPREC
              </span>
            ) : hasChanges ? (
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                Perubahan belum disimpan
              </span>
            ) : lastUpdated ? (
              <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-mono">
                Diperbarui:{" "}
                {new Date(lastUpdated).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={!hasChanges || isSaving}
              onClick={handleReset}
              className="flex-1 sm:flex-none"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              disabled={!canEdit || !hasChanges || isSaving}
              className="flex-1 sm:flex-none"
              icon={<Save className="w-4 h-4" />}
            >
              Simpan
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
