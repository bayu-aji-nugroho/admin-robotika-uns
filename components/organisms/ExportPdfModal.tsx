"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, FileDown, FileText, Loader2, Table2, X } from "lucide-react";
import { downloadFromApi } from "@/utils/downloadFile";
import {
  DEFAULT_EXPORT_OPTIONS,
  DEFAULT_LIST_COLUMNS,
  LIST_COLUMNS,
  buildExportQuery,
  type DivisionBasis,
  type ExportDocType,
  type ExportOptions,
  type InterviewFilter,
  type ListColumnKey,
  type StatusFilter,
} from "@/utils/exportOptions";

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  divisions: { id: string; name: string }[];
}

const selectClass =
  "w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden cursor-pointer disabled:opacity-60";
const labelClass = "block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1";

const DOC_TYPES: { key: ExportDocType; title: string; hint: string; icon: React.ElementType }[] = [
  { key: "list", title: "Daftar Calon Anggota", hint: "Tabel ringkas, kolom bisa dipilih", icon: Table2 },
  { key: "interview", title: "Lembar Wawancara", hint: "Pertanyaan + jawaban, 1 halaman per orang", icon: FileText },
];

const BASIS_OPTIONS: { key: DivisionBasis; label: string }[] = [
  { key: "accepted", label: "Divisi diterima" },
  { key: "primary", label: "Pilihan 1" },
  { key: "any", label: "Pilihan 1 atau 2" },
];

/** Pop-up Ekspor PDF: pilih jenis dokumen, filter, dan kolom sebelum mengunduh */
export function ExportPdfModal({ isOpen, onClose, divisions }: ExportPdfModalProps) {
  const [docType, setDocType] = useState<ExportDocType>("list");
  const [opts, setOpts] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
    setOpts((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const changeBasis = (basis: DivisionBasis) =>
    setOpts((prev) => ({
      ...prev,
      basis,
      // "Belum ditempatkan" hanya bermakna untuk divisi diterima
      division: basis !== "accepted" && prev.division === "unplaced" ? "all" : prev.division,
    }));

  const toggleColumn = (key: ListColumnKey) =>
    set("columns", opts.columns.includes(key) ? opts.columns.filter((k) => k !== key) : [...opts.columns, key]);

  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    const query = buildExportQuery(opts, docType);
    const err =
      docType === "list"
        ? await downloadFromApi(`/api/export/applicants?${query}`, "Calon_Anggota_Robotika_UNS.pdf")
        : await downloadFromApi(`/api/export/interview-report?${query}`, "Lembar_Wawancara.pdf");
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 id="export-modal-title" className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
            <FileDown className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            Ekspor PDF
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isi */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Jenis dokumen */}
          <div>
            <span className={labelClass}>Jenis dokumen</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DOC_TYPES.map((t) => {
                const active = docType === t.key;
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setDocType(t.key)}
                    disabled={busy}
                    aria-pressed={active}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? "border-[#B22234] bg-[#FCF2F3] dark:bg-rose-950/30"
                        : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-[#B22234] dark:text-rose-400" : "text-zinc-400"}`} />
                    <span>
                      <span className="block text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100">{t.title}</span>
                      <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{t.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter divisi */}
          <div className="space-y-2">
            <div>
              <span className={labelClass}>Filter divisi berdasarkan</span>
              <div className="inline-flex w-full p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800" role="group">
                {BASIS_OPTIONS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => changeBasis(b.key)}
                    disabled={busy}
                    aria-pressed={opts.basis === b.key}
                    className={`flex-1 px-2 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                      opts.basis === b.key
                        ? "bg-white dark:bg-zinc-950 text-[#18181b] dark:text-zinc-100 shadow-xs"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="export-division" className={labelClass}>
                Divisi
              </label>
              <select
                id="export-division"
                value={opts.division}
                onChange={(e) => set("division", e.target.value)}
                disabled={busy}
                className={selectClass}
              >
                <option value="all">Semua divisi</option>
                {opts.basis === "accepted" && <option value="unplaced">Belum ditempatkan</option>}
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & wawancara */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="export-status" className={labelClass}>
                Status penilaian
              </label>
              <select
                id="export-status"
                value={opts.status}
                onChange={(e) => set("status", e.target.value as StatusFilter)}
                disabled={busy}
                className={selectClass}
              >
                <option value="all">Semua status</option>
                <option value="diterima">Diterima</option>
                <option value="pertimbangan">Pertimbangan</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>
            <div>
              <label htmlFor="export-interview" className={labelClass}>
                Wawancara
              </label>
              <select
                id="export-interview"
                value={opts.interview}
                onChange={(e) => set("interview", e.target.value as InterviewFilter)}
                disabled={busy}
                className={selectClass}
              >
                <option value="all">Semua</option>
                <option value="done">Sudah selesai</option>
                <option value="scheduled">Sudah pilih jadwal, belum selesai</option>
                <option value="none">Belum pilih jadwal</option>
              </select>
            </div>
          </div>

          {/* Kolom (khusus daftar) */}
          {docType === "list" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  Kolom yang ditampilkan <span className="font-normal text-zinc-400">(No & Nama selalu ada)</span>
                </span>
                <button
                  type="button"
                  onClick={() => set("columns", DEFAULT_LIST_COLUMNS)}
                  disabled={busy}
                  className="text-[11px] font-semibold text-[#B22234] dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Bawaan
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {LIST_COLUMNS.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={opts.columns.includes(c.key)}
                      onChange={() => toggleColumn(c.key)}
                      disabled={busy}
                      className="accent-[#B22234]"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {docType === "interview" && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Berisi identitas, jadwal & pewawancara, semua soal General + 5 soal terpilih per divisi beserta jawabannya (ditambah soal lain
              yang ikut dijawab), dan catatan. Untuk banyak orang, persempit filter agar PDF lebih cepat dibuat.
            </p>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <p className="font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-2 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#B22234] hover:bg-[#8B0000] text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-70"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {busy ? "Menyiapkan PDF..." : "Unduh PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
