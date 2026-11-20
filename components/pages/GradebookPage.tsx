"use client";

import React, { useEffect, useState } from "react";
import { ClipboardCheck, Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  ATTENDANCE_BADGE_CLASS,
  ATTENDANCE_LABELS,
  isAttended,
  type AttendanceStatus,
} from "@/utils/divisionEvents.types";

interface DivisionItem {
  id: string;
  name: string;
  category: string;
}

interface GradebookPageProps {
  divisions: DivisionItem[];
  /** Divisi bawaan admin (id divisi, atau "teknis" = divisi teknis) */
  defaultDivision?: string | null;
  canAssess: boolean;
  canMarkAttendance: boolean;
}

type Attendance = Exclude<AttendanceStatus, "pending">;
const MAGANG_OPTIONS: Attendance[] = ["present", "late", "excused", "absent"];

interface Candidate {
  id: string;
  full_name: string | null;
  nim: string | null;
  fakultas: string | null;
  prodi: string | null;
}

/** Kolom pertemuan: jadwal magang (diisi admin) atau acara divisi (dari scan QR) */
interface Meeting {
  key: string;
  kind: "magang" | "acara";
  id: string;
  label: string;
  at: string;
}

interface Item {
  id: string;
  title: string;
}

interface Score {
  score: number | null;
  note: string | null;
}

interface GradebookData {
  divisionId: string;
  candidates: Candidate[];
  meetings: Meeting[];
  /** `${meeting.key}:${applicantId}` -> status tercatat */
  attendance: Record<string, Attendance>;
  items: Item[];
  /** `${itemId}:${applicantId}` */
  scores: Record<string, Score>;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });

