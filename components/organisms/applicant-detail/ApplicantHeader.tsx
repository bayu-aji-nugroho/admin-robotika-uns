"use client";

import React from "react";
import { Pencil } from "lucide-react";
import { StarToggle } from "@/components/atoms/StarToggle";
import { ApplicantDetailData } from "./types";
import { HasilOprecMeta } from "../ApplicantList";

interface ApplicantHeaderProps {
  applicant: ApplicantDetailData;
  isComplete: boolean;
  step: number;
  currentStatusMeta: HasilOprecMeta;
  orderNum: number;
  totalNum: number;
  /** Ada = tampilkan tombol Edit Data (superadmin) */
  onEdit?: () => void;
  /** Boleh memberi/mencabut bintang */
  canStar?: boolean;
}

export function ApplicantHeader({
  applicant,
  isComplete,
  step,
  currentStatusMeta,
  orderNum,
  totalNum,
  onEdit,
  canStar = false,
}: ApplicantHeaderProps) {
  const [star, setStar] = React.useState({
    starred: Boolean(applicant.starred),
    by: applicant.starred_by_name ?? null,
  });
  const getStatusSolidClasses = (statusMeta: HasilOprecMeta) => {
    if (statusMeta.isAutoRejected) {
      return "bg-amber-600 text-white border-amber-600";
    }
    switch (statusMeta.type) {
      case "accepted":
        return "bg-emerald-600 text-white border-emerald-600";
      case "rejected":
        return "bg-[#B22234] text-white border-[#B22234]";
      case "pending":
      default:
        return "bg-zinc-600 dark:bg-zinc-700 text-white border-zinc-600 dark:border-zinc-700";
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#18181b] dark:text-zinc-100">
            {applicant.full_name || "Nama Tidak Dicantumkan"}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
              NIM: {applicant.nim || "-"}
            </span>
            {applicant.registration_code && (
              <>
                <span>•</span>
                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                  ID: {applicant.registration_code}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Label Step, Status & Urutan Pendaftar */}
        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          {/* Step Pendaftaran */}
          <div
            title={`Tahap: ${isComplete ? "Lengkap (6/6)" : `Belum Lengkap (${step}/6)`}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none border shadow-2xs ${
              isComplete
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-amber-600 text-white border-amber-600"
            }`}
          >
            <span>{isComplete ? "Lengkap (6/6)" : `Belum Lengkap (${step}/6)`}</span>
          </div>

          {/* Status Hasil OPREC */}
          <div
            title={`Hasil OPREC: ${currentStatusMeta.label}`}
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-2xs select-none ${getStatusSolidClasses(
              currentStatusMeta
            )}`}
          >
            <span>{currentStatusMeta.label}</span>
          </div>

          {/* Label Urutan Pendaftar n/x */}
          <div
            title={`Pendaftar urutan ke-${orderNum} dari total ${totalNum} pendaftar`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#B22234] text-white border border-[#B22234] shadow-2xs select-none"
          >
            <span className="text-[11px] font-sans font-medium text-white/90">
              Pendaftar
            </span>
            <span className="font-bold text-white">
              {orderNum}/{totalNum}
            </span>
          </div>

          <StarToggle
            variant="button"
            applicantId={applicant.id}
            applicantName={applicant.full_name}
            starred={star.starred}
            starredByName={star.by}
            canToggle={canStar}
            onChange={(starred, by) => setStar({ starred, by })}
          />

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
