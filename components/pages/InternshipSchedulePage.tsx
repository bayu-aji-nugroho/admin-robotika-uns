"use client";

import React, { useState } from "react";
import { Briefcase, MapPin, Plus, Trash2, Loader2, X } from "lucide-react";
import { ApplicantSearchPicker, type PickedApplicant } from "@/components/organisms/ApplicantSearchPicker";
import { createClient } from "@/utils/supabase/client";
import { ATTENDANCE_BADGE_CLASS, ATTENDANCE_LABELS, type AttendanceStatus } from "@/utils/divisionEvents.types";

type MagangStatus = Exclude<AttendanceStatus, "pending">;
const MAGANG_OPTIONS: MagangStatus[] = ["present", "late", "excused", "absent"];
import { formatJakartaDateTime, fromJakartaInputValue } from "@/utils/jakartaTime";

interface DivisionItem {
  id: string;
  name: string;
  category: string;
}

interface ScheduleItem {
  id: string;
  division_id: string;
  scheduled_at: string;
  location: string;
}

/** Kehadiran tercatat untuk satu jadwal (izin, terlambat, alpha, hadir) */
export interface ExcuseItem {
  schedule_id: string;
  applicant_id: string;
  status: MagangStatus;
  full_name: string | null;
  nim: string | null;
}

interface InternshipSchedulePageProps {
  divisions: DivisionItem[];
  initialSchedules: ScheduleItem[];
  canManage: boolean;
  /** Divisi bawaan admin (id divisi, atau "teknis" = semua divisi teknis) */
  defaultDivision?: string | null;
  /** Peserta izin per jadwal */
  initialExcuses?: ExcuseItem[];
}

/** Pilihan khusus: satu jadwal untuk semua divisi teknis (Werkudara & Cakrawala) */
const ALL_TECH = "teknis";

const INPUT_CLASS =
  "w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden";

