"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2, Save } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { getInterviewSheetAction, saveInterviewAnswersAction } from "@/app/actions/interviewSchedule";
import { INTERVIEW_NOTES_KEY, groupInterviewQuestions } from "@/utils/interviewQuestionGroups";
import type { InterviewSheetData, SheetQuestion } from "@/utils/interviewSchedule.types";

interface InterviewSheetPanelProps {
  applicantId: string;
  questions: SheetQuestion[];
  /** Sesi belum ditandai selesai: tampilkan tombol "Simpan & Tandai Selesai" */
  canComplete: boolean;
  onComplete: () => Promise<boolean>;
  onResult: (type: "success" | "error", message: string) => void;
  /** "page" = halaman penuh (judul nama calon anggota + tombol simpan menempel di bawah layar) */
  variant?: "inline" | "page";
}

const textareaClass =
  "w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-hidden focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] transition-colors resize-y disabled:opacity-70";

/**
 * Lembar wawancara di halaman Jadwal: pertanyaan otomatis menyesuaikan divisi pilihan
 * calon anggota (General, Pilihan 1, Pilihan 2 — sama dengan detail pendaftar & PDF).
 */
export function InterviewSheetPanel({
  applicantId,
  questions,
  canComplete,
  onComplete,
  onResult,
  variant = "inline",
}: InterviewSheetPanelProps) {
  const isPage = variant === "page";
  const [sheet, setSheet] = useState<InterviewSheetData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<string>("{}");

  useEffect(() => {
    let active = true;
    getInterviewSheetAction(applicantId).then((res) => {
      if (!active) return;
      if (!res.success || !res.data) {
        setLoadError(res.error || "Gagal memuat lembar wawancara.");
        return;
      }
      const loaded = res.data.answers || {};
      setSheet(res.data);
      setAnswers(loaded);
      setSavedAnswers(JSON.stringify(loaded));
    });
    return () => {
      active = false;
    };
  }, [applicantId]);

  if (loadError) {
    return <p className="text-xs text-rose-600 dark:text-rose-400">{loadError}</p>;
  }
  if (!sheet) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat lembar wawancara...
      </p>
    );
  }

  const { applicant, can_edit: canEdit } = sheet;
  const groups = groupInterviewQuestions(questions, applicant);
  const sections = [
    { title: "Pertanyaan Umum (General)", items: groups.general },
    { title: `Divisi Pilihan 1: ${applicant.primary_division_name || "-"}`, items: groups.primary },
    { title: `Divisi Pilihan 2: ${applicant.secondary_division_name || "-"}`, items: groups.secondary },
  ].filter((s) => s.items.length > 0);
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const answered = sections.reduce((n, s) => n + s.items.filter((q) => (answers[q.id] || "").trim()).length, 0);
  const isDirty = JSON.stringify(answers) !== savedAnswers;

  const setAnswer = (key: string, value: string) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    const res = await saveInterviewAnswersAction(applicantId, answers);
    if (!res.success) {
      onResult("error", res.error || "Gagal menyimpan catatan wawancara.");
      return false;
    }
    setSavedAnswers(JSON.stringify(answers));
    return true;
  };

  const handleSave = async () => {
    setBusy(true);
    const ok = await save();
    setBusy(false);
    if (ok) onResult("success", "Catatan wawancara tersimpan.");
  };

  const handleSaveAndComplete = async () => {
    setBusy(true);
    const ok = (isDirty ? await save() : true) && (await onComplete());
    setBusy(false);
    if (ok) onResult("success", "Catatan tersimpan dan sesi ditandai selesai.");
  };

  return (
    <div
      className={
        isPage
          ? "space-y-4"
          : "space-y-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40"
      }
    >
      {isPage && (
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#18181b] dark:text-zinc-100">
            {applicant.full_name || "Calon anggota"}
          </h1>
          {applicant.nim && <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{applicant.nim}</p>}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {[applicant.prodi, applicant.angkatan ? `Angkatan ${applicant.angkatan}` : null].filter(Boolean).join(" · ")}
          {total > 0 && <span className="ml-2 font-mono">{answered}/{total} terjawab</span>}
        </div>
        <Link
          href={`/dashboard/pendaftar/${applicant.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B22234] dark:text-rose-400 hover:underline self-start"
        >
          Detail pendaftar <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {total === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Belum ada pertanyaan di Bank Pertanyaan untuk divisi pilihan calon anggota ini.
        </p>
      ) : (
        sections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {section.title}
            </p>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
              {section.items.map((q, i) => (
                <div key={q.id} className="p-2.5 space-y-1.5">
                  <p className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-100 font-medium">
                    <span className="font-mono text-zinc-400 mr-1.5">{i + 1}.</span>
                    {q.question}
                  </p>
                  <textarea
                    rows={isPage ? 2 : 1}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    disabled={!canEdit || busy}
                    placeholder="Catatan jawaban..."
                    className={`${textareaClass} min-h-[34px]`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Catatan Khusus</span>
        <textarea
          rows={2}
          value={answers[INTERVIEW_NOTES_KEY] || ""}
          onChange={(e) => setAnswer(INTERVIEW_NOTES_KEY, e.target.value)}
          disabled={!canEdit || busy}
          placeholder="Kesan umum, hal yang perlu ditindaklanjuti..."
          className={`${textareaClass} min-h-[52px]`}
        />
      </label>

      {canEdit ? (
        <div
          className={`flex flex-wrap justify-end gap-2 ${
            isPage
              ? "sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-[#F9F9F8]/95 dark:bg-[#09090b]/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800 sm:border-0 sm:bg-transparent sm:dark:bg-transparent sm:backdrop-blur-none"
              : ""
          }`}
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSave}
            isLoading={busy}
            disabled={busy || !isDirty}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            Simpan Catatan
          </Button>
          {canComplete && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveAndComplete}
              isLoading={busy}
              disabled={busy}
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Simpan &amp; Tandai Selesai
            </Button>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-zinc-400">Hanya pewawancara sesi ini yang dapat mengubah catatan.</p>
      )}
    </div>
  );
}
