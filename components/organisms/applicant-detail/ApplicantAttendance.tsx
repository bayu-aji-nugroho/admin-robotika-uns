"use client";

import React from "react";
import { UserCheck } from "lucide-react";
import { AttendanceStatus } from "./types";

interface ApplicantAttendanceProps {
  attendanceStatus: AttendanceStatus;
  setAttendanceStatus: (status: AttendanceStatus) => void;
}

export function ApplicantAttendance({
  attendanceStatus,
  setAttendanceStatus,
}: ApplicantAttendanceProps) {
  const options: { key: AttendanceStatus; label: string }[] = [
    { key: "belum", label: "Belum Terjadwal" },
    { key: "hadir", label: "Hadir" },
    { key: "tidak_hadir", label: "Tidak Hadir" },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7] dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
          <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
            Presensi / Absensi
          </h2>
        </div>
        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
          [UI Saja]
        </span>
      </div>

      {/* Kontrol Absensi Interaktif (Mockup) */}
      <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Status Kehadiran Interview
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Catatan verifikasi kehadiran calon anggota pada sesi wawancara.
          </p>
        </div>

        {/* Tombol Pilihan Presensi */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          {options.map((opt) => {
            const isSelected = attendanceStatus === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setAttendanceStatus(opt.key)}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? opt.key === "hadir"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                      : opt.key === "tidak_hadir"
                      ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                      : "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 border-zinc-800 dark:border-zinc-200 shadow-2xs"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

