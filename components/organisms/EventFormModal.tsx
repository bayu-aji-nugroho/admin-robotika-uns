"use client";

import React, { useState, useEffect } from "react";
import { X, CalendarPlus, AlertCircle, Pencil } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/atoms/Button";
import {
  DivisionEventSummary,
  DivisionOptionItem,
  EventTargetScope,
  TARGET_SCOPE_LABELS,
} from "@/utils/divisionEvents.types";
import { fromJakartaInputValue, toJakartaInputValue } from "@/utils/jakartaTime";

interface EventFormModalProps {
  isOpen: boolean;
  divisions: DivisionOptionItem[];
  onClose: () => void;
  onCreated?: (result: { eventId: string; ticketsCreated: number }) => void;
  /** Mode edit: ubah nama, waktu, lokasi & catatan acara yang sudah ada (divisi & penerima tetap) */
  event?: DivisionEventSummary;
  onSaved?: (patch: Pick<DivisionEventSummary, "title" | "event_date" | "end_date" | "location" | "description">) => void;
}

export function EventFormModal({
  isOpen,
  divisions,
  onClose,
  onCreated,
  event,
  onSaved,
}: EventFormModalProps) {
  const isEdit = Boolean(event);
  const [title, setTitle] = useState(event?.title ?? "");
  // "" = Semua Divisi (disimpan NULL)
  const [divisionId, setDivisionId] = useState("");
  // Acara gabungan: divisi tambahan selain divisi utama (maks 2, total 3)
  const [extraDivisionIds, setExtraDivisionIds] = useState<string[]>([]);
  const [targetScope, setTargetScope] = useState<EventTargetScope>("open");
  const [eventDate, setEventDate] = useState(() =>
    toJakartaInputValue(event?.event_date ?? new Date().toISOString())
  );
  const [endDate, setEndDate] = useState(event?.end_date ? toJakartaInputValue(event.end_date) : "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const selectedDivisionId = divisionId;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2) {
      setError("Judul acara minimal 2 karakter.");
      return;
    }
    const startIso = fromJakartaInputValue(eventDate);
    if (!startIso) {
      setError("Tanggal & waktu mulai tidak valid.");
      return;
    }
    const endIso = endDate ? fromJakartaInputValue(endDate) : null;
    if (endDate && !endIso) {
      setError("Tanggal & waktu selesai tidak valid.");
      return;
    }
    if (endIso && new Date(endIso) < new Date(startIso)) {
      setError("Waktu selesai tidak boleh lebih awal dari waktu mulai.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const supabase = createClient();

      if (event) {
        const patch = {
          title: trimmedTitle,
          event_date: startIso,
          end_date: endIso,
          location: location.trim() || null,
          description: description.trim() || null,
        };
        const { error: updateError } = await supabase
          .from("division_events")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", event.id);
        if (updateError) throw new Error(updateError.message || "Gagal menyimpan perubahan acara.");
        onSaved?.(patch);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "create_division_event",
        {
          p_title: trimmedTitle,
          p_division_id: selectedDivisionId || null,
          p_event_date: startIso,
          p_target_scope: targetScope,
          p_description: description.trim() || null,
          p_end_date: endIso,
          p_location: location.trim() || null,
          p_extra_division_ids: selectedDivisionId ? extraDivisionIds : [],
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message || "Gagal membuat acara.");
      }

      const payload = (data || {}) as {
        event_id?: string;
        tickets_created?: number;
      };

      setTitle("");
      setDescription("");
      setLocation("");
      setEndDate("");
      setExtraDivisionIds([]);

      onCreated?.({
        eventId: payload.event_id || "",
        ticketsCreated: Number(payload.tickets_created || 0),
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-[#E4E4E7] dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEdit ? (
              <Pencil className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            ) : (
              <CalendarPlus className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            )}
            <h2
              id="event-modal-title"
              className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100"
            >
              {isEdit ? "Edit Acara" : "Tambah Acara"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="event-title"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Nama Acara <span className="text-[#B22234]">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: First Gathering Pemrograman"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden"
            />
          </div>

          {!isEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="event-division"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Divisi <span className="text-[#B22234]">*</span>
              </label>
              <select
                id="event-division"
                value={selectedDivisionId}
                onChange={(e) => {
                  setDivisionId(e.target.value);
                  setExtraDivisionIds((prev) => (e.target.value ? prev.filter((id) => id !== e.target.value) : []));
                  // Divisi tertentu = peserta otomatis Pilihan 1-nya (sejalan dengan tab Penilaian); Semua Divisi = tercatat saat scan
                  setTargetScope(e.target.value ? "registered_p1" : "open");
                }}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden"
              >
                <option value="">Semua Divisi</option>
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="event-scope"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Penerima Tiket QR
              </label>
              <select
                id="event-scope"
                value={targetScope}
                onChange={(e) =>
                  setTargetScope(e.target.value as EventTargetScope)
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden"
              >
                {(
                  Object.keys(TARGET_SCOPE_LABELS) as EventTargetScope[]
                ).map((scopeKey) => (
                  <option key={scopeKey} value={scopeKey}>
                    {TARGET_SCOPE_LABELS[scopeKey]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          )}

          {!isEdit && selectedDivisionId && (
            <fieldset className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-2">
              <legend className="sr-only">Gabung dengan divisi lain</legend>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Gabung dengan divisi lain <span className="font-normal text-zinc-400">(opsional)</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{extraDivisionIds.length}/2</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[0, 1].map((slot) => {
                  const value = extraDivisionIds[slot] ?? "";
                  // Slot 2 baru aktif setelah slot 1 diisi; divisi yang sudah dipilih tidak muncul lagi
                  const taken = [selectedDivisionId, ...extraDivisionIds.filter((_, i) => i !== slot)];
                  return (
                    <select
                      key={slot}
                      aria-label={`Divisi tambahan ${slot + 1}`}
                      value={value}
                      disabled={slot === 1 && !extraDivisionIds[0]}
                      onChange={(e) =>
                        setExtraDivisionIds((prev) => {
                          const next = [prev[0] ?? "", prev[1] ?? ""];
                          next[slot] = e.target.value;
                          return next.filter(Boolean);
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden disabled:opacity-50"
                    >
                      <option value="">{`— Divisi tambahan ${slot + 1} (opsional) —`}</option>
                      {divisions
                        .filter((div) => div.id === value || !taken.includes(div.id))
                        .map((div) => (
                          <option key={div.id} value={div.id}>
                            {div.name}
                          </option>
                        ))}
                    </select>
                  );
                })}
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Maks 2 divisi tambahan (total 3). Mis. Werkudara bersama: pilih Werkudara Elektronika, lalu Mekanika &amp;
                Pemrograman di dropdown ini. Kosongkan bila acara berjalan terpisah.
              </p>
            </fieldset>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="event-start"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Waktu Mulai (WIB) <span className="text-[#B22234]">*</span>
              </label>
              <input
                id="event-start"
                type="datetime-local"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="event-end"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Waktu Selesai (WIB)
              </label>
              <input
                id="event-end"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="event-location"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Lokasi
            </label>
            <input
              id="event-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Contoh: Ruang Sidang FT / Sekre Robotika UNS"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="event-desc"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Catatan / Deskripsi Singkat
            </label>
            <textarea
              id="event-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informasi singkat untuk calon anggota yang tampil di website peserta..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden resize-none"
            />
          </div>

          </div>

          <div className="shrink-0 px-5 py-3.5 border-t border-[#E4E4E7] dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {isEdit ? "Simpan Perubahan" : "Simpan & Buat Tiket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