/** Jadwal magang per divisi; calon anggota melihat jadwal divisi Pilihan 1-nya di website. */
export function InternshipSchedulePage({
  divisions,
  initialSchedules,
  canManage,
  defaultDivision,
  initialExcuses = [],
}: InternshipSchedulePageProps) {
  const [excuses, setExcuses] = useState<ExcuseItem[]>(initialExcuses);
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const techIds = divisions.filter((d) => d.category === "teknis").map((d) => d.id);
  const initialDivision =
    defaultDivision === ALL_TECH || divisions.some((d) => d.id === defaultDivision)
      ? (defaultDivision as string)
      : divisions[0]?.id || "";
  const [divisionId, setDivisionId] = useState(initialDivision);
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const iso = fromJakartaInputValue(dateTime);
    if (!divisionId) return setError("Pilih divisi.");
    if (!iso) return setError("Isi tanggal & jam.");
    if (location.trim().length < 2) return setError("Isi tempat (minimal 2 karakter).");

    setSaving(true);
    setError(null);
    // "Semua Divisi Teknis" = satu baris per divisi teknis agar tampil di Pilihan 1 masing-masing
    const targets = divisionId === ALL_TECH ? techIds : [divisionId];
    const { data, error: err } = await createClient()
      .from("internship_schedules")
      .insert(targets.map((id) => ({ division_id: id, scheduled_at: iso, location: location.trim() })))
      .select("id, division_id, scheduled_at, location");
    setSaving(false);
    if (err || !data) return setError(err?.message || "Gagal menyimpan jadwal.");
    setSchedules((prev) => [...prev, ...data].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
    setDateTime("");
  };

  const handleDelete = async (item: ScheduleItem) => {
    if (!window.confirm(`Hapus jadwal ${formatJakartaDateTime(item.scheduled_at)} di ${item.location}?`)) return;
    setDeletingId(item.id);
    const { error: err } = await createClient().from("internship_schedules").delete().eq("id", item.id);
    setDeletingId(null);
    if (err) return setError(err.message);
    setSchedules((prev) => prev.filter((s) => s.id !== item.id));
  };

  // Tambah lewat pencarian = Izin; statusnya bisa diganti (Terlambat, Alpha, Hadir) di daftar
  const setAttendance = async (scheduleId: string, a: PickedApplicant, status: MagangStatus) => {
    setError(null);
    const { error: err } = await createClient()
      .from("internship_attendance")
      .upsert(
        { schedule_id: scheduleId, applicant_id: a.id, status, updated_at: new Date().toISOString() },
        { onConflict: "schedule_id,applicant_id" }
      );
    if (err) return setError(err.message);
    setExcuses((prev) => [
      ...prev.filter((x) => !(x.schedule_id === scheduleId && x.applicant_id === a.id)),
      { schedule_id: scheduleId, applicant_id: a.id, status, full_name: a.full_name, nim: a.nim },
    ]);
  };

  const removeExcuse = async (x: ExcuseItem) => {
    setError(null);
    const { error: err } = await createClient()
      .from("internship_attendance")
      .delete()
      .eq("schedule_id", x.schedule_id)
      .eq("applicant_id", x.applicant_id);
    if (err) return setError(err.message);
    setExcuses((prev) => prev.filter((e) => !(e.schedule_id === x.schedule_id && e.applicant_id === x.applicant_id)));
  };

  const grouped = divisions
    .map((div) => ({ div, items: schedules.filter((s) => s.division_id === div.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#B22234] dark:text-rose-400" />
            Jadwal Magang
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Tanggal, jam, dan tempat magang per divisi. Calon anggota melihat jadwal divisi Pilihan 1-nya di Dashboard
            website.
          </p>
        </div>

        {canManage && (
          <form
            onSubmit={handleAdd}
            className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
          >
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Tambah Jadwal</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Divisi</span>
                <select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className={INPUT_CLASS}>
                  {techIds.length > 0 && <option value={ALL_TECH}>Semua Divisi Teknis (Werkudara &amp; Cakrawala)</option>}
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tanggal &amp; Jam (WIB)</span>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className={INPUT_CLASS}
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tempat</span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="mis. Lab Robotika Gedung I"
                  maxLength={200}
                  className={INPUT_CLASS}
                  required
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#B22234] text-white hover:bg-[#8B0000] disabled:opacity-60 transition-colors shadow-xs cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Tambah Jadwal
            </button>
          </form>
        )}

        {grouped.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400">
            Belum ada jadwal magang.
          </div>
        ) : (
          grouped.map(({ div, items }) => (
            <section
              key={div.id}
              className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
            >
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {div.name} <span className="font-normal text-zinc-500">({items.length})</span>
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <li key={s.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{formatJakartaDateTime(s.scheduled_at)}</p>
                      <p className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 break-words">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {s.location}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        disabled={deletingId === s.id}
                        aria-label="Hapus jadwal"
                        className="p-1.5 -m-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 cursor-pointer"
                      >
                        {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {/* Peserta izin untuk jadwal ini */}
                  {(() => {
                    const list = excuses.filter((x) => x.schedule_id === s.id);
                    return (
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                        <p className="font-semibold text-zinc-700 dark:text-zinc-300">Izin / Catatan Kehadiran ({list.length})</p>
                        {list.length > 0 && (
                          <ul className="space-y-1">
                            {list.map((x) => (
                              <li key={x.applicant_id} className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate text-zinc-800 dark:text-zinc-200">
                                  {x.full_name || "-"} <span className="font-mono text-zinc-500">{x.nim || ""}</span>
                                </span>
                                {canManage ? (
                                  <select
                                    value={x.status}
                                    onChange={(e) =>
                                      setAttendance(
                                        s.id,
                                        { id: x.applicant_id, full_name: x.full_name, nim: x.nim },
                                        e.target.value as MagangStatus
                                      )
                                    }
                                    aria-label={`Status ${x.full_name || ""}`}
                                    className={`ml-auto px-1.5 py-0.5 rounded font-semibold border-0 cursor-pointer ${ATTENDANCE_BADGE_CLASS[x.status]}`}
                                  >
                                    {MAGANG_OPTIONS.map((st) => (
                                      <option key={st} value={st}>
                                        {ATTENDANCE_LABELS[st]}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`ml-auto px-1.5 py-0.5 rounded font-semibold ${ATTENDANCE_BADGE_CLASS[x.status]}`}>
                                    {ATTENDANCE_LABELS[x.status]}
                                  </span>
                                )}
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => removeExcuse(x)}
                                    aria-label={`Hapus catatan kehadiran ${x.full_name || ""}`}
                                    className="p-1 -m-1 rounded text-zinc-400 hover:text-rose-600 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {canManage && (
                          <ApplicantSearchPicker
                            placeholder="Tambah izin: nama / NIM"
                            onPick={(a) => setAttendance(s.id, a, "excused")}
                          />
                        )}
                      </div>
                    );
                  })()}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
