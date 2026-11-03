"use client";

import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";

interface ApplicantDeleteModalProps {
  isOpen: boolean;
  applicantName?: string | null;
  applicantEmail?: string | null;
  isDeleting: boolean;
  deleteError: string | null;
  deleteSuccess: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export function ApplicantDeleteModal({
  isOpen,
  applicantName,
  applicantEmail,
  isDeleting,
  deleteError,
  deleteSuccess,
  onClose,
  onConfirmDelete,
}: ApplicantDeleteModalProps) {
  // Keyboard shortcut listener untuk menutup modal via tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting && !deleteSuccess) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, deleteSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting && !deleteSuccess) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {deleteSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Peserta Berhasil Dihapus
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Data peserta, akun login autentikasi, tabel pendaftaran, dan berkas CV telah dibersihkan secara permanen dari server. Mengalihkan ke dashboard...
            </p>
            <div className="pt-2">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400 mx-auto" />
            </div>
          </div>
        ) : (
          <>
            {/* Header Modal */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="delete-modal-title"
                  className="text-base font-bold text-zinc-900 dark:text-zinc-100"
                >
                  Hapus Peserta Secara Permanen?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data calon peserta{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {applicantName || "ini"}
                  </strong>
                  ?
                </p>
              </div>
            </div>

            {/* Warning Callout Box */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <p className="leading-relaxed">
                <strong>Peringatan Penting:</strong> Tindakan ini{" "}
                <span className="font-bold underline decoration-amber-500">
                  bersifat permanen
                </span>{" "}
                dan tidak dapat dibatalkan atau dipulihkan kembali.
              </p>
            </div>

            {/* Cakupan Penghapusan Lengkap */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider block">
                Komponen yang akan dihapus dari server:
              </span>
              <ul className="space-y-1.5 text-zinc-600 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  <span>
                    <strong>Akun Login:</strong> Akses akun login autentikasi pemohon{" "}
                    {applicantEmail ? (
                      <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                        ({applicantEmail})
                      </span>
                    ) : (
                      "(akun email pendaftar)"
                    )}
                    .
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  <span>
                    <strong>Tabel Database:</strong> Data identitas formulir, pilihan divisi, serta riwayat seleksi.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  <span>
                    <strong>Berkas CV:</strong> Dokumen CV yang tersimpan di bucket cloud storage.
                  </span>
                </li>
              </ul>
            </div>

            {/* Pesan Error jika terjadi kegagalan */}
            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span className="leading-relaxed">{deleteError}</span>
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirmDelete}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

