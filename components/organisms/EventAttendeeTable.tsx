"use client";

import React, { useState, useMemo } from "react";
import { Search, RefreshCw, X, FileX } from "lucide-react";
import { ApplicantSearchPicker, type PickedApplicant } from "@/components/organisms/ApplicantSearchPicker";
import { createClient } from "@/utils/supabase/client";
import {
  ATTENDANCE_BADGE_CLASS,
  ATTENDANCE_LABELS,
  type AttendanceStatus,
  type EventAttendanceItem,
} from "@/utils/divisionEvents.types";

const STATUS_ORDER: AttendanceStatus[] = ["pending", "present", "late", "excused", "absent"];
import { formatJakartaDateTime } from "@/utils/jakartaTime";

interface EventAttendeeTableProps {
  eventId: string;
  attendees: EventAttendanceItem[];
  canManage: boolean;
  /** Acara terbuka: tidak ada daftar awal, peserta muncul saat dipindai */
  isOpenEvent?: boolean;
  onRefresh: () => Promise<void> | void;
}

export function EventAttendeeTable({
  eventId,
  attendees,
  canManage,
  isOpenEvent = false,
  onRefresh,
}: EventAttendeeTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>("all");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attendees.filter((row) => {
      const name = row.applicant?.full_name?.toLowerCase() || "";
      const nim = row.applicant?.nim?.toLowerCase() || "";
      const prodi = row.applicant?.prodi?.toLowerCase() || "";
      const matchesSearch =
        !q || name.includes(q) || nim.includes(q) || prodi.includes(q);

      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [attendees, searchQuery, statusFilter]);

  const handleSyncAttendees = async () => {
    if (!canManage || isSyncing) return;
    try {
      setIsSyncing(true);
      const supabase = createClient();
      await supabase.rpc("sync_event_attendees", { p_event_id: eventId });
      await onRefresh();
    } finally {
      setIsSyncing(false);
    }
  };

  // Ubah status manual (tanpa batas jam scan). "Belum Hadir" mengosongkan; acara terbuka: baris dihapus
  const setStatus = async (applicantId: string, status: AttendanceStatus) => {
    setStatusError(null);
    setSavingId(applicantId);
    const { error } = await createClient().rpc("set_event_attendance", {
      p_event_id: eventId,
      p_applicant_id: applicantId,
      p_status: status,
    });
    setSavingId(null);
    if (error) setStatusError(error.message);
    await onRefresh();
  };

  return (
    <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
      {/* Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIM, atau prodi..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | AttendanceStatus)
            }
            aria-label="Filter status kehadiran"
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden cursor-pointer"
          >
            <option value="all">Semua ({attendees.length})</option>
            {STATUS_ORDER.map((st) => (
              <option key={st} value={st}>
                {ATTENDANCE_LABELS[st]}
              </option>
            ))}
          </select>
        </div>

        {canManage && !isOpenEvent && (
          <button
            type="button"
            onClick={handleSyncAttendees}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
            />
            <span>Sinkronkan Anggota Divisi</span>
          </button>
        )}
      </div>

      {canManage && (
        <div className="px-3.5 sm:px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <FileX className="w-3.5 h-3.5" />
            Tambah peserta izin
          </p>
          <div className="max-w-md">
            <ApplicantSearchPicker
              placeholder="Cari nama atau NIM yang izin..."
              onPick={(a: PickedApplicant) => setStatus(a.id, "excused")}
            />
          </div>
        </div>
      )}
      {statusError && (
        <p role="alert" className="px-4 py-2 text-xs text-rose-600 dark:text-rose-400">
          {statusError}
        </p>
      )}

      {/* Tabel Peserta & Data Tiket QR */}
      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800">
              <tr className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-12 font-mono">No</th>
                <th className="py-3 px-4">Nama Calon Anggota</th>
                <th className="py-3 px-4 w-32">NIM</th>
                <th className="py-3 px-4">Token Tiket</th>
                <th className="py-3 px-4 w-44">Status Kehadiran</th>
                {canManage && (
                  <th className="py-3 px-4 text-right w-40">Ubah Status</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/60 text-xs sm:text-sm">
              {filtered.map((row, idx) => {
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono text-xs text-zinc-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {row.applicant?.full_name || "Nama belum diisi"}
                      </p>
                      {row.applicant?.prodi && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {row.applicant.prodi}
                        </p>
                      )}
                      {row.applicant?.divisions && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {row.applicant.divisions}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {row.applicant?.nim || "-"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span
                        title={row.qr_token}
                        className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      >
                        {row.qr_token.slice(0, 10)}…
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ATTENDANCE_BADGE_CLASS[row.status]}`}
                        >
                          {ATTENDANCE_LABELS[row.status]}
                        </span>
                        {row.checked_in_at && (row.status === "present" || row.status === "late") && (
                          <p className="text-[10px] text-zinc-400 font-mono">
                            {formatJakartaDateTime(row.checked_in_at)}
                          </p>
                        )}
                      </div>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <select
                          value={row.status}
                          disabled={savingId === row.applicant_id}
                          onChange={(e) => setStatus(row.applicant_id, e.target.value as AttendanceStatus)}
                          aria-label={`Status kehadiran ${row.applicant?.full_name || ""}`}
                          className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-900 dark:text-zinc-100 cursor-pointer disabled:opacity-50"
                        >
                          {STATUS_ORDER.map((st) => (
                            <option key={st} value={st}>
                              {ATTENDANCE_LABELS[st]}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 px-4 text-center space-y-1.5">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {isOpenEvent ? "Belum ada yang di-scan" : "Belum ada data peserta untuk acara ini"}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isOpenEvent ? (
              "Calon anggota muncul di sini setelah QR-nya dipindai."
            ) : (
              <>
                Klik &quot;Sinkronkan Anggota Divisi&quot; jika ada calon anggota baru
                yang diterima atau mendaftar di divisi ini.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

