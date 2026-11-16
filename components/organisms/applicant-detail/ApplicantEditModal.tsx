"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Loader2, Pencil, Upload, X } from "lucide-react";
import { updateApplicantDataAction, type ApplicantEditInput } from "@/app/actions/editApplicant";
import { validateCvMeta } from "@/utils/cvFile";
import type { ApplicantDetailData, DivisionItem } from "./types";

interface ApplicantEditModalProps {
  applicant: ApplicantDetailData;
  divisions: DivisionItem[];
  onClose: () => void;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#B22234]/30 focus:border-[#B22234] disabled:opacity-60";

function initialForm(a: ApplicantDetailData): ApplicantEditInput {
  return {
    full_name: a.full_name || "",
    nim: a.nim || "",
    angkatan: a.angkatan || "",
    whatsapp: a.whatsapp || "",
    fakultas: a.fakultas || "",
    prodi: a.prodi || "",
    twibbon_url: a.twibbon_url || "",
    portfolio_url: a.portfolio_url || "",
    primary_division_id: a.primary_division_id || "",
    primary_reason: a.primary_reason || "",
    secondary_division_id: a.secondary_division_id || "",
    secondary_reason: a.secondary_reason || "",
  };
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-zinc-400">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-bold text-[#18181b] dark:text-zinc-100 mb-2">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Pop-up edit data pendaftar (hanya superadmin). */
export function ApplicantEditModal({ applicant, divisions, onClose }: ApplicantEditModalProps) {
  const router = useRouter();
  const [initial] = useState(() => initialForm(applicant));
  const [form, setForm] = useState<ApplicantEditInput>(initial);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dataChanged = (Object.keys(form) as (keyof ApplicantEditInput)[]).some(
    (k) => form[k].trim() !== initial[k].trim()
  );
  const canSave = (dataChanged || cvFile !== null) && !busy;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const set = (key: keyof ApplicantEditInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    e.target.value = "";
    if (!file) return;
    const msg = validateCvMeta(file.name, file.size);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setCvFile(file);
  };

  const handleSave = async () => {
    if (!canSave) return;
    const lines = [`Simpan perubahan data ${applicant.full_name || "pendaftar"}?`];
    if (cvFile) {
      lines.push("", `CV lama (${applicant.cv_file_name || "berkas lama"}) akan DIHAPUS PERMANEN dari storage dan diganti dengan ${cvFile.name}.`);
    }
    if (!window.confirm(lines.join("\n"))) return;

    setBusy(true);
    setError(null);

    if (dataChanged) {
      const res = await updateApplicantDataAction(applicant.id, form);
      if (!res.success) {
        setBusy(false);
        setError(res.error || "Gagal menyimpan data.");
        return;
      }
    }

    if (cvFile) {
      try {
        const body = new FormData();
        body.append("cv_file", cvFile);
        const res = await fetch(`/api/applicants/${encodeURIComponent(applicant.id)}/cv`, { method: "POST", body });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setBusy(false);
          setError(
            `${dataChanged ? "Data tersimpan, tetapi " : ""}CV gagal diganti: ${json.error || `server merespons ${res.status}`}`
          );
          router.refresh();
          return;
        }
      } catch {
        setBusy(false);
        setError(`${dataChanged ? "Data tersimpan, tetapi " : ""}CV gagal diunggah. Periksa koneksi lalu coba lagi.`);
        router.refresh();
        return;
      }
    }

    setBusy(false);
    router.refresh();
    onClose();
  };

  const secondaryOptions = divisions.filter((d) => d.id !== form.primary_division_id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-applicant-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[94vh] flex flex-col shadow-2xl text-left">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2
            id="edit-applicant-title"
            className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100"
          >
            <Pencil className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            Edit Data Pendaftar
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-6 overflow-y-auto">
          <p className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            Khusus superadmin. Perubahan langsung tampil di Dashboard Akun pendaftar. Email login tidak dapat diubah.
          </p>

          <Section title="Identitas">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nama Lengkap">
                <input className={inputClass} value={form.full_name} onChange={set("full_name")} disabled={busy} />
              </Field>
              <Field label="NIM">
                <input className={`${inputClass} font-mono`} value={form.nim} onChange={set("nim")} disabled={busy} />
              </Field>
              <Field label="Angkatan">
                <select className={inputClass} value={form.angkatan} onChange={set("angkatan")} disabled={busy}>
                  <option value="">-</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </Field>
              <Field label="No. WhatsApp" hint="Diawali 08">
                <input
                  className={`${inputClass} font-mono`}
                  inputMode="tel"
                  value={form.whatsapp}
                  onChange={set("whatsapp")}
                  disabled={busy}
                />
              </Field>
            </div>
          </Section>

          <Section title="Data Akademik">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Fakultas">
                <input className={inputClass} value={form.fakultas} onChange={set("fakultas")} disabled={busy} />
              </Field>
              <Field label="Program Studi">
                <input className={inputClass} value={form.prodi} onChange={set("prodi")} disabled={busy} />
              </Field>
            </div>
          </Section>

          <Section title="Pilihan Divisi">
            <div className="space-y-3">
              <Field label="Divisi Pilihan 1">
                <select
                  className={inputClass}
                  value={form.primary_division_id}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      primary_division_id: v,
                      secondary_division_id: f.secondary_division_id === v ? "" : f.secondary_division_id,
                    }));
                  }}
                  disabled={busy}
                >
                  <option value="">Pilih divisi</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Alasan Pilihan 1">
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={form.primary_reason}
                  onChange={set("primary_reason")}
                  disabled={busy}
                />
              </Field>
              <Field label="Divisi Pilihan 2">
                <select
                  className={inputClass}
                  value={form.secondary_division_id}
                  onChange={set("secondary_division_id")}
                  disabled={busy}
                >
                  <option value="">Tidak ada</option>
                  {secondaryOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category})
                    </option>
                  ))}
                </select>
              </Field>
              {form.secondary_division_id && (
                <Field label="Alasan Pilihan 2">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={form.secondary_reason}
                    onChange={set("secondary_reason")}
                    disabled={busy}
                  />
                </Field>
              )}
            </div>
          </Section>

          <Section title="Berkas & Tautan">
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <FileText className="w-4 h-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#18181b] dark:text-zinc-100 truncate">
                      {cvFile ? cvFile.name : applicant.cv_file_name || "Belum ada CV"}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {cvFile ? `CV baru · ${(cvFile.size / 1024).toFixed(0)} KB` : "CV saat ini"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {cvFile && (
                    <button
                      type="button"
                      onClick={() => setCvFile(null)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer"
                    >
                      Batal ganti
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#B22234]/30 bg-[#FCF2F3] dark:bg-rose-950/20 text-[11px] font-semibold text-[#B22234] dark:text-rose-400 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {cvFile ? "Pilih lagi" : "Ganti CV"}
                  </button>
                  <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={pickFile} />
                </div>
              </div>
              {cvFile && (
                <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
                  Saat disimpan, CV lama dihapus permanen dari storage dan diganti berkas ini.
                </p>
              )}
              <p className="text-[10px] text-zinc-400">PDF, maksimal 1 MB.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tautan Twibbon">
                <input className={inputClass} value={form.twibbon_url} onChange={set("twibbon_url")} disabled={busy} />
              </Field>
              <Field label="Tautan Portofolio">
                <input
                  className={inputClass}
                  value={form.portfolio_url}
                  onChange={set("portfolio_url")}
                  disabled={busy}
                />
              </Field>
            </div>
          </Section>

          {error && (
            <p
              role="alert"
              className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-300"
            >
              {error}
            </p>
          )}
        </div>

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
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#B22234] hover:bg-[#8B0000] text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
