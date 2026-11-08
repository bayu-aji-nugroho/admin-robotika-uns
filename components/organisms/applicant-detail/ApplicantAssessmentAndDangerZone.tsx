"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Trash2,
} from "lucide-react";
import { ApplicantDetailData, DivisionItem, DecisionStatus } from "./types";

interface ApplicantAssessmentAndDangerZoneProps {
  applicant: ApplicantDetailData;
  divisions: DivisionItem[];
  decisionStatus: DecisionStatus;
  onUpdateDecision: (status: DecisionStatus) => void;
  acceptedDivisionId: string;
  onAcceptedDivisionChange: (divisionId: string) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  onSaveAssessment?: () => void;
  isSavingDecision: boolean;
  saveSuccess?: boolean;
  onOpenDeleteModal: () => void;
  isDeleting: boolean;
  canAssess?: boolean;
  canDelete?: boolean;
}

export function ApplicantAssessmentAndDangerZone({
  divisions,
  decisionStatus,
  onUpdateDecision,
  acceptedDivisionId,
  onAcceptedDivisionChange,
  isSavingDecision,
  onOpenDeleteModal,
  isDeleting,
  canAssess = true,
  canDelete = true,
}: ApplicantAssessmentAndDangerZoneProps) {
  const decisionLocked = isSavingDecision || !canAssess;
  const technicalDivisions = divisions.filter((d) => d.category === "teknis");
  const nonTechnicalDivisions = divisions.filter((d) => d.category !== "teknis");

  return (
    <div className="border border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-rose-200 dark:border-rose-900/40">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
            [Danger Zone] Keputusan Penerimaan & Manajemen Data
          </h2>
        </div>
      </div>

      <div className="space-y-4">
        {!canAssess && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Mode lihat: role Anda tidak memiliki akses menilai pendaftar.
          </p>
        )}

        {/* Opsi Kartu Keputusan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Opsi 1: ACC / Terima */}
          <button
            type="button"
            disabled={decisionLocked}
            onClick={() => onUpdateDecision("accepted")}
            className={`px-4 py-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between disabled:opacity-60 ${
              decisionStatus === "accepted"
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wide">
              Terima (ACC)
            </span>
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                decisionStatus === "accepted"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400"
              }`}
            />
          </button>

          {/* Opsi 2: Tolak */}
          <button
            type="button"
            disabled={decisionLocked}
            onClick={() => onUpdateDecision("rejected")}
            className={`px-4 py-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between disabled:opacity-60 ${
              decisionStatus === "rejected"
                ? "bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-700 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wide">
              Tolak
            </span>
            <XCircle
              className={`w-4 h-4 shrink-0 ${
                decisionStatus === "rejected"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-zinc-400"
              }`}
            />
          </button>

          {/* Opsi 3: Pertimbangan (Pending) */}
          <button
            type="button"
            disabled={decisionLocked}
            onClick={() => onUpdateDecision("pending")}
            className={`px-4 py-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between disabled:opacity-60 ${
              decisionStatus === "pending"
                ? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-700 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wide">
              Pertimbangan
            </span>
            <Clock
              className={`w-4 h-4 shrink-0 ${
                decisionStatus === "pending"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-400"
              }`}
            />
          </button>
        </div>

        {/* Jika Status ACC: Pilihan Divisi Penempatan */}
        {decisionStatus === "accepted" && (
          <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Divisi Penempatan Calon Anggota (Lolos Seleksi)</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={acceptedDivisionId}
                onChange={(e) => onAcceptedDivisionChange(e.target.value)}
                disabled={decisionLocked}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 cursor-pointer"
              >
                <option value="">-- Tetapkan Divisi Penerimaan --</option>
                {technicalDivisions.length > 0 && (
                  <optgroup label="Divisi Teknis">
                    {technicalDivisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {nonTechnicalDivisions.length > 0 && (
                  <optgroup label="Divisi Non-Teknis">
                    {nonTechnicalDivisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        )}

        {/* Tindakan Berisiko Tinggi: Hapus Peserta Permanen */}
        <div className="pt-4 border-t border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 dark:text-rose-200">
            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Hapus Seluruh Data Peserta</span>
          </div>
          <button
            type="button"
            disabled={isDeleting || !canDelete}
            title={canDelete ? undefined : "Role Anda tidak memiliki akses hapus pendaftar"}
            onClick={onOpenDeleteModal}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-60 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Peserta</span>
          </button>
        </div>
      </div>
    </div>
  );
}

