"use client";

import React from "react";
import { CalendarClock, CheckCircle2, ClipboardList, ExternalLink, Lock, MapPin, Users } from "lucide-react";
import { formatJakartaDate, formatJakartaDateTime, formatJakartaHourRange } from "@/utils/jakartaTime";

export interface ApplicantInterviewInfo {
  id: string;
  startAt: string;
  status: "pending" | "accepted";
  location: string | null;
  completedAt: string | null;
  completedByName: string | null;
  interviewers: { name: string; whatsapp: string | null }[];
}

interface ApplicantInterviewScheduleProps {
  interview: ApplicantInterviewInfo | null;
  /** Calon anggota sudah mengirim formulir (baru bisa memilih jadwal) */
  isSubmitted: boolean;
}

const isLink = (value: string) => /^https?:\/\//i.test(value.trim());

function StatusBadge({ interview }: { interview: ApplicantInterviewInfo }) {
  if (interview.completedAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-600 text-white">
        <CheckCircle2 className="w-3 h-3" /> Selesai
      </span>
    );
  }
  return interview.status === "accepted" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
      <Lock className="w-3 h-3" /> Dikonfirmasi · belum selesai
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
      Menunggu konfirmasi calon
    </span>
  );
}

/** Jadwal wawancara calon anggota: pewawancara, jam, lokasi, dan status selesai */
export function ApplicantInterviewSchedule({ interview, isSubmitted }: ApplicantInterviewScheduleProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E4E4E7] dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
          <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">Jadwal Wawancara</h2>
        </div>
        {interview && <StatusBadge interview={interview} />}
      </div>

      {!interview ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {isSubmitted
            ? "Calon anggota belum memilih jadwal wawancara."
            : "Calon anggota belum mengirim formulir, jadi belum bisa memilih jadwal wawancara."}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Waktu</p>
              <p className="text-sm font-semibold text-[#18181b] dark:text-zinc-100">
                {formatJakartaDate(interview.startAt)}
              </p>
              <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                {formatJakartaHourRange(interview.startAt)} WIB
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <MapPin className="w-3 h-3" /> Lokasi
              </p>
              {interview.location ? (
                isLink(interview.location) ? (
                  <a
                    href={interview.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#B22234] dark:text-rose-400 hover:underline break-all"
                  >
                    {interview.location}
                  </a>
                ) : (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">{interview.location}</p>
                )
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400">Belum diisi pewawancara</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              <Users className="w-3 h-3" /> Pewawancara
            </p>
            {interview.interviewers.length === 0 ? (
              <p className="text-xs text-zinc-500">-</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {interview.interviewers.map((iv) => (
                  <li
                    key={iv.name}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950"
                  >
                    <span className="text-xs font-semibold text-[#18181b] dark:text-zinc-100">{iv.name}</span>
                    {iv.whatsapp && (
                      <a
                        href={`https://wa.me/${iv.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        +{iv.whatsapp}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {interview.completedAt ? (
                <>
                  Selesai {formatJakartaDateTime(interview.completedAt)}
                  {interview.completedByName ? ` · ditandai oleh ${interview.completedByName}` : ""}
                </>
              ) : (
                "Wawancara belum ditandai selesai."
              )}
            </p>
            <a
              href={`/dashboard/jadwal/sesi/${interview.id}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg border border-[#B22234]/30 dark:border-rose-400/30 bg-[#FCF2F3] dark:bg-rose-950/20 text-xs font-semibold text-[#B22234] dark:text-rose-400 hover:bg-[#B22234] hover:text-white dark:hover:bg-rose-500 dark:hover:text-white transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Buka Sesi
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
