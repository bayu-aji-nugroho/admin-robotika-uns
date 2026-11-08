"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, X, RotateCcw, RefreshCw, ChevronRight, FileDown, FileText } from "lucide-react";
import { downloadFromApi } from "@/utils/downloadFile";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export interface RegistrationItem {
  id: string;
  full_name: string | null;
  nim: string | null;
  primary_division_name?: string | null;
  status?: string | null;
  assessment_status?: string | null;
  current_step?: number | null;
  registration_code?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
}

export type DecisionStatusType = "accepted" | "rejected" | "pending" | "incomplete";

export interface HasilOprecMeta {
  type: DecisionStatusType;
  label: string;
  bgColor: string;
  borderColor: string;
  isAutoRejected: boolean;
}


export function getHasilOprec(item: RegistrationItem): HasilOprecMeta {
  const step =
    typeof item.current_step === "number"
      ? item.current_step
      : Number(item.current_step) || 0;
  const hasRegCode = Boolean(
    item.registration_code && item.registration_code.trim().length > 0
  );

  const isComplete = step >= 6 && hasRegCode;

  // 1. Jika data belum lengkap -> indikator oranye (Belum Lengkap)
  if (!isComplete) {
    return {
      type: "incomplete",
      label: "Belum Lengkap",
      bgColor: "bg-amber-500 dark:bg-amber-500",
      borderColor: "border-amber-600/30 dark:border-amber-400/30",
      isAutoRejected: false,
    };
  }

  // 2. Jika sudah melengkapi current step dan memiliki kode registrasi:
  // Cek jika ada keputusan eksplisit dari admin (baik dari assessments maupun registrations status)
  const rawStatus = (item.assessment_status || item.status || "").toLowerCase().trim();
  if (
    rawStatus === "accepted" ||
    rawStatus === "diterima" ||
    rawStatus === "lolos" ||
    rawStatus === "acc"
  ) {
    return {
      type: "accepted",
      label: "Diterima",
      bgColor: "bg-emerald-500 dark:bg-emerald-400",
      borderColor: "border-emerald-600/30 dark:border-emerald-300/30",
      isAutoRejected: false,
    };
  }

  if (
    rawStatus === "rejected" ||
    rawStatus === "ditolak" ||
    rawStatus === "tolak"
  ) {
    return {
      type: "rejected",
      label: "Ditolak",
      bgColor: "bg-[#B22234] dark:bg-rose-500",
      borderColor: "border-rose-700/30 dark:border-rose-400/30",
      isAutoRejected: false,
    };
  }

  // Default saat sudah selesai melengkapi pendaftaran: Dipertimbangkan (abu-abu)
  return {
    type: "pending",
    label: "Dipertimbangkan",
    bgColor: "bg-zinc-400 dark:bg-zinc-500",
    borderColor: "border-zinc-500/30 dark:border-zinc-400/30",
    isAutoRejected: false,
  };
}

/**
 * Mendapatkan status tahap pendaftaran peserta berdasarkan field current_step di database
 */
export function getParticipantStep(item: RegistrationItem): {
  step: number;
  label: string;
  isComplete: boolean;
} {
  const step =
    typeof item.current_step === "number"
      ? item.current_step
      : Number(item.current_step) || 0;
  const hasRegCode = Boolean(
    item.registration_code && item.registration_code.trim().length > 0
  );
  const isComplete = step >= 6 && hasRegCode;

  // Format label bersih tanpa spasi ganjil: "Lengkap (6/6)" / "Belum Lengkap (n/6)"
  const label = isComplete
    ? "Lengkap (6/6)"
    : `Belum Lengkap (${step}/6)`;

  return {
    step,
    label,
    isComplete,
  };
}

interface ApplicantListProps {
  initialRegistrations: RegistrationItem[];
  /** Pilihan filter ekspor PDF (berdasarkan divisi diterima) */
  divisions?: { id: string; name: string }[];
}