async function loadGradebook(divisionId: string): Promise<GradebookData> {
  const supabase = createClient();
  const [cands, schedules, events, items] = await Promise.all([
    supabase
      .from("applicant_divisions")
      .select("applicants!inner(id, full_name, nim, fakultas, prodi, status)")
      .eq("division_id", divisionId)
      .eq("priority", 1)
      .eq("applicants.status", "submitted"),
    supabase.from("internship_schedules").select("id, scheduled_at, location").eq("division_id", divisionId),
    supabase
      .from("division_events")
      .select("id, title, event_date")
      .or(`division_id.eq.${divisionId},division_id.is.null`)
      .eq("is_active", true),
    supabase.from("assessment_items").select("id, title").eq("division_id", divisionId).order("created_at"),
  ]);

  const candidates = (cands.data || [])
    .map((r) => r.applicants as unknown as Candidate)
    .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "id", { sensitivity: "base" }));
  const scheduleIds = (schedules.data || []).map((s) => s.id);
  const eventIds = (events.data || []).map((e) => e.id);
  const itemIds = (items.data || []).map((i) => i.id);

  const [magang, attendances, scores] = await Promise.all([
    scheduleIds.length
      ? supabase.from("internship_attendance").select("schedule_id, applicant_id, status").in("schedule_id", scheduleIds)
      : { data: [] },
    eventIds.length
      ? supabase.from("event_attendances").select("event_id, applicant_id, status").in("event_id", eventIds)
      : { data: [] },
    itemIds.length
      ? supabase.from("assessment_scores").select("item_id, applicant_id, score, note").in("item_id", itemIds)
      : { data: [] },
  ]);

  const attendance: Record<string, Attendance> = {};
  for (const m of magang.data || []) attendance[`magang-${m.schedule_id}:${m.applicant_id}`] = m.status as Attendance;
  for (const a of attendances.data || []) {
    if (a.status !== "pending") attendance[`acara-${a.event_id}:${a.applicant_id}`] = a.status as Attendance;
  }

  const scoreMap: Record<string, Score> = {};
  for (const s of scores.data || []) {
    scoreMap[`${s.item_id}:${s.applicant_id}`] = { score: s.score === null ? null : Number(s.score), note: s.note };
  }

  const meetings: Meeting[] = [
    ...(schedules.data || []).map((s) => ({
      key: `magang-${s.id}`,
      kind: "magang" as const,
      id: s.id,
      label: `Magang ${shortDate(s.scheduled_at)}`,
      at: s.scheduled_at,
    })),
    ...(events.data || []).map((e) => ({
      key: `acara-${e.id}`,
      kind: "acara" as const,
      id: e.id,
      label: e.title,
      at: e.event_date,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return { divisionId, candidates, meetings, attendance, items: items.data || [], scores: scoreMap };
}


/** Tabel penilaian per divisi Pilihan 1: kehadiran pertemuan + item nilai buatan admin. */
export function GradebookPage({ divisions, defaultDivision, canAssess, canMarkAttendance }: GradebookPageProps) {
  const techDivisions = divisions.filter((d) => d.category === "teknis");
  const initialDivision =
    defaultDivision === "teknis"
      ? techDivisions[0]?.id || divisions[0]?.id || ""
      : divisions.some((d) => d.id === defaultDivision)
        ? (defaultDivision as string)
        : divisions[0]?.id || "";
  const [divisionId, setDivisionId] = useState(initialDivision);
  const [data, setData] = useState<GradebookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  // Waktu "sekarang" ditetapkan sekali agar render tetap murni
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    loadGradebook(divisionId)
      .then((d) => active && setData(d))
      .catch(() => active && setError("Gagal memuat data penilaian."));
    return () => {
      active = false;
    };
  }, [divisionId]);

  const loading = !data || data.divisionId !== divisionId;

  const update = (fn: (d: GradebookData) => GradebookData) => setData((d) => (d ? fn(d) : d));

  // Status magang dipilih admin; "" = kosongkan (lewat jadwal tetap terhitung Alpha)
  const setMagang = async (m: Meeting, applicantId: string, value: Attendance | "") => {
    const key = `${m.key}:${applicantId}`;
    const supabase = createClient();
    setError(null);
    const { error: err } = value
      ? await supabase
          .from("internship_attendance")
          .upsert(
            { schedule_id: m.id, applicant_id: applicantId, status: value, updated_at: new Date().toISOString() },
            { onConflict: "schedule_id,applicant_id" }
          )
      : await supabase.from("internship_attendance").delete().match({ schedule_id: m.id, applicant_id: applicantId });
    if (err) return setError(err.message);
    update((d) => {
      const attendance = { ...d.attendance };
      if (value) attendance[key] = value;
      else delete attendance[key];
      return { ...d, attendance };
    });
  };

  const saveScore = async (itemId: string, applicantId: string, patch: Partial<Score>) => {
    if (!data) return;
    const key = `${itemId}:${applicantId}`;
    const merged: Score = { ...(data.scores[key] ?? { score: null, note: null }), ...patch };
    setError(null);
    const { error: err } = await createClient()
      .from("assessment_scores")
      .upsert(
        { item_id: itemId, applicant_id: applicantId, score: merged.score, note: merged.note, updated_at: new Date().toISOString() },
        { onConflict: "item_id,applicant_id" }
      );
    if (err) return setError(err.message);
    update((d) => ({ ...d, scores: { ...d.scores, [key]: merged } }));
  };

  const handleScoreBlur = (itemId: string, applicantId: string, raw: string) => {
    const current = data?.scores[`${itemId}:${applicantId}`]?.score ?? null;
    const value = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    if (value !== null && (Number.isNaN(value) || value < 0 || value > 100)) {
      setError("Nilai harus angka 0–100.");
      return;
    }
    if (value !== current) void saveScore(itemId, applicantId, { score: value });
  };

  const handleNote = (itemId: string, applicantId: string, name: string | null) => {
    const current = data?.scores[`${itemId}:${applicantId}`]?.note || "";
    const note = window.prompt(`Catatan untuk ${name || "calon anggota"}:`, current);
    if (note === null || note === current) return;
    void saveScore(itemId, applicantId, { note: note.trim() ? note.trim().slice(0, 500) : null });
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newItem.trim();
    if (!title) return;
    setSavingItem(true);
    setError(null);
    const { data: item, error: err } = await createClient()
      .from("assessment_items")
      .insert({ division_id: divisionId, title: title.slice(0, 80) })
      .select("id, title")
      .single();
    setSavingItem(false);
    if (err || !item) return setError(err?.message || "Gagal menambah item penilaian.");
    update((d) => ({ ...d, items: [...d.items, item] }));
    setNewItem("");
  };

  const deleteItem = async (item: Item) => {
    if (!window.confirm(`Hapus item penilaian "${item.title}" beserta semua nilainya?`)) return;
    const { error: err } = await createClient().from("assessment_items").delete().eq("id", item.id);
    if (err) return setError(err.message);
    update((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) }));
  };

  const attendanceOf = (m: Meeting, applicantId: string): Attendance | null =>
    data?.attendance[`${m.key}:${applicantId}`] || (new Date(m.at).getTime() < now ? "absent" : null);

  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#B22234] dark:text-rose-400" />
              Penilaian Calon Anggota
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Calon anggota Pilihan 1 divisi ini. Kolom pertemuan muncul otomatis dari Jadwal Magang dan acara yang dibuat.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Divisi
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {canAssess && (
          <form onSubmit={addItem} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Item penilaian baru, mis. Tugas 1"
              maxLength={80}
              aria-label="Nama item penilaian baru"
              className="flex-1 min-w-48 max-w-sm px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={savingItem || !newItem.trim() || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#B22234] text-white hover:bg-[#8B0000] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {savingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Tambah Item Penilaian
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : data.candidates.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400">
            Belum ada calon anggota dengan Pilihan 1 divisi ini.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl shadow-xs overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center font-mono">No</th>
                  <th className="py-2.5 px-3 min-w-48 sticky left-0 bg-zinc-50 dark:bg-zinc-900 z-10">Calon Anggota</th>
                  {data.meetings.map((m) => (
                    <th key={m.key} className="py-2.5 px-2 text-center min-w-20 font-semibold" title={m.label}>
                      <span className="block text-[10px] uppercase tracking-wide text-zinc-400">{m.kind}</span>
                      <span className="block max-w-28 truncate">{m.kind === "acara" ? m.label : shortDate(m.at)}</span>
                    </th>
                  ))}
                  {data.items.map((item) => (
                    <th key={item.id} className="py-2.5 px-2 text-center min-w-24 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <span className="max-w-28 truncate" title={item.title}>
                          {item.title}
                        </span>
                        {canAssess && (
                          <button
                            type="button"
                            onClick={() => deleteItem(item)}
                            aria-label={`Hapus item ${item.title}`}
                            className="p-0.5 rounded text-zinc-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center font-semibold">Hadir</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/60">
                {data.candidates.map((c, idx) => {
                  const done = data.meetings.filter((m) => attendanceOf(m, c.id) !== null);
                  const present = done.filter((m) => isAttended(attendanceOf(m, c.id))).length;
                  const values = data.items
                    .map((i) => data.scores[`${i.id}:${c.id}`]?.score)
                    .filter((v): v is number => typeof v === "number");
                  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
                  return (
                    <tr key={c.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                      <td className="py-2 px-3 text-center font-mono text-zinc-400">{idx + 1}</td>
                      <td className="py-2 px-3 sticky left-0 bg-white dark:bg-[#121215] z-10">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{c.full_name || "-"}</p>
                        <p className="font-mono text-[11px] text-zinc-500">{c.nim || "-"}</p>
                        <p className="text-[11px] text-zinc-500">
                          {c.fakultas || "-"}
                          {c.prodi && ` · ${c.prodi}`}
                        </p>
                      </td>
                      {data.meetings.map((m) => {
                        const status = attendanceOf(m, c.id);
                        const badge = status ? (
                          <span className={`inline-block px-2 py-0.5 rounded font-semibold ${ATTENDANCE_BADGE_CLASS[status]}`}>
                            {ATTENDANCE_LABELS[status]}
                          </span>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600">–</span>
                        );
                        return (
                          <td key={m.key} className="py-2 px-2 text-center">
                            {m.kind === "magang" && canMarkAttendance ? (
                              <select
                                value={data.attendance[`${m.key}:${c.id}`] || ""}
                                onChange={(e) => setMagang(m, c.id, e.target.value as Attendance | "")}
                                aria-label={`Kehadiran ${m.label} ${c.full_name || ""}`}
                                className={`px-1.5 py-0.5 rounded font-semibold border-0 cursor-pointer ${
                                  status ? ATTENDANCE_BADGE_CLASS[status] : "bg-zinc-50 text-zinc-400 dark:bg-zinc-900"
                                }`}
                              >
                                <option value="">{status === "absent" ? "Alpha" : "–"}</option>
                                {MAGANG_OPTIONS.map((st) => (
                                  <option key={st} value={st}>
                                    {ATTENDANCE_LABELS[st]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              badge
                            )}
                          </td>
                        );
                      })}
                      {data.items.map((item) => {
                        const s = data.scores[`${item.id}:${c.id}`];
                        return (
                          <td key={item.id} className="py-2 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                // key ikut nilai agar input terbarui setelah disimpan
                                key={`${item.id}:${c.id}:${s?.score ?? ""}`}
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                defaultValue={s?.score ?? ""}
                                disabled={!canAssess}
                                onBlur={(e) => handleScoreBlur(item.id, c.id, e.target.value)}
                                aria-label={`Nilai ${item.title} ${c.full_name || ""}`}
                                className="w-16 px-1.5 py-1 text-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded tabular-nums disabled:opacity-70"
                              />
                              {(canAssess || s?.note) && (
                                <button
                                  type="button"
                                  onClick={() => canAssess && handleNote(item.id, c.id, c.full_name)}
                                  title={s?.note || "Tambah catatan"}
                                  aria-label={s?.note ? `Catatan: ${s.note}` : "Tambah catatan"}
                                  className={`p-1 rounded cursor-pointer ${s?.note ? "text-[#B22234] dark:text-rose-400" : "text-zinc-300 hover:text-zinc-500"}`}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-center font-mono tabular-nums">
                        {done.length ? `${present}/${done.length}` : "–"}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold tabular-nums">
                        {avg === null ? "–" : avg.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
