"use client";

import React from "react";
import { GraduationCap, Mail, Phone, ExternalLink } from "lucide-react";
import { ApplicantDetailData } from "./types";

interface ApplicantAcademicAndContactProps {
  applicant: ApplicantDetailData;
  formattedWhatsapp: string | null;
}

export function ApplicantAcademicAndContact({
  applicant,
  formattedWhatsapp,
}: ApplicantAcademicAndContactProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Kolom Kiri: Data Akademik */}
      <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E4E4E7] dark:border-zinc-800">
          <GraduationCap className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
          <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
            Data Akademik
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-zinc-400 dark:text-zinc-500 block">Fakultas</span>
            <span className="text-[#18181b] dark:text-zinc-100 font-medium text-sm">
              {applicant.fakultas || "-"}
            </span>
          </div>

          <div>
            <span className="text-zinc-400 dark:text-zinc-500 block">Program Studi</span>
            <span className="text-[#18181b] dark:text-zinc-100 font-medium text-sm">
              {applicant.prodi || "-"}
            </span>
          </div>

          <div>
            <span className="text-zinc-400 dark:text-zinc-500 block">Angkatan</span>
            <span className="text-[#18181b] dark:text-zinc-100 font-medium text-sm">
              {applicant.angkatan || "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Kontak & Waktu Pendaftaran */}
      <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E4E4E7] dark:border-zinc-800">
          <Mail className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
          <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
            Kontak & Pengiriman
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-zinc-400 dark:text-zinc-500 block">Email Akun</span>
            <a
              href={`mailto:${applicant.user_email}`}
              className="text-zinc-900 dark:text-zinc-100 font-medium hover:text-[#B22234] dark:hover:text-rose-400 transition-colors"
            >
              {applicant.user_email || "-"}
            </a>
          </div>

          <div>
            <span className="text-zinc-400 dark:text-zinc-500 block">WhatsApp</span>
            {formattedWhatsapp ? (
              <a
                href={`https://wa.me/${formattedWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mt-0.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{applicant.whatsapp}</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            ) : (
              <span className="text-zinc-600 dark:text-zinc-400">-</span>
            )}
          </div>

          <div>
            <span className="text-zinc-400 dark:text-zinc-500 block">Waktu Submit</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-mono">
              {applicant.submitted_at
                ? new Date(applicant.submitted_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

