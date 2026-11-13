"use client";

import React, { useState } from "react";
import { MessageSquare, Loader2, Check, Save, ChevronDown, ChevronRight, FileDown } from "lucide-react";
import { downloadFromApi } from "@/utils/downloadFile";
import { ApplicantDetailData } from "./types";
import { InterviewQuestionItem } from "@/app/actions/interviewQuestions";
import { groupInterviewQuestions } from "@/utils/interviewQuestionGroups";

interface ApplicantInterviewQuestionsProps {
  applicant: ApplicantDetailData;
  interviewQuestions: InterviewQuestionItem[];
  interviewAnswers: Record<string, string>;
  setInterviewAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveInterviewAnswers: () => void;
  isSavingAnswers: boolean;
  answersSaveSuccess: boolean;
  /** Hanya lihat (mis. role Viewer / tanpa hak Nilai pendaftar) */
  readOnly?: boolean;
}

interface QuestionGroupProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  questions: InterviewQuestionItem[];
  interviewAnswers: Record<string, string>;
  setInterviewAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  readOnly?: boolean;
}

function QuestionGroup({
  title,
  isExpanded,
  onToggle,
  questions,
  interviewAnswers,
  setInterviewAnswers,
  readOnly = false,
}: QuestionGroupProps) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer group select-none"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-transform shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-transform shrink-0" />
          )}
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            {title}
          </h3>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono">
          {questions.length} Soal
        </span>
      </button>

      {isExpanded && (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-3 sm:p-3.5 space-y-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
            >
              <p className="text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-zinc-100 font-medium">
                {q.question}
              </p>

              <div>
                <textarea
                  rows={1}
                  value={interviewAnswers[q.id] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInterviewAnswers((prev) => ({
                      ...prev,
                      [q.id]: val,
                    }));
                  }}
                  placeholder={readOnly ? "Belum ada catatan." : "Catatan jawaban wawancara..."}
                  readOnly={readOnly}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-hidden focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] transition-colors resize-y min-h-[34px]"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApplicantInterviewQuestions({
  applicant,
  interviewQuestions,
  interviewAnswers,
  setInterviewAnswers,
  onSaveInterviewAnswers,
  isSavingAnswers,
  answersSaveSuccess,
  readOnly = false,
}: ApplicantInterviewQuestionsProps) {
  // State toggle accordion per section pertanyaan (Default: tertutup / false)
  const [expandedSections, setExpandedSections] = useState({
    general: false,
    primary: false,
    secondary: false,
  });

  const toggleSection = (section: "general" | "primary" | "secondary") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const [isDownloading, setIsDownloading] = useState(false);

  // PDF dibuat dari data tersimpan, jadi simpan catatan dulu sebelum mengunduh
  const handleDownloadReport = async () => {
    setIsDownloading(true);
    const error = await downloadFromApi(
      `/api/export/interview-report?applicant=${encodeURIComponent(applicant.id)}`,
      "Lembar_Wawancara.pdf"
    );
    setIsDownloading(false);
    if (error) window.alert(error);
  };

  // General, Divisi Pilihan 1, dan Divisi Pilihan 2 (sama dengan isi lembar wawancara PDF)
  const {
    general: generalQuestions,
    primary: primaryDivisionQuestions,
    secondary: secondaryDivisionQuestions,
  } = groupInterviewQuestions(interviewQuestions, applicant);

  const totalQuestionsCount =
    generalQuestions.length +
    primaryDivisionQuestions.length +
    secondaryDivisionQuestions.length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E4E4E7] dark:border-zinc-800 gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
            Daftar Pertanyaan Interview
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-normal">
            {totalQuestionsCount} Pertanyaan
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={isDownloading}
            title="Unduh lembar hasil wawancara (PDF) dari catatan yang sudah tersimpan"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>Unduh PDF</span>
          </button>
          {!readOnly && (
          <button
            type="button"
            onClick={onSaveInterviewAnswers}
            disabled={isSavingAnswers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#B22234] text-white hover:bg-[#8B0000] disabled:opacity-60 transition-colors shadow-xs cursor-pointer"
          >
            {isSavingAnswers ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : answersSaveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{answersSaveSuccess ? "Catatan Tersimpan" : "Simpan Catatan"}</span>
          </button>
          )}
        </div>
      </div>

      {totalQuestionsCount === 0 ? (
        /* Empty State */
        <div className="py-8 px-4 text-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Belum Ada Pertanyaan Terkonfigurasi
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
              Pertanyaan wawancara untuk divisi ini belum ditambahkan pada Bank Pertanyaan.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 1. General Questions */}
          <QuestionGroup
            title="Pertanyaan Umum (General)"
            isExpanded={expandedSections.general}
            onToggle={() => toggleSection("general")}
            questions={generalQuestions}
            interviewAnswers={interviewAnswers}
            setInterviewAnswers={setInterviewAnswers}
            readOnly={readOnly}
          />

          {/* 2. Primary Division Questions */}
          <QuestionGroup
            title={`Pertanyaan Divisi Pilihan 1: ${applicant.primary_division_name || "Divisi Utama"}`}
            isExpanded={expandedSections.primary}
            onToggle={() => toggleSection("primary")}
            questions={primaryDivisionQuestions}
            interviewAnswers={interviewAnswers}
            setInterviewAnswers={setInterviewAnswers}
            readOnly={readOnly}
          />

          {/* 3. Secondary Division Questions */}
          <QuestionGroup
            title={`Pertanyaan Divisi Pilihan 2: ${applicant.secondary_division_name || "Divisi Kedua"}`}
            isExpanded={expandedSections.secondary}
            onToggle={() => toggleSection("secondary")}
            questions={secondaryDivisionQuestions}
            interviewAnswers={interviewAnswers}
            setInterviewAnswers={setInterviewAnswers}
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Input Khusus Catatan di Paling Bawah */}
      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 block">
          Catatan Khusus
        </label>
        <textarea
          rows={3}
          value={interviewAnswers["_notes"] || ""}
          onChange={(e) => {
            const val = e.target.value;
            setInterviewAnswers((prev) => ({
              ...prev,
              _notes: val,
            }));
          }}
          placeholder={readOnly ? "Belum ada catatan khusus." : "Tuliskan catatan khusus hasil wawancara di sini..."}
          readOnly={readOnly}
          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-hidden focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] transition-colors resize-y min-h-[64px]"
        />
      </div>
    </div>
  );
}
