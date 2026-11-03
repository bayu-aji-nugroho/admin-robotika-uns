"use client";

import React from "react";
import { Hash } from "lucide-react";
import { ApplicantDetailData } from "./types";

interface ApplicantDivisionPreferencesProps {
  applicant: ApplicantDetailData;
}

export function ApplicantDivisionPreferences({
  applicant,
}: ApplicantDivisionPreferencesProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[#E4E4E7] dark:border-zinc-800">
        <Hash className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
        <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
          Pilihan Divisi & Alasan
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pilihan 1 (Utama) */}
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#B22234] dark:text-rose-400 uppercase tracking-wider">
              Pilihan 1 (Utama)
            </span>
            {applicant.primary_division_category && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 capitalize">
                Divisi {applicant.primary_division_category}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
            {applicant.primary_division_name || "-"}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {applicant.primary_reason || "Tidak ada alasan yang dicantumkan."}
          </p>
        </div>

        {/* Pilihan 2 */}
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Pilihan 2
            </span>
            {applicant.secondary_division_category && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 capitalize">
                Divisi {applicant.secondary_division_category}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
            {applicant.secondary_division_name || "-"}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {applicant.secondary_reason || "Tidak ada alasan yang dicantumkan."}
          </p>
        </div>
      </div>
    </div>
  );
}

