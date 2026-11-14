"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getHasilOprec } from "./ApplicantList";
import {
  ApplicantDetailData,
  DivisionItem,
  ApplicantDetailCardProps,
  DecisionStatus,
} from "./applicant-detail/types";
import {
  ApplicantHeader,
  ApplicantAcademicAndContact,
  ApplicantDivisionPreferences,
  ApplicantDocuments,
  ApplicantInterviewQuestions,
  ApplicantInterviewSchedule,
  ApplicantAssessmentAndDangerZone,
  ApplicantDeleteModal,
} from "./applicant-detail";

// Re-export types untuk backward-compatibility dengan consumer lain
export type { ApplicantDetailData, DivisionItem, ApplicantDetailCardProps };

export function ApplicantDetailCard({
  applicant,
  interview = null,
  divisions = [],
  interviewQuestions = [],
  canAssess = true,
  canDelete = true,
}: ApplicantDetailCardProps) {
  const router = useRouter();

  // 2. State dialog konfirmasi hapus peserta permanen
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // 3. State keputusan penerimaan terhubung dengan tabel assessments
  const getInitialDecision = (raw?: string | null): DecisionStatus => {
    const s = (raw || "").toLowerCase().trim();
    if (s === "accepted" || s === "diterima" || s === "lolos" || s === "acc") return "accepted";
    if (s === "rejected" || s === "ditolak" || s === "tolak") return "rejected";
    return "pending";
  };

  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>(() =>
    getInitialDecision(applicant.assessment_status || applicant.status)
  );
  const [acceptedDivisionId, setAcceptedDivisionId] = useState<string>(
    applicant.accepted_division_id || applicant.primary_division_id || ""
  );
  const [notes, setNotes] = useState<string>(applicant.assessment_notes || "");
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 4. State jawaban/catatan per pertanyaan wawancara
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>(
    () => (applicant.interview_answers as Record<string, string>) || {}
  );
  const [isSavingAnswers, setIsSavingAnswers] = useState(false);
  const [answersSaveSuccess, setAnswersSaveSuccess] = useState(false);

  // Handler: Hapus peserta permanen dari server
  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);

      const res = await fetch(`/api/applicants/${encodeURIComponent(applicant.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus data peserta dari server.");
      }

      setDeleteSuccess(true);
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 1400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus peserta.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler: Simpan catatan jawaban interview
  const handleSaveInterviewAnswers = async (updatedAnswers?: Record<string, string>) => {
    setIsSavingAnswers(true);
    setAnswersSaveSuccess(false);
    try {
      const supabase = createClient();
      const currentAnswers = updatedAnswers || interviewAnswers;

      const dbStatus =
        decisionStatus === "accepted"
          ? "diterima"
          : decisionStatus === "rejected"
          ? "ditolak"
          : "pertimbangan";

      const targetDivId = decisionStatus === "accepted" ? acceptedDivisionId || null : null;

      const { error } = await supabase.from("assessments").upsert(
        {
          applicant_id: applicant.id,
          status: dbStatus,
          notes: notes || null,
          accepted_division_id: targetDivId,
          interview_answers: currentAnswers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "applicant_id" }
      );

      if (error) {
        console.error("Gagal menyimpan catatan wawancara:", error.message);
      } else {
        setAnswersSaveSuccess(true);
        setTimeout(() => setAnswersSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Gagal menyimpan catatan wawancara:", err);
    } finally {
      setIsSavingAnswers(false);
    }
  };

  // Handler: Simpan penilaian utama (ACC / Tolak / Pertimbangan)
  const handleSaveAssessment = async (
    newStatus: DecisionStatus,
    newDivisionId?: string,
    newNotes?: string
  ) => {
    setIsSavingDecision(true);
    setSaveSuccess(false);
    try {
      const supabase = createClient();
      const targetStatus = newStatus ?? decisionStatus;
      const dbStatus =
        targetStatus === "accepted"
          ? "diterima"
          : targetStatus === "rejected"
          ? "ditolak"
          : "pertimbangan";

      const targetDivId =
        targetStatus === "accepted"
          ? (newDivisionId !== undefined ? newDivisionId : acceptedDivisionId) || null
          : null;

      const targetNotes = (newNotes !== undefined ? newNotes : notes) || null;

      const { error } = await supabase.from("assessments").upsert(
        {
          applicant_id: applicant.id,
          status: dbStatus,
          notes: targetNotes,
          accepted_division_id: targetDivId,
          interview_answers: interviewAnswers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "applicant_id" }
      );

      if (error) {
        console.error("Gagal menyimpan penilaian:", error.message);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        router.refresh();
      }
    } catch (err) {
      console.error("Gagal update penilaian:", err);
    } finally {
      setIsSavingDecision(false);
    }
  };

  const handleUpdateDecision = async (newStatus: DecisionStatus) => {
    if (newStatus === decisionStatus && !isSavingDecision) return;
    setDecisionStatus(newStatus);
    await handleSaveAssessment(newStatus, acceptedDivisionId, notes);
  };

  // Kalkulasi data pembantu
  const step =
    typeof applicant.current_step === "number"
      ? applicant.current_step
      : Number(applicant.current_step) || 0;
  const hasRegCode = Boolean(
    applicant.registration_code && applicant.registration_code.trim().length > 0
  );
  const isComplete = step >= 6 && hasRegCode;

  const currentStatusMeta = getHasilOprec({
    id: applicant.id,
    full_name: applicant.full_name,
    nim: applicant.nim,
    status: decisionStatus,
    assessment_status:
      decisionStatus === "accepted"
        ? "diterima"
        : decisionStatus === "rejected"
        ? "ditolak"
        : "pertimbangan",
    current_step: applicant.current_step,
    registration_code: applicant.registration_code,
  });

  const formattedWhatsapp = applicant.whatsapp
    ? applicant.whatsapp.startsWith("0")
      ? `62${applicant.whatsapp.slice(1)}`
      : applicant.whatsapp
    : null;

  const orderNum = applicant.orderNumber ?? 1;
  const totalNum = applicant.totalApplicants ?? 1;

  return (
    <div className="space-y-5">
      {/* 1. Header Identitas Utama */}
      <ApplicantHeader
        applicant={applicant}
        isComplete={isComplete}
        step={step}
        currentStatusMeta={currentStatusMeta}
        orderNum={orderNum}
        totalNum={totalNum}
      />

      {/* 2. Grid Data Akademik & Kontak */}
      <ApplicantAcademicAndContact
        applicant={applicant}
        formattedWhatsapp={formattedWhatsapp}
      />

      {/* 3. Pilihan Divisi & Motivasi */}
      <ApplicantDivisionPreferences applicant={applicant} />

      {/* 4. Berkas Pendaftaran & Dokumen Pendukung */}
      <ApplicantDocuments applicant={applicant} />

      {/* 5. Jadwal Wawancara: pewawancara, jam, lokasi, status selesai */}
      <ApplicantInterviewSchedule
        interview={interview}
        isSubmitted={Boolean(applicant.submitted_at) || applicant.status === "submitted"}
      />

      {/* 6. List Pertanyaan Interview (Bank Pertanyaan) */}
      <ApplicantInterviewQuestions
        applicant={applicant}
        interviewQuestions={interviewQuestions}
        interviewAnswers={interviewAnswers}
        setInterviewAnswers={setInterviewAnswers}
        onSaveInterviewAnswers={() => handleSaveInterviewAnswers()}
        isSavingAnswers={isSavingAnswers}
        answersSaveSuccess={answersSaveSuccess}
        readOnly={!canAssess}
      />

      {/* 7. Keputusan Penerimaan (ACC / Tolak) & Danger Zone */}
      <ApplicantAssessmentAndDangerZone
        applicant={applicant}
        divisions={divisions}
        decisionStatus={decisionStatus}
        onUpdateDecision={handleUpdateDecision}
        acceptedDivisionId={acceptedDivisionId}
        onAcceptedDivisionChange={(newDivId) => {
          setAcceptedDivisionId(newDivId);
          handleSaveAssessment("accepted", newDivId, notes);
        }}
        notes={notes}
        onNotesChange={setNotes}
        onSaveAssessment={() => handleSaveAssessment(decisionStatus, acceptedDivisionId, notes)}
        isSavingDecision={isSavingDecision}
        saveSuccess={saveSuccess}
        onOpenDeleteModal={() => {
          setDeleteError(null);
          setDeleteSuccess(false);
          setIsDeleteDialogOpen(true);
        }}
        isDeleting={isDeleting}
        canAssess={canAssess}
        canDelete={canDelete}
      />

      {/* Modal Konfirmasi Hapus Peserta Permanen */}
      <ApplicantDeleteModal
        isOpen={isDeleteDialogOpen}
        applicantName={applicant.full_name}
        applicantEmail={applicant.user_email}
        isDeleting={isDeleting}
        deleteError={deleteError}
        deleteSuccess={deleteSuccess}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