export function ApplicantList({ initialRegistrations, divisions = [] }: ApplicantListProps) {
  const router = useRouter();
  const [registrations, setRegistrations] =
    useState<RegistrationItem[]>(initialRegistrations);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState<"list" | "interview" | null>(null);
  const [exportDivision, setExportDivision] = useState("all");

  // "list" = PDF daftar ringkas, "interview" = lembar hasil wawancara (pertanyaan + jawaban)
  const handleExport = async (kind: "list" | "interview") => {
    setIsExporting(kind);
    const division = encodeURIComponent(exportDivision);
    const error =
      kind === "list"
        ? await downloadFromApi(`/api/export/applicants?division=${division}`, "Calon_Anggota_Robotika_UNS.pdf")
        : await downloadFromApi(`/api/export/interview-report?division=${division}`, "Lembar_Wawancara.pdf");
    setIsExporting(null);
    if (error) window.alert(error);
  };

  // Filter data berdasarkan query pencarian dan status hasil oprec terpilih
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((item) => {
      const name = item.full_name?.toLowerCase() || "";
      const nim = item.nim?.toLowerCase() || "";
      const stepInfo = getParticipantStep(item);
      const stepText = stepInfo.label.toLowerCase();
      const code = item.registration_code?.toLowerCase() || "";
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        nim.includes(query) ||
        stepText.includes(query) ||
        code.includes(query);

      const hasilMeta = getHasilOprec(item);
      const matchesStatus =
        selectedStatus === "all" || hasilMeta.type === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [registrations, searchQuery, selectedStatus]);

  const hasActiveFilter = searchQuery.trim() !== "" || selectedStatus !== "all";

  const handleResetFilter = () => {
    setSearchQuery("");
    setSelectedStatus("all");
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      const supabase = createClient();
      let { data, error } = await supabase
        .from("view_registrations")
        .select(
          "id, full_name, nim, primary_division_name, status, assessment_status, current_step, registration_code, created_at, submitted_at"
        )
        .order("created_at", { ascending: true });

      if (error || !data) {
        // Fallback ke view/tabel registrations jika diperlukan
        const fallback = await supabase
          .from("registrations")
          .select(
            "id, full_name, nim, primary_division_name, status, assessment_status, current_step, registration_code, created_at, submitted_at"
          )
          .order("created_at", { ascending: true });
        if (!fallback.error && fallback.data) {
          data = fallback.data;
          error = null;
        }
      }

      if (!error && data) {
        setRegistrations(data);
      }
      router.refresh();
    } catch {
      // Pertahankan data yang ada jika terjadi kendala jaringan
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
      {/* 1. Integrated Toolbar (Search, Filter Hasil OPREC, Total Counter, Refresh) */}
      <div className="p-3.5 sm:p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121215]">
        {/* Sisi Kiri: Search Input & Filter Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIM, atau berkas pendaftar..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus kata kunci pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Hasil OPREC */}
          <div className="relative sm:w-48 shrink-0">
            <Filter className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter hasil OPREC peserta"
              className="w-full pl-8 pr-8 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors cursor-pointer appearance-none"
            >
              <option value="all">Semua Hasil OPREC</option>
              <option value="accepted">Diterima (Hijau)</option>
              <option value="pending">Dipertimbangkan (Abu-abu)</option>
              <option value="incomplete">Belum Lengkap (Oranye)</option>
              <option value="rejected">Ditolak (Merah)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Tombol Reset jika filter aktif */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#B22234] dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Sisi Kanan: Total Pendaftar & Tombol Refresh */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Total Peserta:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              {registrations.length}
            </span>
            {hasActiveFilter && (
              <span className="text-[11px] text-zinc-400 ml-1">
                (hasil: {filteredRegistrations.length})
              </span>
            )}
          </div>

          {/* Ekspor PDF dengan filter divisi diterima */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700/70 overflow-hidden">
            <select
              value={exportDivision}
              onChange={(e) => setExportDivision(e.target.value)}
              disabled={isExporting !== null}
              aria-label="Filter divisi untuk ekspor PDF"
              title="Filter berdasarkan divisi diterima"
              className="max-w-[170px] pl-2.5 pr-1 py-1.5 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer border-r border-zinc-200 dark:border-zinc-700/70"
            >
              <option value="all">Semua divisi</option>
              <option value="unplaced">Belum ditempatkan</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleExport("list")}
              disabled={isExporting !== null}
              title="Unduh daftar ringkas calon anggota (PDF)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#B22234] hover:bg-[#8B0000] transition-colors cursor-pointer disabled:opacity-60 border-r border-white/30"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExporting === "list" ? "Menyiapkan..." : "Daftar"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport("interview")}
              disabled={isExporting !== null}
              title="Unduh lembar hasil wawancara: pertanyaan + jawaban, 1 halaman per calon anggota (PDF)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#B22234] hover:bg-[#8B0000] transition-colors cursor-pointer disabled:opacity-60"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isExporting === "interview" ? "Menyiapkan..." : "Lembar Wawancara"}</span>
            </button>
          </div>

          {/* Tombol Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Segarkan data pendaftar"
            aria-label="Segarkan data pendaftar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#B22234] dark:text-rose-400" : ""
                }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Output List Pendaftar (Scrollable dengan Sticky Header) */}
      {filteredRegistrations.length > 0 ? (
        <div className="overflow-x-auto max-h-[64vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800">
              <tr className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <th
                  scope="col"
                  className="py-3 px-3 sm:px-4 text-center w-12 sm:w-14 font-mono select-none"
                >
                  No
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 sm:px-5"
                >
                  Nama
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 sm:px-5 w-32 sm:w-36"
                >
                  NIM
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 sm:px-5 w-44 sm:w-52"
                >
                  Tahap Pendaftaran
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 sm:px-5 w-40 sm:w-48"
                >
                  Hasil OPREC
                </th>
                <th
                  scope="col"
                  aria-label="Aksi"
                  className="py-3 pr-4 sm:pr-5 w-10 text-right"
                >
                  <span className="sr-only">Rincian</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/60 text-xs sm:text-sm">
              {filteredRegistrations.map((item, index) => {
                const stepInfo = getParticipantStep(item);
                const hasilMeta = getHasilOprec(item);

                return (
                  <tr
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/dashboard/pendaftar/${item.id}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/dashboard/pendaftar/${item.id}`);
                      }
                    }}
                    title={`Klik untuk melihat rincian ${item.full_name || item.nim}`}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-800/70 transition-colors cursor-pointer group focus-visible:outline-hidden focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-800"
                  >
                    {/* 1. Nomor Urut */}
                    <td className="py-3.5 px-3 sm:px-4 text-center font-mono text-xs text-zinc-400 dark:text-zinc-500 font-medium select-none tabular-nums">
                      {index + 1}
                    </td>

                    {/* 2. Nama */}
                    <td className="py-3.5 px-4 sm:px-5 font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-[#B22234] dark:group-hover:text-rose-400 transition-colors">
                      {item.full_name || "Nama tidak dicantumkan"}
                    </td>

                    {/* 3. NIM */}
                    <td className="py-3.5 px-4 sm:px-5 font-mono text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm tabular-nums">
                      {item.nim || "-"}
                    </td>

                    {/* 4. Tahap Pendaftaran */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className={`font-medium ${
                            stepInfo.isComplete
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {stepInfo.isComplete ? "Lengkap" : "Belum Lengkap"}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                          ({stepInfo.step}/6)
                        </span>
                      </div>
                    </td>

                    {/* 5. Hasil OPREC */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${hasilMeta.bgColor} border ${hasilMeta.borderColor} shadow-2xs`}
                        />
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          {hasilMeta.label}
                        </span>
                      </div>
                    </td>

                    {/* 6. Action Icon > (Indikator Klik) */}
                    <td className="py-3.5 pr-4 sm:pr-5 text-right w-10">
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#B22234] dark:group-hover:text-rose-400 group-hover:translate-x-1 transition-all inline-block" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="py-12 px-4 text-center space-y-2">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {hasActiveFilter
              ? "Tidak ada pendaftar yang cocok"
              : "Belum ada pendaftar"}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            {hasActiveFilter
              ? "Coba ubah kata kunci pencarian atau ganti filter hasil OPREC."
              : "Data pendaftar baru yang mengirimkan formulir akan otomatis muncul di sini."}
          </p>
          {hasActiveFilter && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B22234] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
