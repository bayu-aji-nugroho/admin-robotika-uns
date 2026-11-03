"use client";

import React from "react";
import {
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import { ApplicantDetailData } from "./types";

interface ApplicantDocumentsProps {
  applicant: ApplicantDetailData;
}

export function ApplicantDocuments({ applicant }: ApplicantDocumentsProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[#E4E4E7] dark:border-zinc-800">
        <FileText className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
        <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
          Berkas Pendaftaran & Dokumen Pendukung
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {/* A. Berkas Curriculum Vitae (CV) */}
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100 truncate">
              {applicant.cv_file_name || "Curriculum Vitae (CV)"}
            </p>
          </div>

          {applicant.cv_file_url ? (
            <a
              href={applicant.cv_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#B22234] hover:bg-[#8B0000] rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Lihat / Unduh CV (PDF)</span>
            </a>
          ) : (
            <span className="text-xs text-zinc-400 italic">
              {applicant.cv_file_name ? "URL berkas sedang diproses" : "Belum mengunggah CV"}
            </span>
          )}
        </div>

        {/* B. Tautan Postingan Twibbon */}
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100">
              Tautan Postingan Twibbon
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-md">
              {applicant.twibbon_url ? applicant.twibbon_url : "Peserta belum mencantumkan tautan Twibbon."}
            </p>
          </div>

          {applicant.twibbon_url ? (
            <a
              href={applicant.twibbon_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Link Twibbon</span>
            </a>
          ) : (
            <span className="text-xs text-zinc-400 italic">Tidak tersedia</span>
          )}
        </div>

        {/* C. Tautan Portofolio / Berkas Tambahan */}
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100">
              Tautan Portofolio / Proyek Tambahan
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-md">
              {applicant.portfolio_url ? applicant.portfolio_url : "Peserta tidak menyertakan portofolio tambahan."}
            </p>
          </div>

          {applicant.portfolio_url ? (
            <a
              href={applicant.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Portofolio</span>
            </a>
          ) : (
            <span className="text-xs text-zinc-400 italic">Tidak tersedia</span>
          )}
        </div>
      </div>
    </div>
  );
}

