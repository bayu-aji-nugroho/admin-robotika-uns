"use client";

import React, { useState } from "react";
import {
  User,
  GraduationCap,
  Mail,
  Phone,
  FileText,
  Download,
  Hash,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

export interface ApplicantDetailData {
  id: string;
  registration_code: string | null;
  nim: string | null;
  full_name: string | null;
  user_email: string | null;
  status: string | null;
  fakultas: string | null;
  prodi: string | null;
  angkatan: string | null;
  whatsapp: string | null;
  primary_division_name: string | null;
  primary_reason: string | null;
  secondary_division_name: string | null;
  secondary_reason: string | null;
  cv_file_name: string | null;
  cv_file_url: string | null;
  submitted_at: string | null;
  created_at: string | null;
  orderNumber?: number;
  totalApplicants?: number;
}

interface ApplicantDetailCardProps {
  applicant: ApplicantDetailData;
}

export function ApplicantDetailCard({ applicant }: ApplicantDetailCardProps) {
  // State interaktif UI untuk Absensi (UI Mockup)
  const [attendanceStatus, setAttendanceStatus] = useState<
    "belum" | "hadir" | "tidak_hadir"
  >("belum");

  // State interaktif UI untuk Danger Zone Keputusan (Bisa diedit, UI Mockup)
  const [decisionStatus, setDecisionStatus] = useState<
    "pending" | "accepted" | "rejected"
  >("pending");

  // Format nomor WhatsApp untuk tautan langsung
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
      <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FCF2F3] dark:bg-rose-950/40 border border-[#F8D7DA] dark:border-rose-900/50 flex items-center justify-center text-[#B22234] dark:text-rose-400 shrink-0">
              <User className="w-6 h-6" strokeWidth={2} />
            </div>
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
          </div>

          {/* Label Urutan Pendaftar n/x (Menggantikan label Terkirim/Submitted) */}
          <div className="self-start sm:self-center">
            <div
              title={`Pendaftar urutan ke-${orderNum} dari total ${totalNum} pendaftar`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#FCF2F3] dark:bg-rose-950/40 text-[#B22234] dark:text-rose-300 border border-[#F8D7DA] dark:border-rose-900/50 shadow-2xs select-none"
            >
              <span className="text-[11px] font-sans font-medium opacity-80">
                Pendaftar
              </span>
              <span className="font-bold">
                {orderNum}/{totalNum}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grid Informasi: Data Akademik & Kontak */}
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

      {/* 3. Pilihan Divisi & Motivasi */}
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

      {/* 4. Berkas Curriculum Vitae (CV) */}
      <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E4E4E7] dark:border-zinc-800">
          <FileText className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
          <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
            Berkas Pendaftaran (CV)
          </h2>
        </div>

        {applicant.cv_file_name ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100 truncate">
                  {applicant.cv_file_name}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Dokumen PDF Kurikulum Vitae
                </p>
              </div>
            </div>

            {applicant.cv_file_url ? (
              <a
                href={applicant.cv_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#B22234] hover:bg-[#8B0000] rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Lihat / Unduh Berkas</span>
              </a>
            ) : (
              <span className="text-xs text-zinc-400 italic">URL tidak tersedia</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
            Belum ada berkas CV yang diunggah.
          </p>
        )}
      </div>

      {/* 5. Section: List Pertanyaan Interview (UI Saja) */}
      <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7] dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
              Daftar Pertanyaan Interview
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
            [UI Saja]
          </span>
        </div>

        {/* Empty State UI untuk pertanyaan interview */}
        <div className="py-8 px-4 text-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Belum Ada Pertanyaan Interview
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
              Daftar pertanyaan dan catatan penilaian wawancara calon anggota ini akan dikonfigurasi pada tahap interview.
            </p>
          </div>
          <div className="pt-1">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <span>+ Tambah Pertanyaan Wawancara</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Section: Absensi (UI Saja) */}
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
            {(["belum", "hadir", "tidak_hadir"] as const).map((statusKey) => {
              const labels = {
                belum: "Belum Terjadwal",
                hadir: "Hadir",
                tidak_hadir: "Tidak Hadir",
              };
              const isSelected = attendanceStatus === statusKey;
              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setAttendanceStatus(statusKey)}
                  className={`text-xs px-3 py-1.5 rounded-md font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? statusKey === "hadir"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : statusKey === "tidak_hadir"
                        ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                        : "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 border-zinc-800 dark:border-zinc-200 shadow-2xs"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {labels[statusKey]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Section: [Danger Zone] ACC atau Tolak (Bisa Diedit, UI Saja) */}
      <div className="border border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-rose-200 dark:border-rose-900/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              [Danger Zone] Keputusan Penerimaan
            </h2>
          </div>
          <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
            Bisa Diedit [UI Saja]
          </span>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Tentukan keputusan akhir kelulusan pendaftar ini. Anda dapat mengubah pilihan kapan saja selama tahap seleksi berlangsung.
          </p>

          {/* Opsi Kartu Keputusan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Opsi 1: ACC / Terima */}
            <button
              type="button"
              onClick={() => setDecisionStatus("accepted")}
              className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                decisionStatus === "accepted"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wide">
                  Terima (ACC)
                </span>
                <CheckCircle2
                  className={`w-4 h-4 ${
                    decisionStatus === "accepted"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-400"
                  }`}
                />
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Lolos seleksi penerimaan
              </span>
            </button>

            {/* Opsi 2: Tolak */}
            <button
              type="button"
              onClick={() => setDecisionStatus("rejected")}
              className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                decisionStatus === "rejected"
                  ? "bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-700 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wide">
                  Tolak
                </span>
                <XCircle
                  className={`w-4 h-4 ${
                    decisionStatus === "rejected"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-zinc-400"
                  }`}
                />
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Tidak memenuhi kriteria
              </span>
            </button>

            {/* Opsi 3: Pertimbangan (Pending) */}
            <button
              type="button"
              onClick={() => setDecisionStatus("pending")}
              className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                decisionStatus === "pending"
                  ? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-700 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wide">
                  Pertimbangan
                </span>
                <Clock
                  className={`w-4 h-4 ${
                    decisionStatus === "pending"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-zinc-400"
                  }`}
                />
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Dalam evaluasi berkas
              </span>
            </button>
          </div>

          {/* Baris Keterangan Status Terpilih */}
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">
              Status Keputusan Terpilih:
            </span>
            <span className="font-bold text-[#18181b] dark:text-zinc-100">
              {decisionStatus === "accepted" && "✅ Lolos (ACC Diterima)"}
              {decisionStatus === "rejected" && "❌ Ditolak (Tidak Lolos)"}
              {decisionStatus === "pending" && "⏳ Menunggu Pertimbangan (Draft)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
