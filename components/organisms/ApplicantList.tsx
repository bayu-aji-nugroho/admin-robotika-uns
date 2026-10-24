"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, X, RotateCcw, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export interface RegistrationItem {
  id: string;
  full_name: string | null;
  nim: string | null;
  primary_division_name: string | null;
  status?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
}

interface ApplicantListProps {
  initialRegistrations: RegistrationItem[];
}

export function ApplicantList({ initialRegistrations }: ApplicantListProps) {
  const router = useRouter();
  const [registrations, setRegistrations] =
    useState<RegistrationItem[]>(initialRegistrations);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ekstrak daftar divisi unik secara dinamis dari data pendaftar
  const availableDivisions = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((item) => {
      if (item.primary_division_name) {
        set.add(item.primary_division_name);
      }
    });
    return Array.from(set).sort();
  }, [registrations]);

  // Filter data berdasarkan query pencarian dan divisi terpilih
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((item) => {
      const name = item.full_name?.toLowerCase() || "";
      const nim = item.nim?.toLowerCase() || "";
      const division = item.primary_division_name?.toLowerCase() || "";
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        nim.includes(query) ||
        division.includes(query);

      const matchesDivision =
        selectedDivision === "all" ||
        item.primary_division_name === selectedDivision;

      return matchesSearch && matchesDivision;
    });
  }, [registrations, searchQuery, selectedDivision]);

  const hasActiveFilter = searchQuery.trim() !== "" || selectedDivision !== "all";

  const handleResetFilter = () => {
    setSearchQuery("");
    setSelectedDivision("all");
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("registrations")
        .select(
          "id, full_name, nim, primary_division_name, status, created_at, submitted_at"
        )
        .order("created_at", { ascending: false });

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
    <div className="space-y-4">
      {/* 1. Toolbar (Search, Filter, Refresh, dan Total Pendaftar) */}
      <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sisi Kiri: Search Input & Filter Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIM, atau divisi..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors"
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

            {/* Filter Divisi */}
            <div className="relative sm:w-56 shrink-0">
              <Filter className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors cursor-pointer appearance-none"
              >
                <option value="all">Semua Divisi</option>
                {availableDivisions.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
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
            <div className="text-xs text-zinc-600 dark:text-zinc-300">
              Total Pendaftar:{" "}
              <span className="font-bold text-[#18181b] dark:text-zinc-100">
                {registrations.length}
              </span>
              {hasActiveFilter && (
                <span className="text-[11px] text-zinc-400 ml-1">
                  (terfilter: {filteredRegistrations.length})
                </span>
              )}
            </div>

            {/* Tombol Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Segarkan data pendaftar"
              aria-label="Segarkan data pendaftar"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isRefreshing ? "animate-spin text-[#B22234] dark:text-rose-400" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Output List Pendaftar (Scrollable dengan Sticky Header) */}
      <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        {filteredRegistrations.length > 0 ? (
          <div className="overflow-x-auto max-h-[62vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-950 border-b border-[#E4E4E7] dark:border-zinc-800">
                <tr className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th
                    scope="col"
                    className="py-3 px-4 sm:px-6 w-1/3 bg-zinc-50 dark:bg-zinc-950"
                  >
                    Nama
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 sm:px-6 w-1/3 bg-zinc-50 dark:bg-zinc-950"
                  >
                    Divisi
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 sm:px-6 w-1/3 bg-zinc-50 dark:bg-zinc-950"
                  >
                    NIM
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7] dark:divide-zinc-800 text-xs sm:text-sm">
                {filteredRegistrations.map((item) => (
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
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-800/70 transition-colors cursor-pointer group focus-visible:outline-hidden focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-800"
                  >
                    {/* 1. Nama */}
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#18181b] dark:text-zinc-100 group-hover:text-[#B22234] dark:group-hover:text-rose-400 transition-colors">
                      {item.full_name || "Nama tidak dicantumkan"}
                    </td>

                    {/* 2. Divisi */}
                    <td className="py-3.5 px-4 sm:px-6 text-zinc-600 dark:text-zinc-300">
                      {item.primary_division_name || "-"}
                    </td>

                    {/* 3. NIM */}
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-zinc-600 dark:text-zinc-400">
                      {item.nim || "-"}
                    </td>
                  </tr>
                ))}
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
                ? "Coba ubah kata kunci pencarian atau ganti filter divisi."
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
    </div>
  );
}
